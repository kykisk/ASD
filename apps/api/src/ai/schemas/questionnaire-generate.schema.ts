import { z } from 'zod';

export const generatedQuestionnaireSchema = z.object({
  name: z.string(),
  description: z.string(),
  items: z.array(z.object({
    domain: z.enum(['COMMUNICATION', 'SOCIAL', 'MOTOR', 'COGNITIVE', 'EMOTIONAL', 'DAILY_LIVING', 'OTHER']),
    text: z.string(),
    description: z.string().optional(),
    weight: z.number().min(0.5).max(3),
  })),
});

export type GeneratedQuestionnaire = z.infer<typeof generatedQuestionnaireSchema>;
