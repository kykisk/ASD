import { create } from 'zustand';
import { api } from '../lib/api.js';
import type { Child } from '../types/api.types.js';

interface ChildState {
  children: Child[];
  selectedChildId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchChildren: (familyId: string) => Promise<void>;
  selectChild: (id: string) => void;
  getSelectedChild: () => Child | null;
  reset: () => void;
}

export const useChildStore = create<ChildState>((set, get) => ({
  children: [],
  selectedChildId: null,
  isLoading: false,
  error: null,

  fetchChildren: async (familyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/families/${familyId}/children`);
      const children = data.data as Child[];
      set({ children, isLoading: false });

      if (!get().selectedChildId && children.length > 0) {
        set({ selectedChildId: children[0].id });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '아이 목록을 불러올 수 없습니다';
      set({ error: message, isLoading: false });
    }
  },

  selectChild: (id: string) => {
    set({ selectedChildId: id });
  },

  getSelectedChild: () => {
    const { children, selectedChildId } = get();
    return children.find((c) => c.id === selectedChildId) ?? null;
  },

  reset: () => {
    set({ children: [], selectedChildId: null, isLoading: false, error: null });
  },
}));
