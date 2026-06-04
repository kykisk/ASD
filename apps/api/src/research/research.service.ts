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
        ...(childId ? { childId } : {}),
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
