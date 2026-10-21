import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export const DAILY_RECORD_DOMAINS = [
  { key: 'DAILY_LIVING', label: '일상생활' },
  { key: 'COMMUNICATION', label: '의사소통' },
  { key: 'COGNITIVE', label: '인지' },
  { key: 'SOCIAL', label: '사회성' },
  { key: 'MOTOR', label: '운동' },
] as const;

export type DailyRecordDomain = (typeof DAILY_RECORD_DOMAINS)[number]['key'];

export interface DailyRecordSummary {
  date: string;
  scores: Partial<Record<DailyRecordDomain, number>> | null;
  note: string | null;
  feedbacks: Array<{ id: string; feedbackType: string; sessionType: string; content: string }>;
}

export interface CreateDailyRecordInput {
  date?: string;
  scores: Partial<Record<DailyRecordDomain, number>>;
  note?: string;
  session?: { sessionType: string; therapistFeedback?: string };
  behavior?: { severity: number; tags: string[]; content: string };
}

export function useDailyRecord(childId: string | null) {
  return useQuery<DailyRecordSummary>({
    queryKey: ['daily-record', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/daily-records`);
      return data.data as DailyRecordSummary;
    },
    enabled: !!childId,
  });
}

export function useCreateDailyRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: CreateDailyRecordInput }) => {
      const { data } = await api.post(`/children/${childId}/daily-records`, input);
      return data.data as DailyRecordSummary;
    },
    onSuccess: (summary, variables) => {
      queryClient.setQueryData(['daily-record', variables.childId], summary);
      queryClient.invalidateQueries({ queryKey: ['insight', 'weekly', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['assessments', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['growth', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['session-feedbacks', variables.childId] });
    },
  });
}
