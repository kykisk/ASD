import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'SYSTEM_ADMIN';
}

function decodeJwtExp(token: string): number | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface AdminAuthState {
  accessToken: string | null;
  tokenExpiresAt: number | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AdminUser) => void;
  clearAuth: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tokenExpiresAt: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) =>
        set({
          accessToken: token,
          tokenExpiresAt: decodeJwtExp(token),
          user,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({ accessToken: null, tokenExpiresAt: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auticare-admin-auth' },
  ),
);
