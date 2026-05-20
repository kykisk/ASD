export type ActivityDomain =
  | 'COMMUNICATION'
  | 'SOCIAL'
  | 'MOTOR'
  | 'COGNITIVE'
  | 'EMOTIONAL'
  | 'DAILY_LIVING';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type CurriculumStatus =
  | 'PENDING'
  | 'GENERATED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'FAILED';

export type ActivityResult = 'SUCCESS' | 'PARTIAL' | 'SKIPPED';

export interface CurriculumActivity {
  title: string;
  domain: ActivityDomain;
  durationMin: number;
  description: string;
  materials?: string[];
  steps: string[];
  successCriteria: string;
  difficultyLevel: DifficultyLevel;
}

export interface Curriculum {
  id: string;
  childId: string;
  date: string;
  status: CurriculumStatus;
  weeklyGoal?: string;
  activities: CurriculumActivity[];
  notes?: string;
  generatedAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  curriculumId: string;
  activityIndex: number;
  result: ActivityResult;
  notes?: string;
  loggedAt: string;
}

export const DOMAIN_LABELS: Record<ActivityDomain, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
};

export const DOMAIN_COLORS: Record<ActivityDomain, string> = {
  COMMUNICATION: '#7B9FD4',
  SOCIAL: '#E8A87C',
  MOTOR: '#9B8EC4',
  COGNITIVE: '#7EC8C8',
  EMOTIONAL: '#F2B880',
  DAILY_LIVING: '#8BC4A0',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};
