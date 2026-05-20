import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createQuestionnaireSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  domains: z.array(z.enum(['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL', 'DAILY_LIVING', 'OTHER'])).min(1),
  items: z.array(z.object({
    domain: z.string(),
    text: z.string().min(1).max(500),
    description: z.string().max(500).optional(),
    orderIndex: z.number().int().min(0),
    weight: z.number().min(0.1).max(5.0).default(1.0),
  })).min(1, '최소 1개 이상의 문항이 필요합니다'),
});

export type CreateQuestionnaireInput = z.input<typeof createQuestionnaireSchema>;
export type CreateQuestionnaireOutput = z.output<typeof createQuestionnaireSchema>;

export class CreateQuestionnaireDto extends createZodDto(createQuestionnaireSchema) {}
