import { z } from 'zod';

const flexibleStringArray = z
  .union([
    z.array(z.string()),
    z
      .array(z.record(z.unknown()))
      .transform((arr) =>
        arr
          .map((obj) => (Object.values(obj).find((v) => typeof v === 'string') as string) ?? '')
          .filter(Boolean),
      ),
  ])
  .pipe(z.array(z.string()).max(3));

export const insightOutputSchema = z.object({
  summary: z.string().max(500).optional().default('이번 주 발달 데이터를 분석했습니다.'),
  highlights: flexibleStringArray.optional().default([]),
  concerns: flexibleStringArray.optional().default([]),
  recommendations: flexibleStringArray.optional().default([]),
  overallTrend: z
    .string()
    .optional()
    .default('STABLE')
    .transform((val) => {
      const normalized = (val ?? '').toUpperCase().replace(/[\s-]+/g, '_');
      if (normalized.includes('IMPROV')) return 'IMPROVING' as const;
      if (normalized.includes('NEED') || normalized.includes('ATTENTION'))
        return 'NEEDS_ATTENTION' as const;
      return 'STABLE' as const;
    }),
});

export type InsightOutput = z.infer<typeof insightOutputSchema>;
