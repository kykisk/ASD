import { createApiClient } from '@auticare/api-client';
import type { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { tokenStorage } from './token-storage.js';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3100/v1';

let onRefreshFailedCallback: (() => void) | null = null;

export function setOnRefreshFailed(cb: () => void) {
  onRefreshFailedCallback = cb;
}

export const api: AxiosInstance = createApiClient({
  baseURL: API_URL,
  getAccessToken: () => tokenStorage.getAccessToken(),
  getRefreshToken: () => tokenStorage.getRefreshToken(),
  onTokenRefreshed: (accessToken: string) => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      tokenStorage.saveTokens(accessToken, refreshToken);
    }
  },
  onRefreshFailed: () => {
    tokenStorage.clearTokens();
    onRefreshFailedCallback?.();
  },
  clientType: 'mobile',
});
