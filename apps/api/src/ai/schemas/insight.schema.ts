import { z } from 'zod';

export const insightOutputSchema = z.object({
  summary: z.string().max(500),
  highlights: z.array(z.string()).max(3),
  concerns: z.array(z.string()).max(3),
  recommendations: z.array(z.string()).max(3),
  overallTrend: z.enum(['IMPROVING', 'STABLE', 'NEEDS_ATTENTION']),
});

export type InsightOutput = z.infer<typeof insightOutputSchema>;
