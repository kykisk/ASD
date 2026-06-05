import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useChildStore } from '../stores/child.store.js';
import type { Child } from '../types/api.types.js';

export function useChildren(familyId: string | null) {
  return useQuery<Child[]>({
    queryKey: ['children', familyId],
    queryFn: async () => {
      const { data } = await api.get(`/families/${familyId}/children`);
      return data.data as Child[];
    },
    enabled: !!familyId,
  });
}

interface CreateChildInput {
  name: string;
  birthDate: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  diagnosisName?: string;
  diagnosisDate?: string;
}

export function useCreateChild(familyId: string | null) {
  const fetchChildren = useChildStore((s) => s.fetchChildren);
  const selectChild = useChildStore((s) => s.selectChild);

  return useMutation({
    mutationFn: async (input: CreateChildInput) => {
      const { data } = await api.post(`/families/${familyId}/children`, input);
      return data.data as Child;
    },
    onSuccess: (created) => {
      if (familyId) {
        fetchChildren(familyId).then(() => {
          selectChild(created.id);
        });
      }
    },
  });
}
