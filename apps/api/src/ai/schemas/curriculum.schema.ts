import { z } from 'zod';

export const curriculumActivitySchema = z.object({
  title: z.string().min(1).max(100),
  domain: z.enum(['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL', 'DAILY_LIVING']),
  durationMin: z.number().int().min(5).max(120),
  description: z.string().max(500),
  materials: z.array(z.string()).optional(),
  steps: z.array(z.string()).min(1).max(10),
  successCriteria: z.string().max(300),
  difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const curriculumOutputSchema = z.object({
  weeklyGoal: z.string().max(300),
  activities: z.array(curriculumActivitySchema).min(1).max(5),
  notes: z.string().max(500).optional(),
});

export type CurriculumOutput = z.infer<typeof curriculumOutputSchema>;
export type CurriculumActivity = z.infer<typeof curriculumActivitySchema>;
