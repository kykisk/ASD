import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface TimeSeriesPoint {
  date: string;
  score: number;
  assessmentId: string;
}

export interface DomainTimeSeries {
  domain: string;
  label: string;
  color: string;
  data: TimeSeriesPoint[];
}

export interface GrowthData {
  childId: string;
  dateRange: { from: string; to: string };
  domains: DomainTimeSeries[];
  overall: TimeSeriesPoint[];
  weeklyAverages: { week: string; score: number }[];
  monthlyAverages: { month: string; score: number }[];
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
