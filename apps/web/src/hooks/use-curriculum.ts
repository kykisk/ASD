import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Curriculum, ActivityLog, ActivityResult } from '../types/curriculum';

export function getAiErrorMessage(err: unknown): string | null {
  const code = (err as any)?.response?.data?.error?.code;
  const status = (err as any)?.response?.status;
  if (code === 'AI_002' || status === 503) {
    return 'AI 요금 한도에 도달했습니다. 관리자에게 문의해주세요.';
  }
  if (code === 'AI_002' || status === 429) {
    return '오늘의 AI 사용량이 소진됐어요. 내일 다시 시도해주세요.';
  }
  if (code === 'AI_001') {
    return 'AI 서비스를 사용할 수 없습니다. 관리자에게 문의해주세요.';
  }
  if (status === 503) {
    return 'AI 서비스가 일시적으로 사용 불가합니다. 관리자에게 문의해주세요.';
  }
  return null;
}

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
      activityTitle,
      result,
      notes,
    }: {
      curriculumId: string;
      activityIndex: number;
      activityTitle: string;
      result: ActivityResult;
      notes?: string;
    }) => {
      const { data } = await api.post<{ success: true; data: ActivityLog }>(
        `/activities`,
        { curriculumId, activityIndex, activityTitle, result, notes },
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

export function useDeleteCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (curriculumId: string) => {
      await api.delete(`/curricula/${curriculumId}`);
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
