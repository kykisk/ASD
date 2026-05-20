import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createScheduleSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['THERAPY', 'EDUCATION', 'FREE_PLAY', 'MEAL', 'SLEEP', 'OTHER']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  recurrenceType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'SPECIFIC_DAYS', 'CUSTOM']).default('NONE'),
  recurrenceRule: z.object({
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    interval: z.number().min(1).optional(),
    endDate: z.string().optional(),
  }).optional(),
  recurrenceEnd: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateScheduleInput = z.input<typeof createScheduleSchema>;
export type CreateScheduleOutput = z.output<typeof createScheduleSchema>;

export class CreateScheduleDto extends createZodDto(createScheduleSchema) {}
