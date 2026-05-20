import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Curriculum, ActivityLog, ActivityResult } from '../types/curriculum';

export function useTodayCurriculum(childId: string | null) {
  return useQuery({
    queryKey: ['curriculum', 'today', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Curriculum }>(
        `/children/${childId}/curriculum/today`,
      );
      return data.data;
    },
    enabled: !!childId,
    retry: false,
  });
}

export function useGenerateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string) => {
      const { data } = await api.post<{ success: true; data: Curriculum }>(
        `/children/${childId}/curriculum/generate`,
      );
      return data.data;
    },
    onSuccess: (result, childId) => {
      queryClient.invalidateQueries({
        queryKey: ['curriculum', 'today', childId],
      });
      queryClient.invalidateQueries({
        queryKey: ['curriculum', 'history', childId],
      });
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      curriculumId,
      activityIndex,
      result,
      notes,
    }: {
      curriculumId: string;
      activityIndex: number;
      result: ActivityResult;
      notes?: string;
    }) => {
      const { data } = await api.post<{ success: true; data: ActivityLog }>(
        `/activities`,
        { curriculumId, activityIndex, result, notes },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useConfirmCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (curriculumId: string) => {
      const { data } = await api.patch<{ success: true; data: Curriculum }>(
        `/curricula/${curriculumId}/confirm`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
    },
  });
}

export function useRegenerateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (curriculumId: string) => {
      const { data } = await api.post<{ success: true; data: Curriculum }>(
        `/curricula/${curriculumId}/regenerate`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
    },
  });
}

export function useCurriculumHistory(childId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['curriculum', 'history', childId, limit],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Curriculum[] }>(
        `/children/${childId}/curricula`,
        { params: { limit } },
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useCurriculumActivities(curriculumId: string | null) {
  return useQuery({
    queryKey: ['activityLogs', curriculumId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ActivityLog[] }>(
        `/curricula/${curriculumId}/activities`,
      );
      return data.data;
    },
    enabled: !!curriculumId,
  });
}
