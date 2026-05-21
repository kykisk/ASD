import { z } from 'zod';

export const filterResultSchema = z.object({
  overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  items: z.array(z.object({
    originalIndex: z.number(),
    originalText: z.string(),
    riskLevel: z.enum(['SAFE', 'CAUTION', 'HIGH_RISK']),
    reason: z.string().optional(),
    suggestedRevision: z.string().optional(),
  })),
  summary: z.string(),
});

export type FilterResult = z.infer<typeof filterResultSchema>;
