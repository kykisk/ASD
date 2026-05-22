import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { aiProviderEnum } from './upsert-ai-config.dto.js';

export const createAiConfigSchema = z.object({
  name: z.string().min(1).max(100),
  provider: aiProviderEnum,
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  apiKey: z.string().max(500).optional(),
  region: z.string().max(100).optional(),
  accessKeyId: z.string().max(200).optional(),
  secretKey: z.string().max(200).optional(),
  modelId: z.string().max(200).optional(),
  maxTokens: z.number().int().min(100).max(32000).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  dailyBudgetLimit: z.number().int().min(1).max(10000).default(100),
});

export type CreateAiConfigInput = z.input<typeof createAiConfigSchema>;
export type CreateAiConfigOutput = z.output<typeof createAiConfigSchema>;

export class CreateAiConfigDto extends createZodDto(createAiConfigSchema) {}
