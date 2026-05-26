import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type {
  ScheduleOccurrence,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '../types/api.types.js';

function extractRealId(id: string): string {
  return id.includes('_') ? id.split('_')[0] : id;
}

export function useSchedules(childId: string | null, startDate: string, endDate: string) {
  return useQuery<ScheduleOccurrence[]>({
    queryKey: ['schedules', childId, startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get(
        `/children/${childId}/schedules?startDate=${startDate}&endDate=${endDate}`,
      );
      return data.data as ScheduleOccurrence[];
    },
    enabled: !!childId && !!startDate && !!endDate,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: CreateScheduleInput }) => {
      const { data } = await api.post(`/children/${childId}/schedules`, input);
      return data.data as ScheduleOccurrence;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.childId] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateScheduleInput }) => {
      const realId = extractRealId(id);
      const { data } = await api.patch(`/schedules/${realId}`, input);
      return data.data as ScheduleOccurrence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const realId = extractRealId(id);
      await api.delete(`/schedules/${realId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
