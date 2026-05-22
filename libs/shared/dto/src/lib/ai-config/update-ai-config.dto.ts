import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateAiConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  apiKey: z.string().max(500).optional(),
  region: z.string().max(100).optional(),
  accessKeyId: z.string().max(200).optional(),
  secretKey: z.string().max(200).optional(),
  modelId: z.string().max(200).optional(),
  maxTokens: z.number().int().min(100).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  dailyBudgetLimit: z.number().int().min(1).max(10000).optional(),
});

export type UpdateAiConfigInput = z.input<typeof updateAiConfigSchema>;
export type UpdateAiConfigOutput = z.output<typeof updateAiConfigSchema>;

export class UpdateAiConfigDto extends createZodDto(updateAiConfigSchema) {}
