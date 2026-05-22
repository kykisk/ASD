import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { DomainAggregationService } from '../assessments/domain-aggregation.service.js';
import { CacheService } from '../common/cache/cache.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import { insightOutputSchema } from '../ai/schemas/insight.schema.js';

export interface InsightRecord {
  childId: string;
  weekKey: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  overallTrend: 'IMPROVING' | 'STABLE' | 'NEEDS_ATTENTION';
  generatedAt: string;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private aiService: AIService,
    private prisma: PrismaService,
    private domainAggregation: DomainAggregationService,
    private cacheService: CacheService,
  ) {}

  async getWeeklyInsight(childId: string, userId: string): Promise<InsightRecord> {
    await this.verifyAccess(childId, userId);

    const weekKey = this.getCurrentWeekKey();
    const cacheKey = `insight:${childId}:${weekKey}`;

    const cached = await this.cacheService.get<InsightRecord>(cacheKey);
    if (cached) {
      return cached;
    }

    const insight = await this.generateInsight(childId, weekKey);

    await this.cacheService.set(cacheKey, insight, 86400); // 24h TTL

    return insight;
  }

  async getInsightHistory(childId: string, userId: string, weeks: number = 4): Promise<InsightRecord[]> {
    await this.verifyAccess(childId, userId);

    const results: InsightRecord[] = [];
    const currentDate = new Date();

    for (let i = 0; i < weeks; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i * 7);
      const weekKey = this.getWeekKeyForDate(date);
      const cacheKey = `insight:${childId}:${weekKey}`;

      const cached = await this.cacheService.get<InsightRecord>(cacheKey);
      if (cached) {
        results.push(cached);
      }
    }

    return results;
  }

  async generateWeeklyBatch(): Promise<void> {
    const activeMembers = await this.prisma.familyMember.findMany({
      where: { user: { isActive: true } },
      select: { userId: true, familyId: true },
    });

    const familyIds = [...new Set(activeMembers.map((m) => m.familyId))];

    const children = await this.prisma.child.findMany({
      where: { familyId: { in: familyIds } },
      select: { id: true, familyId: true },
    });

    const weekKey = this.getCurrentWeekKey();

    for (const child of children) {
      try {
        const cacheKey = `insight:${child.id}:${weekKey}`;
        const existing = await this.cacheService.get<InsightRecord>(cacheKey);
        if (existing) continue;

        const insight = await this.generateInsight(child.id, weekKey);
        await this.cacheService.set(cacheKey, insight, 86400 * 7); // 7 days for batch
        this.logger.log(`Generated weekly insight for child ${child.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed insight generation for child ${child.id}: ${msg}`);
      }
    }
  }

  private async generateInsight(childId: string, weekKey: string): Promise<InsightRecord> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      include: { scores: true },
    });

    const itemWeights = new Map<string, number>();
    if (assessments.length > 0) {
      const questionnaireIds = [...new Set(assessments.map((a) => a.questionnaireId))];
      const items = await this.prisma.questionnaireItem.findMany({
        where: { questionnaireId: { in: questionnaireIds } },
        select: { id: true, weight: true },
      });
      for (const item of items) {
        itemWeights.set(item.id, item.weight);
      }
    }

    const aggregated = this.domainAggregation.aggregate(
      assessments.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        scores: a.scores.map((s) => ({ domain: s.domain, score: s.score, itemId: s.itemId })),
      })),
      itemWeights,
    );

    const domainSummary = aggregated.domains
      .map((d) => `${d.label}(${d.domain}): ${d.currentScore}/${d.maxScore} (${d.percentage}%) 추세: ${d.trend.direction}`)
      .join('\n');

    const result = await this.aiService.generateStructured(
      {
        messages: [
          {
            role: 'system',
            content:
              '당신은 자폐 아동 발달 전문가입니다. 주간 성장 데이터를 분석하여 부모에게 따뜻하고 구체적인 인사이트를 제공합니다. JSON으로만 응답하세요.',
          },
          {
            role: 'user',
            content: `이번 주 발달 데이터 분석:\n${domainSummary || '데이터 없음'}\n\n전체 점수: ${aggregated.overallScore}/5\n평가 횟수: ${aggregated.assessmentCount}\n\n긍정적 측면, 집중 영역, 추천 활동을 알려주세요.`,
          },
        ],
      },
      insightOutputSchema,
      undefined,
      undefined,
      'INSIGHT',
    );

    return {
      childId,
      weekKey,
      summary: result.summary,
      highlights: result.highlights,
      concerns: result.concerns,
      recommendations: result.recommendations,
      overallTrend: result.overallTrend,
      generatedAt: new Date().toISOString(),
    };
  }

  private async verifyAccess(childId: string, userId: string): Promise<void> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { familyId: true },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });

    if (!membership) {
      throw new ApiException(403, 'AI_004', '해당 아이에 대한 접근 권한이 없습니다');
    }
  }

  private getCurrentWeekKey(): string {
    return this.getWeekKeyForDate(new Date());
  }

  private getWeekKeyForDate(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // ISO week calculation
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }
}
