import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Schedule } from '../types/schedule';
import {
  addDays,
  setHours,
  setMinutes,
  startOfWeek,
  format,
} from 'date-fns';

function generateMockSchedules(baseDate: Date): Schedule[] {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });

  return [
    {
      id: '1',
      childId: 'child-1',
      title: '언어 치료',
      description: '김선생님 언어치료 세션',
      category: 'THERAPY',
      startTime: setMinutes(setHours(weekStart, 10), 0).toISOString(),
      endTime: setMinutes(setHours(weekStart, 11), 30).toISOString(),
      isAllDay: false,
      recurrenceType: 'WEEKLY',
    },
    {
      id: '2',
      childId: 'child-1',
      title: '감각통합 치료',
      description: '박선생님 감각통합 세션',
      category: 'THERAPY',
      startTime: setMinutes(setHours(addDays(weekStart, 2), 14), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 2), 15), 0).toISOString(),
      isAllDay: false,
      recurrenceType: 'WEEKLY',
    },
    {
      id: '3',
      childId: 'child-1',
      title: '미술 수업',
      category: 'EDUCATION',
      startTime: setMinutes(setHours(addDays(weekStart, 1), 13), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 1), 14), 30).toISOString(),
      isAllDay: false,
      recurrenceType: 'WEEKLY',
    },
    {
      id: '4',
      childId: 'child-1',
      title: '자유놀이 시간',
      category: 'FREE_PLAY',
      startTime: setMinutes(setHours(addDays(weekStart, 3), 16), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 3), 17), 30).toISOString(),
      isAllDay: false,
      recurrenceType: 'DAILY',
    },
    {
      id: '5',
      childId: 'child-1',
      title: '점심 식사',
      category: 'MEAL',
      startTime: setMinutes(setHours(addDays(weekStart, 1), 12), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 1), 12), 40).toISOString(),
      isAllDay: false,
      recurrenceType: 'DAILY',
    },
    {
      id: '6',
      childId: 'child-1',
      title: '낮잠',
      category: 'SLEEP',
      startTime: setMinutes(setHours(addDays(weekStart, 4), 13), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 4), 14), 30).toISOString(),
      isAllDay: false,
      recurrenceType: 'DAILY',
    },
    {
      id: '7',
      childId: 'child-1',
      title: '가족 나들이',
      description: '공원 산책',
      category: 'OTHER',
      startTime: setMinutes(setHours(addDays(weekStart, 6), 10), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 6), 16), 0).toISOString(),
      isAllDay: true,
      recurrenceType: 'NONE',
    },
    {
      id: '8',
      childId: 'child-1',
      title: '음악 치료',
      category: 'THERAPY',
      startTime: setMinutes(setHours(addDays(weekStart, 5), 11), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 5), 12), 0).toISOString(),
      isAllDay: false,
      recurrenceType: 'WEEKLY',
    },
    {
      id: '9',
      childId: 'child-1',
      title: '수학 학습',
      category: 'EDUCATION',
      startTime: setMinutes(setHours(addDays(weekStart, 4), 10), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 4), 11), 0).toISOString(),
      isAllDay: false,
      recurrenceType: 'WEEKLY',
    },
    {
      id: '10',
      childId: 'child-1',
      title: '저녁 식사',
      category: 'MEAL',
      startTime: setMinutes(setHours(addDays(weekStart, 3), 18), 0).toISOString(),
      endTime: setMinutes(setHours(addDays(weekStart, 3), 18), 45).toISOString(),
      isAllDay: false,
      recurrenceType: 'DAILY',
    },
  ];
}

export function useSchedules(
  childId: string | null,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['schedules', childId, startDate, endDate],
    queryFn: async () => {
      const baseDate = new Date(startDate);
      return generateMockSchedules(baseDate);
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { ...input, id: `schedule-${Date.now()}` } as Schedule;
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      return input as unknown as Schedule;
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
