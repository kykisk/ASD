import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateQuestionnaireSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  domains: z.array(z.enum(['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL', 'DAILY_LIVING', 'OTHER'])).min(1).optional(),
});

export type UpdateQuestionnaireInput = z.input<typeof updateQuestionnaireSchema>;
export type UpdateQuestionnaireOutput = z.output<typeof updateQuestionnaireSchema>;

export class UpdateQuestionnaireDto extends createZodDto(updateQuestionnaireSchema) {}
