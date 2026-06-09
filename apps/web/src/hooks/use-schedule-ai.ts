import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export type SuggestionType = 'ADD' | 'MODIFY' | 'REMOVE';

export interface ScheduleSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  reason: string;
  category?: string;
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
      const { data } = await api.get<{
        success: true;
        data: {
          suggestions: Array<{
            type: string;
            title: string;
            reasoning: string;
            category?: string;
            suggestedTime?: string;
            suggestedDuration?: number;
          }>;
          summary: string;
        };
      }>(`/children/${childId}/schedules/ai-suggest`, { timeout: 120000 });
      const raw = data.data;
      return {
        summary: raw.summary,
        suggestions: (raw.suggestions ?? []).map((s, idx) => ({
          id: `suggestion-${idx}`,
          type: s.type as SuggestionType,
          title: s.title,
          reason: s.reasoning ?? '',
          category: s.category,
          suggestedTime: s.suggestedTime,
          durationMinutes: s.suggestedDuration,
        })),
      } as ScheduleSuggestionsResponse;
    },
    enabled: false,
    throwOnError: false,
    retry: 0,
  });
}

export function useAcceptSuggestion(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestion,
      targetDate,
    }: {
      suggestion: ScheduleSuggestion;
      targetDate: string;
    }) => {
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
