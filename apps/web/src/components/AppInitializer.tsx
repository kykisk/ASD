import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { useChildStore } from '../stores/child.store';
import { api } from '../services/api';

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

async function proactiveRefresh(
  setAuth: (
    token: string,
    user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>,
  ) => void,
  clearAuth: () => void,
) {
  const { accessToken, tokenExpiresAt, user } = useAuthStore.getState();
  if (!accessToken || !user) return;

  const isNearExpiry =
    tokenExpiresAt !== null && tokenExpiresAt - Date.now() < REFRESH_THRESHOLD_MS;
  const isExpired = tokenExpiresAt !== null && tokenExpiresAt <= Date.now();

  if (!isNearExpiry && !isExpired) return;

  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL || '/v1'}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const newToken = data.data?.accessToken || data.accessToken;
    if (newToken) {
      setAuth(newToken, user);
    }
  } catch {
    clearAuth();
    window.location.href = '/login';
  }
}

export function AppInitializer() {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const { selectedChildId, setSelectedChild } = useChildStore();
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) return;
    initializedRef.current = true;

    const sync = async () => {
      try {
        const { data: meData } = await api.get('/users/me');
        const freshUser = meData.data;

        const { data: familiesData } = await api.get('/families/my');
        const families = familiesData.data as { id: string; name: string }[];
        const familyId = families[0]?.id ?? null;

        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken) {
          setAuth(currentToken, { ...freshUser, familyId });
        }

        if (familyId && !selectedChildId) {
          const { data: childrenData } = await api.get(`/families/${familyId}/children`);
          const children = childrenData.data as { id: string }[];
          if (children.length > 0) {
            setSelectedChild(children[0].id);
          }
        }

        await queryClient.invalidateQueries();
      } catch {
        clearAuth();
        queryClient.clear();
      }
    };

    sync();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const check = () => proactiveRefresh(setAuth, clearAuth);
    check();

    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, setAuth, clearAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        proactiveRefresh(setAuth, clearAuth);
        queryClient.invalidateQueries();
      }
    };

    const handleFocus = () => {
      queryClient.invalidateQueries();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, setAuth, clearAuth]);

  return null;
}
