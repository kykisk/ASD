import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';

export type FeedbackType = 'SESSION' | 'DAILY_LOG' | 'BEHAVIORAL_ISSUE';

export interface SessionFeedback {
  id: string;
  childId: string;
  familyId: string;
  userId: string;
  sessionDate: string;
  sessionType: string;
  feedbackType: FeedbackType;
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
  severity: number | null;
  behaviorTags: string[];
  createdAt: string;
  updatedAt: string;
  schedule?: { id: string; title: string } | null;
}

export interface FeedbackDigest {
  id: string;
  childId: string;
  familyId: string;
  weekKey: string;
  summary: string;
  bySessionType: Record<string, unknown>;
  highlights: string[];
  concerns: string[];
  behaviorSuggestions: string[];
  homeWorkSummary: string | null;
  feedbackCount: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface SessionFeedbackStats {
  total: number;
  avgRating: number;
  bySessionType: Record<string, { count: number; avgRating: number; lastDate: string }>;
  recentCount: number;
}

export interface SessionFeedbackAutocomplete {
  sessionTypes: string[];
  therapistNames: string[];
  institutions: string[];
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
  feedbackType?: 'SESSION' | 'DAILY_LOG' | 'BEHAVIORAL_ISSUE';
  severity?: number | null;
  behaviorTags?: string[];
}

export interface UpdateSessionFeedbackInput {
  id: string;
  sessionDate?: string;
  sessionType?: string;
  rating?: number;
  content?: string;
  therapistName?: string | null;
  institution?: string | null;
  durationMin?: number | null;
  scheduleId?: string | null;
  progress?: string | null;
  challenges?: string | null;
  homeWork?: string | null;
  parentNote?: string | null;
}

export function useSessionFeedbacks(
  childId: string | null,
  query?: { sessionType?: string; startDate?: string; endDate?: string },
) {
  return useQuery({
    queryKey: ['session-feedbacks', childId, query],
    queryFn: async () => {
      const { data } = await api.get<{
        success: true;
        data: { items: SessionFeedback[]; total: number; page: number; limit: number };
      }>(`/children/${childId}/session-feedbacks`, { params: query });
      return data.data.items;
    },
    enabled: !!childId,
  });
}

export function useCreateSessionFeedback(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionFeedbackInput) => {
      const { data } = await api.post<{ success: true; data: SessionFeedback }>(
        `/children/${childId}/session-feedbacks`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-feedbacks', childId] });
      queryClient.invalidateQueries({ queryKey: ['session-feedback-stats', childId] });
      queryClient.invalidateQueries({ queryKey: ['session-feedback-autocomplete', childId] });
    },
  });
}

export function useUpdateSessionFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSessionFeedbackInput) => {
      const { id, ...body } = input;
      const { data } = await api.patch<{ success: true; data: SessionFeedback }>(
        `/session-feedbacks/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['session-feedback-stats'] });
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
  return useQuery({
    queryKey: ['session-feedback-stats', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: SessionFeedbackStats }>(
        `/children/${childId}/session-feedbacks/stats`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useSessionFeedbackAutocomplete(childId: string | null) {
  return useQuery({
    queryKey: ['session-feedback-autocomplete', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: SessionFeedbackAutocomplete }>(
        `/children/${childId}/session-feedbacks/autocomplete`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useFeedbackDigests(childId: string | null, limit?: number) {
  return useQuery({
    queryKey: ['feedback-digests', childId, limit],
    queryFn: async () => {
      const params = limit ? { limit } : undefined;
      const { data } = await api.get<{ success: true; data: FeedbackDigest[] }>(
        `/children/${childId}/feedback-digests`,
        { params },
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useFeedbacksByDate(childId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['session-feedbacks', childId, 'by-date', date],
    queryFn: async () => {
      const { data } = await api.get<{
        success: true;
        data: { items: SessionFeedback[]; total: number; page: number; limit: number };
      }>(`/children/${childId}/session-feedbacks`, {
        params: { from: date, to: date, limit: 50 },
      });
      return data.data.items;
    },
    enabled: !!childId && !!date,
  });
}

export function useGenerateFeedbackDigest(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: true; data: FeedbackDigest }>(
        `/children/${childId}/feedback-digests/generate`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-digests', childId] });
    },
  });
}
