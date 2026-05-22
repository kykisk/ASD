import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { getAiErrorMessage } from './use-curriculum';

export type SuggestionType = 'ADD' | 'MODIFY' | 'REMOVE';

export interface ScheduleSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  reason: string;
  category?: string;
  suggestedDay?: string;
  suggestedTime?: string;
  durationMinutes?: number;
}

export interface ScheduleSuggestionsResponse {
  suggestions: ScheduleSuggestion[];
  summary: string;
}

export function useScheduleSuggestions(childId: string | null) {
  return useQuery({
    queryKey: ['schedule-ai-suggestions', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ScheduleSuggestionsResponse }>(
        `/children/${childId}/schedules/ai-suggest`,
      );
      return data.data;
    },
    enabled: false,
    throwOnError: false,
    meta: {
      onError: (err: unknown) => {
        const msg = getAiErrorMessage(err);
        if (msg) alert(msg);
      },
    },
  });
}

export function useAcceptSuggestion(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestion, targetDate }: { suggestion: ScheduleSuggestion; targetDate: string }) => {
      const { data } = await api.post<{ success: true; data: unknown }>(
        `/children/${childId}/schedules/ai-suggest/accept`,
        { suggestion, targetDate },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-ai-suggestions', childId] });
    },
  });
}
