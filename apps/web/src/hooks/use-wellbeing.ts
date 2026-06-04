import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface WellbeingEntry {
  id: string;
  mood: number;
  stressLevel: number;
  notes?: string;
  aiMessage?: string;
  burnoutRisk?: string;
  createdAt: string;
}

export interface WellbeingStats {
  avgMood: number;
  avgStress: number;
  burnoutRisk: string;
  checkInCount: number;
}

interface CreateWellbeingInput {
  mood: number;
  stressLevel: number;
  notes?: string;
}

export function useWellbeingHistory(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['wellbeing', 'history', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: WellbeingEntry[] }>(
        `/wellbeing/children/${childId}`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useWellbeingStats(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['wellbeing', 'stats', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: WellbeingStats }>(
        `/wellbeing/children/${childId}/stats`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useCreateWellbeingCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: CreateWellbeingInput }) => {
      const { data } = await api.post<{ success: true; data: WellbeingEntry }>(
        `/wellbeing/children/${childId}`,
        input,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wellbeing', 'history', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['wellbeing', 'stats', variables.childId] });
    },
  });
}
