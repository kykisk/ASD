import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { DomainAggregationService } from './domain-aggregation.service.js';
import { CacheService } from '../common/cache/cache.service.js';
import type { CreateAssessmentInput } from '@auticare/dto';
import type { AggregatedResult } from './domain-aggregation.service.js';

@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private domainAggregationService: DomainAggregationService,
    private cacheService: CacheService,
  ) {}

  async create(childId: string, familyId: string, userId: string, dto: CreateAssessmentInput) {
    await this.verifyFamilyMember(familyId, userId);
    await this.verifyQuestionnaireBelongsToFamily(dto.questionnaireId, familyId);

    const totalScore = dto.scores.reduce((sum, s) => sum + s.score, 0) / dto.scores.length;

    const assessment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          childId,
          familyId,
          questionnaireId: dto.questionnaireId,
          frequency: dto.frequency ?? 'DAILY',
          notes: dto.notes ?? null,
          totalScore,
          completedAt: new Date(),
        },
      });

      await tx.assessmentScore.createMany({
        data: dto.scores.map((s) => ({
          assessmentId: created.id,
          itemId: s.itemId,
          domain: s.domain,
          score: s.score,
          notes: s.notes ?? null,
        })),
      });

      return tx.assessment.findUnique({
        where: { id: created.id },
        include: { scores: true },
      });
    });

    await this.cacheService.delByPattern('dashboard:*');

    return assessment;
  }

  async findByChild(
    childId: string,
    userId: string,
    query: { startDate?: string; endDate?: string; limit?: number },
  ) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const createdAtFilter: { gte?: Date; lte?: Date } = {};
    if (query.startDate) createdAtFilter.gte = new Date(query.startDate);
    if (query.endDate) createdAtFilter.lte = new Date(query.endDate);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter }),
      },
      include: {
        scores: true,
        questionnaire: { select: { type: true, licensedTool: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
    });

    return assessments;
  }

  async findOne(id: string, userId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { scores: true, questionnaire: true },
    });

    if (!assessment) {
      throw new ApiException(404, 'ASSESSMENT_404', '평가를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(assessment.familyId, userId);

    return assessment;
  }

  async getAggregated(childId: string, userId: string): Promise<AggregatedResult> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const assessments = await this.prisma.assessment.findMany({
      where: { childId },
      include: { scores: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    if (assessments.length === 0) {
      return {
        overallScore: 0,
        domains: [],
        assessmentCount: 0,
        lastAssessedAt: null,
      };
    }

    const latestQuestionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: assessments[0].questionnaireId },
      include: { items: true },
    });

    const itemWeights = new Map<string, number>();
    if (latestQuestionnaire) {
      for (const item of latestQuestionnaire.items) {
        itemWeights.set(item.id, item.weight);
      }
    }

    return this.domainAggregationService.aggregate(
      assessments.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        scores: a.scores.map((s) => ({ domain: s.domain, score: s.score, itemId: s.itemId })),
      })),
      itemWeights,
    );
  }

  private async verifyFamilyMember(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });

    if (!membership) {
      throw new ApiException(403, 'FORBIDDEN', '가족 구성원이 아닙니다');
    }

    return membership;
  }

  private async verifyQuestionnaireBelongsToFamily(questionnaireId: string, familyId: string) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire) {
      throw new ApiException(404, 'QUESTIONNAIRE_404', '설문지를 찾을 수 없습니다');
    }

    if (questionnaire.familyId !== familyId) {
      throw new ApiException(403, 'FORBIDDEN', '해당 가족의 설문지가 아닙니다');
    }

    return questionnaire;
  }
}
