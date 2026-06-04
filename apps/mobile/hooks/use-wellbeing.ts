import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface WellbeingEntry {
  id: string;
  childId: string;
  mood: number;
  stressLevel: number;
  notes: string | null;
  aiMessage: string | null;
  createdAt: string;
}

export interface WellbeingStats {
  avgMood: number;
  avgStress: number;
  burnoutRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CreateWellbeingInput {
  mood: number;
  stressLevel: number;
  notes?: string;
}

export function useWellbeingHistory(childId: string | null) {
  return useQuery<WellbeingEntry[]>({
    queryKey: ['wellbeing', 'history', childId],
    queryFn: async () => {
      const { data } = await api.get(`/wellbeing/children/${childId}`);
      return data.data as WellbeingEntry[];
    },
    enabled: !!childId,
  });
}

export function useWellbeingStats(childId: string | null) {
  return useQuery<WellbeingStats>({
    queryKey: ['wellbeing', 'stats', childId],
    queryFn: async () => {
      const { data } = await api.get(`/wellbeing/children/${childId}/stats`);
      return data.data as WellbeingStats;
    },
    enabled: !!childId,
  });
}

export function useCreateWellbeing() {
  const queryClient = useQueryClient();

  return useMutation<
    WellbeingEntry & { aiMessage?: string },
    Error,
    { childId: string; input: CreateWellbeingInput }
  >({
    mutationFn: async ({ childId, input }) => {
      const { data } = await api.post(`/wellbeing/children/${childId}`, input);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wellbeing', 'history', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['wellbeing', 'stats', variables.childId] });
    },
  });
}
