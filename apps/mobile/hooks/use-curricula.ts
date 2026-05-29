import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Curriculum, LogActivityInput } from '../types/api.types.js';

export function useTodayCurriculum(childId: string | null) {
  return useQuery<Curriculum | null>({
    queryKey: ['curriculum', 'today', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/curriculum/today`);
      return (data.data as Curriculum | null) ?? null;
    },
    enabled: !!childId,
  });
}

export function useConfirmCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, curriculumId }: { childId: string; curriculumId: string }) => {
      const { data } = await api.patch(`/curricula/${curriculumId}/confirm`);
      return data.data as Curriculum;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', 'today', variables.childId] });
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      curriculumId,
      activityIndex,
      input,
    }: {
      childId: string;
      curriculumId: string;
      activityIndex: number;
      input: LogActivityInput;
    }) => {
      const { data } = await api.post('/activities', input);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['curriculum', 'today', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.childId] });
    },
  });
}
