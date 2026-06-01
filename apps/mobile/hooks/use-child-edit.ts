import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Child } from '../types/api.types.js';

interface UpdateChildInput {
  name?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  diagnosisName?: string | null;
  diagnosisDate?: string | null;
  notes?: string | null;
  developmentalLevel?: {
    language?: string;
    cognitive?: string;
    motor?: string;
    selfCare?: string;
    social?: string;
    overall?: string;
  } | null;
  centerInfo?: Array<{
    name: string;
    type: string;
    frequency: string;
    currentGoal?: string;
  }> | null;
}

export function useUpdateChild(familyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: UpdateChildInput }) => {
      const { data } = await api.patch(`/children/${childId}`, input);
      return data.data as Child;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children', familyId] });
    },
  });
}
