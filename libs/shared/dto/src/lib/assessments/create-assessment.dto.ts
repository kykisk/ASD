import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createAssessmentSchema = z.object({
  questionnaireId: z.string().cuid(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).default('DAILY'),
  notes: z.string().max(1000).optional(),
  scores: z.array(z.object({
    itemId: z.string().cuid(),
    domain: z.string(),
    score: z.number().int().min(1).max(5),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export type CreateAssessmentInput = z.input<typeof createAssessmentSchema>;
export type CreateAssessmentOutput = z.output<typeof createAssessmentSchema>;

export class CreateAssessmentDto extends createZodDto(createAssessmentSchema) {}
