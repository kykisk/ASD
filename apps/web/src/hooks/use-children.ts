import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface DevelopmentalLevel {
  language?: string;
  cognitive?: string;
  motor?: string;
  selfCare?: string;
  social?: string;
  overall?: string;
}

export interface CenterInfoItem {
  name: string;
  type: string;
  frequency: string;
  currentGoal?: string;
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  birthDate: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  diagnosisName?: string | null;
  diagnosisDate?: string | null;
  notes?: string | null;
  developmentalLevel?: DevelopmentalLevel | null;
  centerInfo?: CenterInfoItem[] | null;
  createdAt: string;
}

interface CreateChildInput {
  name: string;
  birthDate: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  diagnosisName?: string;
  diagnosisDate?: string;
  notes?: string;
  developmentalLevel?: DevelopmentalLevel;
  centerInfo?: CenterInfoItem[];
}

interface UpdateChildInput {
  name?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  diagnosisName?: string;
  diagnosisDate?: string;
  notes?: string;
  developmentalLevel?: DevelopmentalLevel;
  centerInfo?: CenterInfoItem[];
}

export function useChildren(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ['children', familyId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Child[] }>(
        `/families/${familyId}/children`,
      );
      return data.data;
    },
    enabled: !!familyId,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      familyId,
      input,
    }: {
      familyId: string;
      input: CreateChildInput;
    }) => {
      const { data } = await api.post<{ success: true; data: Child }>(
        `/families/${familyId}/children`,
        input,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['children', variables.familyId],
      });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      input,
    }: {
      childId: string;
      input: UpdateChildInput;
    }) => {
      const { data } = await api.patch<{ success: true; data: Child }>(
        `/children/${childId}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
    },
  });
}

export function useDeleteChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string) => {
      await api.delete(`/children/${childId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
    },
  });
}
