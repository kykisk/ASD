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

// ─── 쭉 적기 (AI 정리) ───────────────────────────────────

/** 오늘 하루 기록에서 고르는 수업 종류 (화면 · AI 정리 공통) */
export const DAILY_SESSION_TYPE_KEYS = [
  'SPEECH',
  'SPECIAL_PE',
  'SENSORY',
  'ABA',
  'OCCUPATIONAL',
  'PLAY',
  'OTHER',
] as const;

export const BEHAVIOR_TAG_OPTIONS = [
  '멜트다운',
  '공격',
  '자해',
  '탈주',
  '상동행동',
  '발작',
  '기타',
] as const;

export const analyzeFreeformSchema = z.object({
  text: z.string().trim().min(5, '조금만 더 적어주세요').max(3000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type AnalyzeFreeformInput = z.infer<typeof analyzeFreeformSchema>;

export class AnalyzeFreeformDto extends createZodDto(analyzeFreeformSchema) {}

/** 빈 글 · null 은 '없음'으로 (AI 정리 초안을 그대로 보내도 되게) */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || undefined);

/** 부모가 확인(필요하면 고친) 정리 결과 + 추가 질문 답 */
export const confirmFreeformSchema = z.object({
  scores: z.object(
    Object.fromEntries(DAILY_RECORD_DOMAINS.map((d) => [d, score.optional()])) as Record<
      (typeof DAILY_RECORD_DOMAINS)[number],
      z.ZodOptional<typeof score>
    >,
  ),
  note: optionalText(1000),
  sessions: z
    .array(
      z.object({
        sessionType: z.string().trim().min(1).max(50),
        therapistFeedback: optionalText(1000),
      }),
    )
    .max(3)
    .default([]),
  behaviors: z
    .array(
      z.object({
        severity: score.nullable().optional(),
        tags: z.array(z.string().max(20)).max(10).default([]),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .max(3)
    .default([]),
  /** questions 배열의 순서(index)와 답. 건너뛴 질문은 보내지 않음 */
  answers: z
    .array(
      z.object({
        index: z.number().int().min(0).max(2),
        value: z.union([score, z.string().trim().min(1).max(500)]),
      }),
    )
    .max(3)
    .default([]),
});

export type ConfirmFreeformInput = z.infer<typeof confirmFreeformSchema>;

export class ConfirmFreeformDto extends createZodDto(confirmFreeformSchema) {}
