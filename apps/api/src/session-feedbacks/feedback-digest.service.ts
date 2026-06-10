import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { feedbackDigestOutputSchema } from '../ai/schemas/feedback-digest.schema.js';
import { ApiException } from '../common/exceptions/api.exception.js';

@Injectable()
export class FeedbackDigestService {
  private readonly logger = new Logger(FeedbackDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async findByChild(childId: string, limit = 8) {
    return this.prisma.feedbackDigest.findMany({
      where: { childId },
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }

  async generateForChild(childId: string): Promise<{
    digest: Awaited<ReturnType<typeof this.prisma.feedbackDigest.upsert>>;
    isNew: boolean;
  }> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, familyId: true },
    });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');

    const weekKey = this.getCurrentWeekKey();
    const { start: periodStart, end: periodEnd } = this.getWeekRange(new Date());

    // 이미 이번 주 digest가 있으면 반환
    const existing = await this.prisma.feedbackDigest.findUnique({
      where: { childId_weekKey: { childId, weekKey } },
    });
    if (existing) return { digest: existing as never, isNew: false };

    // 이번 주 피드백 조회
    const feedbacks = await this.prisma.sessionFeedback.findMany({
      where: {
        childId,
        sessionDate: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { sessionDate: 'asc' },
      take: 20,
    });

    if (feedbacks.length < 3) {
      throw new ApiException(
        400,
        'FEEDBACK_DIGEST_001',
        `AI 요약을 생성하려면 이번 주 피드백이 최소 3건 필요합니다 (현재: ${feedbacks.length}건)`,
      );
    }

    // sessionType별 그룹핑 + 텍스트 압축
    const grouped: Record<
      string,
      {
        count: number;
        totalRating: number;
        progress: string[];
        challenges: string[];
        homeWork: string[];
        content: string[];
      }
    > = {};

    for (const f of feedbacks) {
      const key = f.sessionType;
      if (!grouped[key]) {
        grouped[key] = {
          count: 0,
          totalRating: 0,
          progress: [],
          challenges: [],
          homeWork: [],
          content: [],
        };
      }
      grouped[key].count++;
      grouped[key].totalRating += f.rating;
      if (f.progress) grouped[key].progress.push(f.progress.slice(0, 100));
      if (f.challenges) grouped[key].challenges.push(f.challenges.slice(0, 100));
      if (f.homeWork) grouped[key].homeWork.push(f.homeWork.slice(0, 80));
      if (f.content) grouped[key].content.push(f.content.slice(0, 150));
    }

    // 프롬프트 텍스트 조립
    const sessionLines = Object.entries(grouped)
      .map(([type, data]) => {
        const avg = (data.totalRating / data.count).toFixed(1);
        const progressStr = data.progress.length
          ? `진전: ${data.progress.slice(0, 2).join(' / ')}`
          : '';
        const challengeStr = data.challenges.length
          ? `어려움: ${data.challenges.slice(0, 2).join(' / ')}`
          : '';
        const contentStr = data.content.length
          ? `피드백: ${data.content.slice(0, 2).join(' / ')}`
          : '';
        return [
          `[${type}] ${data.count}회 수업, 평균 ${avg}/5`,
          progressStr,
          challengeStr,
          contentStr,
        ]
          .filter(Boolean)
          .join('\n  ');
      })
      .join('\n');

    const homeWorkAll = Object.values(grouped)
      .flatMap((d) => d.homeWork)
      .slice(0, 4)
      .join(', ');

    const userPrompt = `이번 주(${periodStart.toLocaleDateString('ko-KR')} ~ ${periodEnd.toLocaleDateString('ko-KR')}) 수업 피드백 요약:

${sessionLines}
${homeWorkAll ? `\n가정 연습 과제: ${homeWorkAll}` : ''}

다음 JSON 형식으로만 응답하세요 (코드 블록 없이):
{"summary":"전체 주간 요약 한두 문장","bySessionType":{"수업종류":{"count":횟수,"avgRating":평균점수,"keyProgress":"핵심진전","keyChallenges":"핵심어려움"}},"highlights":["긍정1","긍정2"],"concerns":["집중점1"],"homeWorkSummary":"가정연습 종합"}`;

    const result = await this.aiService.generateStructured(
      {
        messages: [
          {
            role: 'system',
            content:
              '당신은 자폐 아동 치료 전문가입니다. 부모가 기록한 이번 주 수업 피드백들을 분석하여 따뜻하고 실용적인 주간 요약을 작성합니다. JSON으로만 응답하세요. 마크다운을 사용하지 마세요.',
          },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 800,
      },
      feedbackDigestOutputSchema,
      undefined,
      undefined,
      'FEEDBACK_DIGEST',
    );

    // bySessionType에 실제 count/avgRating 덮어쓰기 (AI 가 잘못 계산할 수 있으므로)
    const correctedByType: Record<
      string,
      { count: number; avgRating: number; keyProgress: string; keyChallenges: string }
    > = {};
    for (const [type, data] of Object.entries(grouped)) {
      const aiSection =
        (result.bySessionType as Record<string, { keyProgress?: string; keyChallenges?: string }>)[
          type
        ] ?? {};
      correctedByType[type] = {
        count: data.count,
        avgRating: Math.round((data.totalRating / data.count) * 10) / 10,
        keyProgress: aiSection.keyProgress ?? '',
        keyChallenges: aiSection.keyChallenges ?? '',
      };
    }

    const digest = await this.prisma.feedbackDigest.upsert({
      where: { childId_weekKey: { childId, weekKey } },
      create: {
        childId,
        familyId: child.familyId,
        weekKey,
        summary: result.summary,
        bySessionType: correctedByType as unknown as Record<string, unknown>,
        highlights: result.highlights,
        concerns: result.concerns,
        homeWorkSummary: result.homeWorkSummary || null,
        feedbackCount: feedbacks.length,
        periodStart,
        periodEnd,
      },
      update: {
        summary: result.summary,
        bySessionType: correctedByType as unknown as Record<string, unknown>,
        highlights: result.highlights,
        concerns: result.concerns,
        homeWorkSummary: result.homeWorkSummary || null,
        feedbackCount: feedbacks.length,
      },
    });

    return { digest: digest as never, isNew: true };
  }

  /** 배치용: 이번 주 digest가 없는 아이에 대해 생성 (최소 3건 기준 충족 시) */
  async generateBatchForChild(childId: string): Promise<'generated' | 'skipped' | 'error'> {
    try {
      const weekKey = this.getCurrentWeekKey();
      const existing = await this.prisma.feedbackDigest.findUnique({
        where: { childId_weekKey: { childId, weekKey } },
      });
      if (existing) return 'skipped';

      const { start, end } = this.getWeekRange(new Date());
      const count = await this.prisma.sessionFeedback.count({
        where: { childId, sessionDate: { gte: start, lte: end } },
      });
      if (count < 3) return 'skipped';

      await this.generateForChild(childId);
      return 'generated';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`FeedbackDigest batch failed for child ${childId}: ${msg}`);
      return 'error';
    }
  }

  getCurrentWeekKey(): string {
    return this.getWeekKeyForDate(new Date());
  }

  getWeekKeyForDate(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum =
      1 +
      Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  getWeekRange(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon ...
    const diffToMon = (day + 6) % 7; // days since Monday
    const start = new Date(d);
    start.setDate(d.getDate() - diffToMon);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}
