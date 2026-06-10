import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface SessionFeedback {
  id: string;
  childId: string;
  sessionDate: string;
  sessionType: string;
  therapistName: string | null;
  institution: string | null;
  durationMin: number | null;
  scheduleId: string | null;
  rating: number;
  content: string;
  progress: string | null;
  challenges: string | null;
  homeWork: string | null;
  parentNote: string | null;
  createdAt: string;
}

export interface CreateSessionFeedbackInput {
  sessionDate: string;
  sessionType: string;
  rating: number;
  content: string;
  therapistName?: string | null;
  institution?: string | null;
  durationMin?: number | null;
  scheduleId?: string | null;
  progress?: string | null;
  challenges?: string | null;
  homeWork?: string | null;
  parentNote?: string | null;
}

export interface SessionFeedbackStats {
  totalCount: number;
  avgRating: number;
  bySessionType: Record<string, { count: number; avgRating: number }>;
}

export interface FeedbackDigest {
  id: string;
  weekKey: string;
  summary: string;
  bySessionType: Record<
    string,
    { count: number; avgRating: number; keyProgress: string; keyChallenges: string }
  >;
  highlights: string[];
  concerns: string[];
  homeWorkSummary: string | null;
  feedbackCount: number;
  periodStart: string;
  periodEnd: string;
}

export function useSessionFeedbacks(
  childId: string | null,
  query?: { sessionType?: string; limit?: number; offset?: number },
) {
  return useQuery<SessionFeedback[]>({
    queryKey: ['session-feedbacks', childId, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.sessionType) params.set('sessionType', query.sessionType);
      if (query?.limit) params.set('limit', String(query.limit));
      if (query?.offset) params.set('offset', String(query.offset));
      const qs = params.toString();
      const url = `/children/${childId}/session-feedbacks${qs ? `?${qs}` : ''}`;
      const { data } = await api.get(url);
      return data.data as SessionFeedback[];
    },
    enabled: !!childId,
  });
}

export function useCreateSessionFeedback(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionFeedbackInput) => {
      const { data } = await api.post(`/children/${childId}/session-feedbacks`, input);
      return data.data as SessionFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-feedbacks', childId] });
      queryClient.invalidateQueries({ queryKey: ['session-feedback-stats', childId] });
    },
  });
}

export function useDeleteSessionFeedback(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackId: string) => {
      await api.delete(`/session-feedbacks/${feedbackId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-feedbacks', childId] });
      queryClient.invalidateQueries({ queryKey: ['session-feedback-stats', childId] });
    },
  });
}

export function useSessionFeedbackStats(childId: string | null) {
  return useQuery<SessionFeedbackStats>({
    queryKey: ['session-feedback-stats', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/session-feedbacks/stats`);
      return data.data as SessionFeedbackStats;
    },
    enabled: !!childId,
  });
}

export function useFeedbackDigests(childId: string | null) {
  return useQuery<FeedbackDigest[]>({
    queryKey: ['feedback-digests', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/feedback-digests`);
      return data.data as FeedbackDigest[];
    },
    enabled: !!childId,
  });
}

export function useGenerateFeedbackDigest(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/children/${childId}/feedback-digests/generate`);
      return data.data as FeedbackDigest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-digests', childId] });
    },
  });
}
