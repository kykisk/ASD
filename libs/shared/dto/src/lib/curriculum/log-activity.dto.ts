import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const logActivitySchema = z.object({
  curriculumId: z.string().cuid(),
  activityIndex: z.number().int().min(0),
  activityTitle: z.string().min(1).max(100),
  result: z.enum(['SUCCESS', 'PARTIAL', 'SKIPPED', 'FAILED']),
  durationMin: z.number().int().min(1).max(240).optional(),
  notes: z.string().max(1000).optional(),
});

export type LogActivityInput = z.infer<typeof logActivitySchema>;

export class LogActivityDto extends createZodDto(logActivitySchema) {}
