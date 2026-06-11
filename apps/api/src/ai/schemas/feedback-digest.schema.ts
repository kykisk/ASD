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
  .pipe(z.array(z.string()).max(5));

const sessionTypeSummary = z.object({
  count: z.number().default(0),
  avgRating: z.number().default(0),
  keyProgress: z.string().max(200).optional().default(''),
  keyChallenges: z.string().max(200).optional().default(''),
});

export const feedbackDigestOutputSchema = z.object({
  summary: z.string().max(500).optional().default('이번 주 수업 피드백을 분석했습니다.'),
  bySessionType: z.record(sessionTypeSummary).optional().default({}),
  highlights: flexibleStringArray.optional().default([]),
  concerns: flexibleStringArray.optional().default([]),
  homeWorkSummary: z.string().max(300).optional().default(''),
  behaviorSuggestions: flexibleStringArray.optional().default([]),
});

export type FeedbackDigestOutput = z.infer<typeof feedbackDigestOutputSchema>;
