import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const DAILY_RECORD_DOMAINS = [
  'DAILY_LIVING',
  'COMMUNICATION',
  'COGNITIVE',
  'SOCIAL',
  'MOTOR',
] as const;

const score = z.number().int().min(1).max(5);

export const createDailyRecordSchema = z
  .object({
    /** YYYY-MM-DD (KST). 없으면 오늘 */
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    scores: z.object(
      Object.fromEntries(DAILY_RECORD_DOMAINS.map((d) => [d, score.optional()])) as Record<
        (typeof DAILY_RECORD_DOMAINS)[number],
        z.ZodOptional<typeof score>
      >,
    ),
    note: z.string().trim().max(1000).optional(),
    session: z
      .object({
        sessionType: z.string().trim().min(1).max(50),
        therapistFeedback: z.string().trim().max(1000).optional(),
      })
      .optional(),
    behavior: z
      .object({
        severity: score,
        tags: z.array(z.string().max(20)).max(10).default([]),
        content: z.string().trim().min(1).max(1000),
      })
      .optional(),
  })
  .refine(
    (v) =>
      Object.values(v.scores).some((s) => s !== undefined) ||
      !!v.note ||
      !!v.session ||
      !!v.behavior,
    { message: '기록할 내용이 없습니다' },
  );

export type CreateDailyRecordInput = z.infer<typeof createDailyRecordSchema>;

export class CreateDailyRecordDto extends createZodDto(createDailyRecordSchema) {}
