import { createApiClient } from '@auticare/api-client';
import { useAdminAuthStore } from '../stores/auth.store';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export const adminApi = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => useAdminAuthStore.getState().accessToken,
  getRefreshToken: () => null,
  onTokenRefreshed: (token) => {
    useAdminAuthStore.getState().setAuth(token, useAdminAuthStore.getState().user!);
  },
  onRefreshFailed: () => {
    useAdminAuthStore.getState().clearAuth();
    window.location.href = '/login';
  },
  clientType: 'web',
});
