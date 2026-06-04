import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface SensoryProfile {
  id: string;
  childId: string;
  visual: number;
  auditory: number;
  tactile: number;
  vestibular: number;
  proprioception: number;
  olfactory: number;
  notes: string | null;
  aiRecommendations: string | null;
  createdAt: string;
}

export interface CreateSensoryProfileInput {
  visual: number;
  auditory: number;
  tactile: number;
  vestibular: number;
  proprioception: number;
  olfactory: number;
  notes?: string;
}

export function useLatestSensoryProfile(childId: string | null) {
  return useQuery<SensoryProfile | null>({
    queryKey: ['sensory', 'latest', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/sensory-profiles/latest`);
      return data.data as SensoryProfile | null;
    },
    enabled: !!childId,
  });
}

export function useCreateSensoryProfile() {
  const queryClient = useQueryClient();

  return useMutation<SensoryProfile, Error, { childId: string; input: CreateSensoryProfileInput }>({
    mutationFn: async ({ childId, input }) => {
      const { data } = await api.post(`/children/${childId}/sensory-profiles`, input);
      return data.data as SensoryProfile;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sensory', 'latest', variables.childId] });
    },
  });
}
