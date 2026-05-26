import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { GrowthData } from '../types/api.types.js';

export function useGrowth(childId: string | null, days: number = 30) {
  return useQuery<GrowthData>({
    queryKey: ['growth', childId, days],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/growth?days=${days}`);
      return data.data as GrowthData;
    },
    enabled: !!childId,
  });
}
