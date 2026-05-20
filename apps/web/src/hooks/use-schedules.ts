import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Schedule } from '../types/schedule';
import { format } from 'date-fns';
import { api } from '../services/api';

export function useSchedules(
  childId: string | null,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['schedules', childId, startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Schedule[] }>(
        `/children/${childId}/schedules`,
        { params: { startDate, endDate } }
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useSchedulesByDate(
  schedules: Schedule[] | undefined,
  dateStr: string
) {
  if (!schedules) return [];
  const targetDate = format(new Date(dateStr), 'yyyy-MM-dd');
  return schedules.filter((s) => {
    const eventDate = format(new Date(s.startTime), 'yyyy-MM-dd');
    return eventDate === targetDate;
  });
}

export type CreateScheduleInput = Omit<Schedule, 'id'> & {
  id?: string;
  location?: string;
  notes?: string;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
};

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      const { childId, ...rest } = input;
      const { data } = await api.post<{ success: true; data: Schedule }>(
        `/children/${childId}/schedules`,
        rest
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduleInput & { id: string }) => {
      const { id, childId, ...rest } = input;
      const { data } = await api.patch<{ success: true; data: Schedule }>(
        `/schedules/${id}`,
        rest
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/schedules/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
