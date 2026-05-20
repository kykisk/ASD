import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChildState {
  selectedChildId: string | null;
  setSelectedChild: (id: string) => void;
  clearSelectedChild: () => void;
}

export const useChildStore = create<ChildState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      setSelectedChild: (id) => set({ selectedChildId: id }),
      clearSelectedChild: () => set({ selectedChildId: null }),
    }),
    { name: 'auticare-child' },
  ),
);
