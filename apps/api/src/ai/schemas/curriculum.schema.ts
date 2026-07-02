import { z } from 'zod';

// AI 출력이 상한을 넘겨도 예외 대신 잘라내 커리큘럼 생성 전체 실패를 막는다 (하드 max() 금지)
const cappedString = (max: number) =>
  z.string().transform((s) => (s.length > max ? s.slice(0, max) : s));

export const curriculumActivitySchema = z.object({
  title: z
    .string()
    .min(1)
    .transform((s) => (s.length > 100 ? s.slice(0, 100) : s)),
  domain: z.enum(['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL', 'DAILY_LIVING']),
  durationMin: z.number().int().min(5).max(120),
  description: cappedString(500),
  materials: z.array(z.string()).optional(),
  steps: z.array(z.string()).min(1).max(10),
  successCriteria: cappedString(300),
  difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const curriculumOutputSchema = z.object({
  weeklyGoal: cappedString(300),
  activities: z.array(curriculumActivitySchema).min(1).max(5),
  notes: cappedString(500).optional(),
});

export type CurriculumOutput = z.infer<typeof curriculumOutputSchema>;
export type CurriculumActivity = z.infer<typeof curriculumActivitySchema>;
