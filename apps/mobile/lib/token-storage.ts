import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auticare_access_token';
const REFRESH_TOKEN_KEY = 'auticare_refresh_token';

export const tokenStorage = {
  getAccessToken(): string | null {
    if (Platform.OS === 'web') {
      return null;
    }
    return SecureStore.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (Platform.OS === 'web') {
      return null;
    }
    return SecureStore.getItem(REFRESH_TOKEN_KEY);
  },

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};
