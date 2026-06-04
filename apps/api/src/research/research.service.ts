import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { PubmedService } from './pubmed.service.js';
import { NotificationTriggerService } from '../notifications/notification-trigger.service.js';

const ASD_QUERIES = [
  'autism spectrum disorder therapy 2024',
  'ASD behavioral intervention',
  'autism sensory processing',
  'ASD family support',
  'autism early intervention',
];

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly pubmedService: PubmedService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  async summarizeArticle(
    title: string,
    abstract: string,
    userId: string,
  ): Promise<{ koreanSummary: string; keyFindings: string[] } | null> {
    try {
      const response = await this.aiService.generate({
        messages: [
          {
            role: 'system',
            content: '당신은 자폐 스펙트럼 장애 연구 논문 전문 번역가입니다.',
          },
          {
            role: 'user',
            content: `다음 논문을 한국어로 요약해주세요:\n제목: ${title}\n초록: ${abstract}\n\n1. 한국어 요약 (3문장): \n2. 핵심 발견 3가지 (bullet points):\nJSON 형식으로: { "koreanSummary": "string", "keyFindings": ["string"] }`,
          },
        ],
        maxTokens: 500,
      });

      const jsonStr = this.extractJson(response.content);
      const parsed = JSON.parse(jsonStr);
      return {
        koreanSummary: parsed.koreanSummary ?? '',
        keyFindings: parsed.keyFindings ?? [],
      };
    } catch (err) {
      this.logger.warn(
        `Article summarization failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  matchToFamily(
    article: { tags: string[]; publishedAt: Date },
    childProfile?: { diagnosisName?: string; domains?: string[] },
  ): number {
    let score = 0;

    // Recency scoring
    const now = new Date();
    const diffYears =
      (now.getTime() - article.publishedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (diffYears <= 2) {
      score += 0.3;
    } else if (diffYears <= 5) {
      score += 0.1;
    }

    if (!childProfile) return Math.min(score, 1);

    // Diagnosis match
    if (childProfile.diagnosisName) {
      const keywords = ['autism', 'asd', 'autistic', '자폐'];
      const hasMatch = keywords.some((kw) =>
        article.tags.some((tag) => tag.toLowerCase().includes(kw)),
      );
      if (hasMatch) score += 0.3;
    }

    // Domain match
    if (childProfile.domains && childProfile.domains.length > 0) {
      let domainMatches = 0;
      for (const domain of childProfile.domains) {
        if (article.tags.some((tag) => tag.toLowerCase().includes(domain.toLowerCase()))) {
          domainMatches++;
        }
      }
      score += Math.min(domainMatches * 0.2, 0.4);
    }

    return Math.min(score, 1);
  }

  async getResearchFeed(familyId: string, childId?: string, limit = 20) {
    return this.prisma.researchUserMatch.findMany({
      where: {
        familyId,
        ...(childId ? { OR: [{ childId }, { childId: null }] } : {}),
      },
      include: { article: true },
      orderBy: [{ isRead: 'asc' }, { score: 'desc' }],
      take: limit,
    });
  }

  async bookmarkArticle(familyId: string, articleId: string) {
    const match = await this.prisma.researchUserMatch.findUnique({
      where: { articleId_familyId: { articleId, familyId } },
    });

    if (!match) {
      return this.prisma.researchUserMatch.create({
        data: { articleId, familyId, isBookmarked: true },
      });
    }

    return this.prisma.researchUserMatch.update({
      where: { articleId_familyId: { articleId, familyId } },
      data: { isBookmarked: !match.isBookmarked },
    });
  }

  async markAsRead(familyId: string, articleId: string) {
    return this.prisma.researchUserMatch.upsert({
      where: { articleId_familyId: { articleId, familyId } },
      update: { isRead: true },
      create: { articleId, familyId, isRead: true },
    });
  }

  async getBookmarks(familyId: string, limit = 50) {
    return this.prisma.researchUserMatch.findMany({
      where: { familyId, isBookmarked: true },
      include: { article: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async generateAiDigest(
    familyId: string,
    childId: string,
  ): Promise<{
    digest: string;
    topArticles: { pubmedId: string; title: string; reason: string }[];
    generatedAt: string;
  }> {
    const [bookmarks, child, latestAssessment, latestSensory] = await Promise.all([
      this.prisma.researchUserMatch.findMany({
        where: { familyId, isBookmarked: true },
        include: {
          article: {
            select: {
              pubmedId: true,
              title: true,
              koreanSummary: true,
              tags: true,
              keyFindings: true,
            },
          },
        },
        take: 30,
      }),
      this.prisma.child.findUnique({
        where: { id: childId },
        select: { diagnosisName: true, developmentalLevel: true },
      }),
      this.prisma.assessment.findFirst({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        include: { scores: { select: { domain: true, score: true } } },
      }),
      this.prisma.sensoryProfile.findFirst({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        select: {
          visual: true,
          auditory: true,
          tactile: true,
          vestibular: true,
          proprioception: true,
          olfactory: true,
        },
      }),
    ]);

    if (bookmarks.length === 0) {
      return {
        digest:
          '북마크된 논문이 없습니다. 연구 피드에서 관심 있는 논문을 북마크한 후 다시 시도해주세요.',
        topArticles: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const domainScores =
      latestAssessment?.scores.reduce(
        (acc, s) => {
          acc[s.domain] = s.score;
          return acc;
        },
        {} as Record<string, number>,
      ) ?? {};

    const articlesContext = bookmarks
      .map((b, i) => {
        const a = b.article;
        const summary = a.koreanSummary ? `요약: ${a.koreanSummary.slice(0, 200)}` : '';
        const findings = a.keyFindings?.slice(0, 2).join(' / ') ?? '';
        return `[${i + 1}] ${a.title}\n${summary}\n${findings}`;
      })
      .join('\n\n');

    const childContext = [
      child && `아이 진단: ${child.diagnosisName ?? '미기재'}`,
      child?.diagnosisName && `진단: ${child.diagnosisName}`,
      Object.keys(domainScores).length > 0 &&
        `최근 평가 점수: ${Object.entries(domainScores)
          .map(([d, s]) => `${d}=${s}/5`)
          .join(', ')}`,
      latestSensory &&
        `감각 프로파일(1=과민,5=둔감): 시각=${latestSensory.visual}, 청각=${latestSensory.auditory}, 촉각=${latestSensory.tactile}`,
      child?.developmentalLevel &&
        `발달 수준: ${JSON.stringify(child.developmentalLevel).slice(0, 200)}`,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `당신은 자폐 아동 치료를 돕는 전문 상담사입니다.

아래는 부모가 북마크한 ${bookmarks.length}편의 연구 논문 목록과 아이의 현재 상태입니다.

=== 아이 현재 상태 ===
${childContext}

=== 북마크된 논문 (${bookmarks.length}편) ===
${articlesContext}

위 정보를 바탕으로 다음 형식으로 작성해주세요 (반드시 한국어):

**아이 상태 분석**: (2-3문장으로 현재 아이에게 가장 중요한 영역 설명)

**TOP 3 추천 논문**:
1. [논문번호] 논문제목 - 추천 이유 한 문장
2. [논문번호] 논문제목 - 추천 이유 한 문장
3. [논문번호] 논문제목 - 추천 이유 한 문장

**실천 팁**:
- 팁 1 (구체적인 활동)
- 팁 2 (구체적인 활동)
- 팁 3 (구체적인 활동)

따뜻하고 격려하는 톤으로 작성해주세요. JSON 형식은 사용하지 마세요.`;

    try {
      const result = await this.aiService.generate({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1200,
      });

      const text = (result.content ?? '').trim();
      if (!text) throw new Error('Empty AI response');

      const topArticles: { pubmedId: string; title: string; reason: string }[] = [];
      const topRegex = /\d+\.\s*\[([^\]]+)\]\s*([^-\n]+)\s*-\s*([^\n]+)/g;
      let match;
      while ((match = topRegex.exec(text)) !== null && topArticles.length < 3) {
        const matchedArticle = bookmarks.find((b) => b.article.pubmedId === match[1].trim());
        topArticles.push({
          pubmedId: match[1].trim(),
          title: matchedArticle?.article.title ?? match[2].trim(),
          reason: match[3].trim(),
        });
      }

      return {
        digest: text,
        topArticles,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error('AI digest generation failed', err);
      return {
        digest: 'AI 요약 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        topArticles: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  async runWeeklyCollection(childId?: string, familyId?: string) {
    const batchJob = await this.prisma.batchJob.create({
      data: {
        type: 'RESEARCH_COLLECTION',
        status: 'RUNNING',
        startedAt: new Date(),
        targetDate: new Date(),
      },
    });

    let totalArticles = 0;
    const errors: Array<{ query: string; error: string }> = [];

    for (const query of ASD_QUERIES) {
      try {
        const { ids } = await this.pubmedService.searchArticles(query, 5);
        if (ids.length === 0) continue;

        const details = await this.pubmedService.fetchArticleDetails(ids);

        for (const article of details) {
          const existing = await this.prisma.researchArticle.findUnique({
            where: { pubmedId: article.pubmedId },
          });

          if (existing) continue;

          const created = await this.prisma.researchArticle.create({
            data: {
              pubmedId: article.pubmedId,
              title: article.title,
              authors: article.authors,
              abstract: article.abstract,
              publishedAt: new Date(article.publishedAt),
              journal: article.journal,
              tags: this.extractTags(article.title, article.abstract),
            },
          });

          // Summarize (non-blocking per article)
          const summary = await this.summarizeArticle(article.title, article.abstract, 'system');
          if (summary) {
            await this.prisma.researchArticle.update({
              where: { id: created.id },
              data: {
                koreanSummary: summary.koreanSummary,
                keyFindings: summary.keyFindings,
              },
            });
          }

          // Match to families
          const families = familyId
            ? [{ id: familyId }]
            : await this.prisma.family.findMany({ select: { id: true } });

          for (const fam of families) {
            const score = this.matchToFamily({
              tags: created.tags,
              publishedAt: created.publishedAt,
            });

            await this.prisma.researchUserMatch.upsert({
              where: { articleId_familyId: { articleId: created.id, familyId: fam.id } },
              update: { score },
              create: { articleId: created.id, familyId: fam.id, childId, score },
            });
          }

          totalArticles++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({ query, error: errorMessage });
        this.logger.warn(`Research collection failed for query "${query}": ${errorMessage}`);
      }
    }

    await this.prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: 'COMPLETED',
        totalItems: ASD_QUERIES.length,
        processedItems: totalArticles,
        failedItems: errors.length,
        errors: errors.length > 0 ? (errors as unknown as Record<string, unknown>[]) : undefined,
        completedAt: new Date(),
      },
    });

    // Notify families about new articles
    if (familyId && totalArticles > 0) {
      await this.notificationTrigger.triggerResearchReady(familyId, totalArticles).catch(() => {});
    }

    return { batchJobId: batchJob.id, totalArticles, errors };
  }

  private extractTags(title: string, abstract: string): string[] {
    const text = `${title} ${abstract}`.toLowerCase();
    const tagKeywords = [
      'autism',
      'asd',
      'sensory',
      'communication',
      'social',
      'behavioral',
      'intervention',
      'therapy',
      'motor',
      'cognitive',
      'language',
      'family',
      'parent',
      'early intervention',
      'applied behavior analysis',
      'aba',
    ];

    return tagKeywords.filter((kw) => text.includes(kw));
  }

  private extractJson(content: string): string {
    const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) return fenceMatch[1].trim();
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) return braceMatch[0];
    return content.trim();
  }
}
