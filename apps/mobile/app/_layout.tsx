import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '../lib/query-client.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useChildStore } from '../stores/child.store.js';
import { setOnRefreshFailed } from '../lib/api.js';
import { useAppStateRefetch } from '../hooks/use-app-state-refetch.js';
import { useOnlineManager } from '../hooks/use-online-manager.js';
import { usePushNotifications } from '../hooks/use-push-notifications.js';
import { OfflineBanner } from '../components/OfflineBanner.js';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const fetchChildren = useChildStore((s) => s.fetchChildren);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    if (isAuthenticated && user?.familyId) {
      fetchChildren(user.familyId);
    }
  }, [isAuthenticated, user?.familyId]);

  if (isLoading) return null;

  return <>{children}</>;
}

function PushNotificationSetup() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const logout = useAuthStore((s) => s.logout);

  useAppStateRefetch();
  useOnlineManager();

  useEffect(() => {
    const boot = async () => {
      try {
        await initialize();
        setOnRefreshFailed(() => {
          logout();
        });
      } finally {
        SplashScreen.hideAsync();
      }
    };
    boot();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <PushNotificationSetup />
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="child-profile"
            options={{ headerShown: true, title: '아이 프로필', presentation: 'card' }}
          />
          <Stack.Screen
            name="family"
            options={{ headerShown: true, title: '가족 설정', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings"
            options={{ headerShown: true, title: '설정', presentation: 'card' }}
          />
          <Stack.Screen
            name="reports"
            options={{ headerShown: true, title: '보고서', presentation: 'card' }}
          />
        </Stack>
      </AuthGate>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
