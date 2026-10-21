import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '../lib/query-client.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useChildStore } from '../stores/child.store.js';
import { setOnRefreshFailed, api } from '../lib/api.js';
import { useAppStateRefetch } from '../hooks/use-app-state-refetch.js';
import { useOnlineManager } from '../hooks/use-online-manager.js';
import { usePushNotifications } from '../hooks/use-push-notifications.js';
import { OfflineBanner } from '../components/OfflineBanner.js';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

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
    if (!isAuthenticated) return;

    if (user?.familyId) {
      fetchChildren(user.familyId);
    } else {
      api
        .get('/families/my')
        .then(({ data }) => {
          const families = data.data as Array<{ id: string }>;
          if (families.length > 0) {
            fetchChildren(families[0].id);
          }
        })
        .catch(() => {});
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
        if (Platform.OS !== 'web') {
          SplashScreen.hideAsync();
        }
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
            options={{ headerShown: true, title: '가족 초대 · 관리', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings"
            options={{ headerShown: true, title: '설정', presentation: 'card' }}
          />
          <Stack.Screen
            name="reports"
            options={{ headerShown: true, title: '월간 보고서', presentation: 'card' }}
          />
          <Stack.Screen
            name="wellbeing"
            options={{ headerShown: true, title: '마음 체크인', presentation: 'card' }}
          />
          <Stack.Screen
            name="emergency-guide"
            options={{ headerShown: true, title: '힘든 순간 가이드', presentation: 'card' }}
          />
          <Stack.Screen
            name="sensory-profile"
            options={{ headerShown: true, title: '감각 특성', presentation: 'card' }}
          />
          <Stack.Screen
            name="research"
            options={{ headerShown: true, title: '논문', presentation: 'card' }}
          />
          <Stack.Screen
            name="clinical"
            options={{ headerShown: true, title: '임상 평가', presentation: 'card' }}
          />
          <Stack.Screen
            name="medication"
            options={{ headerShown: true, title: '복약 기록', presentation: 'card' }}
          />
          <Stack.Screen
            name="activity"
            options={{ headerShown: true, title: '오늘의 활동', presentation: 'card' }}
          />
          <Stack.Screen
            name="daily-record"
            options={{ headerShown: true, title: '오늘 하루 기록', presentation: 'card' }}
          />
          <Stack.Screen
            name="guide"
            options={{ headerShown: true, title: '사용 가이드', presentation: 'card' }}
          />
          <Stack.Screen
            name="dashboard"
            options={{ headerShown: true, title: '자세한 대시보드', presentation: 'card' }}
          />
          <Stack.Screen
            name="session-feedback"
            options={{ headerShown: true, title: '일일피드백', presentation: 'card' }}
          />
        </Stack>
      </AuthGate>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
