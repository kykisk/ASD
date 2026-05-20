import { createApiClient } from '@auticare/api-client';
import { useAuthStore } from '../stores/auth.store';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export const api = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => null,
  onTokenRefreshed: (token) => {
    useAuthStore.getState().setAuth(token, useAuthStore.getState().user!);
  },
  onRefreshFailed: () => {
    useAuthStore.getState().clearAuth();
    window.location.href = '/login';
  },
  clientType: 'web',
});
