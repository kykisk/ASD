import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { DashboardData } from '../types/api.types.js';

export function useDashboard(childId: string | null) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/dashboard`);
      return data.data as DashboardData;
    },
    enabled: !!childId,
  });
}
