import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface SensoryProfile {
  id: string;
  visual: number;
  auditory: number;
  tactile: number;
  vestibular: number;
  proprioception: number;
  olfactory: number;
  notes?: string;
  aiRecommendations?: string;
  createdAt: string;
}

interface CreateSensoryProfileInput {
  visual: number;
  auditory: number;
  tactile: number;
  vestibular: number;
  proprioception: number;
  olfactory: number;
  notes?: string;
}

export function useSensoryProfiles(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['sensory', 'profiles', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: SensoryProfile[] }>(
        `/children/${childId}/sensory-profiles`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useLatestSensoryProfile(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['sensory', 'latest', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: SensoryProfile | null }>(
        `/children/${childId}/sensory-profiles/latest`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useSensoryTrends(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['sensory', 'trends', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: SensoryProfile[] }>(
        `/children/${childId}/sensory-profiles/trends`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useCreateSensoryProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      input,
    }: {
      childId: string;
      input: CreateSensoryProfileInput;
    }) => {
      const { data } = await api.post<{ success: true; data: SensoryProfile }>(
        `/children/${childId}/sensory-profiles`,
        input,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sensory', 'profiles', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['sensory', 'latest', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['sensory', 'trends', variables.childId] });
    },
  });
}
