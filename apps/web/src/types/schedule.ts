export interface Schedule {
  id: string;
  childId: string;
  title: string;
  description?: string;
  category: 'THERAPY' | 'EDUCATION' | 'FREE_PLAY' | 'MEAL' | 'SLEEP' | 'OTHER';
  startTime: string; // ISO
  endTime: string; // ISO
  isAllDay: boolean;
  recurrenceType:
    | 'NONE'
    | 'DAILY'
    | 'WEEKLY'
    | 'SPECIFIC_DAYS'
    | 'CUSTOM';
  color?: string;
}

export type ScheduleCategory = Schedule['category'];

export const CATEGORY_COLORS: Record<
  ScheduleCategory,
  { bg: string; text: string; border: string }
> = {
  THERAPY: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  EDUCATION: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
  },
  FREE_PLAY: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  MEAL: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
  },
  SLEEP: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
  },
  OTHER: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    border: 'border-neutral-300',
  },
};

export const CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  THERAPY: '치료',
  EDUCATION: '교육',
  FREE_PLAY: '자유놀이',
  MEAL: '식사',
  SLEEP: '수면',
  OTHER: '기타',
};

export type CalendarViewMode = 'day' | 'week' | 'month';
