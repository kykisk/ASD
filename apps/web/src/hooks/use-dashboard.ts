import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface TodaySchedule {
  id: string;
  time: string;
  title: string;
  category: string;
  completed: boolean;
}

export interface DomainScore {
  domain: string;
  score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface DashboardAlert {
  type: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface DashboardData {
  child: {
    id: string;
    name: string;
    ageMonths: number;
    therapyDays: number;
  };
  today: {
    schedules: TodaySchedule[];
    completedCount: number;
    totalCount: number;
  };
  recentAssessment: {
    date: string;
    overallScore: number;
    domainScores: DomainScore[];
  } | null;
  weeklyProgress: {
    completionRate: number;
    assessmentCount: number;
    streak: number;
  };
  alerts: DashboardAlert[];
}

export function useDashboard(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['dashboard', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: DashboardData }>(
        `/children/${childId}/dashboard`,
      );
      return data.data;
    },
    enabled: !!childId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
