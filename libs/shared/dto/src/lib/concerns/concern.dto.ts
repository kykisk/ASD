import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/** 관점 (맞는 방법 찾기 · 활동 근거 공통) */
export const CONCERN_APPROACHES = [
  'BEHAVIORAL',
  'DEVELOPMENTAL',
  'SENSORY',
  'NEURODIVERSITY',
  'CENTER',
  'OTHER',
] as const;

/** 힘든 행동 바로 전 상황 (언제 · 왜 기록) */
export const ANTECEDENT_OPTIONS = [
  '기다릴 때',
  '하던 걸 멈출 때',
  '심심할 때',
  '시끄럽거나 복잡할 때',
  '원하는 걸 못 가질 때',
  '해야 할 걸 줬을 때',
  '피곤하거나 졸릴 때',
  '잘 모르겠어요',
] as const;

/** 그때 부모 반응 */
export const RESPONSE_OPTIONS = [
  '말렸어요',
  '다른 걸로 돌렸어요',
  '같이 따라 했어요',
  '그냥 뒀어요',
  '원하는 걸 줬어요',
  '안아주며 진정시켰어요',
] as const;

/** 진정까지 걸린 시간 */
export const SETTLED_OPTIONS = ['QUICK', 'SOME', 'LONG'] as const;

export const createConcernSchema = z.object({
  title: z.string().trim().min(1, '고민을 적어주세요').max(60),
  /** 같이 볼 힘든 행동 태그 (예: 상동행동) */
  matchTags: z.array(z.string().max(20)).max(5).default([]),
});
export type CreateConcernInput = z.infer<typeof createConcernSchema>;
export class CreateConcernDto extends createZodDto(createConcernSchema) {}

export const updateConcernSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  status: z.enum(['ACTIVE', 'RESOLVED']).optional(),
  matchTags: z.array(z.string().max(20)).max(5).optional(),
});
export type UpdateConcernInput = z.infer<typeof updateConcernSchema>;
export class UpdateConcernDto extends createZodDto(updateConcernSchema) {}

export const startTrialSchema = z.object({
  title: z.string().trim().min(1).max(100),
  how: z.string().trim().min(1).max(1000),
  approach: z.enum(CONCERN_APPROACHES),
});
export type StartTrialInput = z.infer<typeof startTrialSchema>;
export class StartTrialDto extends createZodDto(startTrialSchema) {}

export const updateTrialSchema = z.object({
  status: z.enum(['DONE', 'STOPPED']),
  rating: z.enum(['GOOD', 'SO_SO', 'NOT_GOOD']).optional(),
  note: z.string().trim().max(500).optional(),
});
export type UpdateTrialInput = z.infer<typeof updateTrialSchema>;
export class UpdateTrialDto extends createZodDto(updateTrialSchema) {}

export const teacherOpinionSchema = z.object({
  /** 어느 수업 선생님 (SPEECH, SENSORY …) */
  sessionType: z.string().trim().min(1).max(50),
  content: z.string().trim().min(1, '의견을 적어주세요').max(1000),
});
export type TeacherOpinionInput = z.infer<typeof teacherOpinionSchema>;
export class TeacherOpinionDto extends createZodDto(teacherOpinionSchema) {}
