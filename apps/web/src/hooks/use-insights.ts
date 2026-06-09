import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface InsightRecord {
  childId: string;
  weekKey: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  overallTrend: 'IMPROVING' | 'STABLE' | 'NEEDS_ATTENTION';
  generatedAt: string;
}

export function useWeeklyInsight(childId: string | null) {
  return useQuery({
    queryKey: ['insights', 'weekly', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: InsightRecord }>(
        `/children/${childId}/insights/weekly`,
      );
      return data.data ?? null;
    },
    enabled: !!childId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useInsightHistory(childId: string | null, weeks = 4) {
  return useQuery({
    queryKey: ['insights', 'history', childId, weeks],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: InsightRecord[] }>(
        `/children/${childId}/insights/history`,
        { params: { weeks } },
      );
      return data.data;
    },
    enabled: !!childId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
