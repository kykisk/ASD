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

export interface WeeklyInsight {
  summary: string;
  highlights: string[];
  recommendations: string[];
  overallTrend: 'IMPROVING' | 'STABLE' | 'NEEDS_ATTENTION';
  generatedAt: string;
}

/** 이번 주 AI 인사이트 (서버에서 하루 캐시). 실패하면 카드만 숨김 */
export function useWeeklyInsight(childId: string | null) {
  return useQuery<WeeklyInsight | null>({
    queryKey: ['insight', 'weekly', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/insights/weekly`);
      return (data.data as WeeklyInsight | null) ?? null;
    },
    enabled: !!childId,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });
}
