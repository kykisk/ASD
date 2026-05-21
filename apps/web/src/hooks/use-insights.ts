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
      return data.data;
    },
    enabled: !!childId,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });
}
