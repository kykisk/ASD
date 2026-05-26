import { create } from 'zustand';
import { tokenStorage } from '../lib/token-storage.js';
import { api } from '../lib/api.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  familyId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const { data } = await api.get('/users/me');
      set({
        user: data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await tokenStorage.clearTokens();
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = data.data;
    await tokenStorage.saveTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true });
  },

  register: async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    const { accessToken, refreshToken, user } = data.data;
    await tokenStorage.saveTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await tokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: AuthUser | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
