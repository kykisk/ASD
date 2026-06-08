import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  familyId: string | null;
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

interface AuthState {
  accessToken: string | null;
  tokenExpiresAt: number | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
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
    { name: 'auticare-auth' },
  ),
);
