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

// AI 출력이 상한을 넘겨도 예외 대신 잘라내 다이제스트 생성 전체 실패를 막는다 (하드 max() 금지)
const cappedString = (max: number) =>
  z.string().transform((s) => (s.length > max ? s.slice(0, max) : s));

const sessionTypeSummary = z.object({
  count: z.number().default(0),
  avgRating: z.number().default(0),
  keyProgress: cappedString(200).optional().default(''),
  keyChallenges: cappedString(200).optional().default(''),
});

export const feedbackDigestOutputSchema = z.object({
  summary: cappedString(500).optional().default('이번 주 수업 피드백을 분석했습니다.'),
  bySessionType: z.record(sessionTypeSummary).optional().default({}),
  highlights: flexibleStringArray.optional().default([]),
  concerns: flexibleStringArray.optional().default([]),
  homeWorkSummary: cappedString(300).optional().default(''),
  behaviorSuggestions: flexibleStringArray.optional().default([]),
});

export type FeedbackDigestOutput = z.infer<typeof feedbackDigestOutputSchema>;
