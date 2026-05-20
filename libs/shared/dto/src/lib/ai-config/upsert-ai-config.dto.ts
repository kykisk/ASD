import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const aiProviderEnum = z.enum([
  'CLAUDE_BEDROCK',
  'CLAUDE_DIRECT',
  'GEMINI',
  'OPENAI',
]);

export const upsertAiConfigSchema = z.object({
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

export type UpsertAiConfigInput = z.input<typeof upsertAiConfigSchema>;
export type UpsertAiConfigOutput = z.output<typeof upsertAiConfigSchema>;

export class UpsertAiConfigDto extends createZodDto(upsertAiConfigSchema) {}
