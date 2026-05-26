import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
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
