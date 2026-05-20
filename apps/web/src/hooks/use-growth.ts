import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface DomainScore {
  domain: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface GrowthEntry {
  date: string;
  domains: DomainScore[];
  overallScore: number;
}

export interface GrowthData {
  childId: string;
  entries: GrowthEntry[];
  summary: {
    currentScores: DomainScore[];
    averageScore: number;
    trend: 'up' | 'down' | 'stable';
    totalAssessments: number;
  };
}

export function useGrowthData(
  childId: string | null | undefined,
  days = 30,
) {
  return useQuery({
    queryKey: ['growth', childId, days],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: GrowthData }>(
        `/children/${childId}/growth`,
        { params: { days } },
      );
      return data.data;
    },
    enabled: !!childId,
  });
}
