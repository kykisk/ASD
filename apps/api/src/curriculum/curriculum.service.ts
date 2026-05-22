import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { AIService } from '../ai/ai.service.js';
import { CurriculumPromptService } from './curriculum-prompt.service.js';
import { DomainAggregationService } from '../assessments/domain-aggregation.service.js';
import { curriculumOutputSchema } from '../ai/schemas/curriculum.schema.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { Curriculum } from '@prisma/client';

@Injectable()
export class CurriculumService {
  private readonly logger = new Logger(CurriculumService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private promptService: CurriculumPromptService,
    private domainAggregation: DomainAggregationService,
    private encryptionService: EncryptionService,
  ) {}

  async generateForChild(childId: string, userId: string, targetDate?: string): Promise<Curriculum> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const date = targetDate ?? this.getTargetDate();
    const dateStart = new Date(`${date}T00:00:00.000Z`);
    const dateEnd = new Date(`${date}T23:59:59.999Z`);

    const existing = await this.prisma.curriculum.findFirst({
      where: {
        childId,
        date: { gte: dateStart, lte: dateEnd },
      },
    });

    if (existing && existing.status !== 'FAILED') {
      return existing;
    }

    if (existing && existing.status === 'FAILED') {
      await this.prisma.curriculum.delete({ where: { id: existing.id } });
    }

    try {
      const pii = await this.encryptionService.decryptPii({
        ciphertext: child.nameEnc,
        iv: child.encIv,
        authTag: child.encAuthTag,
        salt: child.encSalt,
      });

      const ageMonths = this.calculateAgeMonths(pii.birthDate);

      const assessments = await this.prisma.assessment.findMany({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { scores: true },
      });

      const itemWeights = new Map<string, number>();
      for (const a of assessments) {
        for (const s of a.scores) {
          if (!itemWeights.has(s.itemId)) {
            itemWeights.set(s.itemId, 1.0);
          }
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

      const previousCurriculum = await this.prisma.curriculum.findFirst({
        where: { childId, status: { not: 'FAILED' } },
        orderBy: { date: 'desc' },
      });

      const messages = this.promptService.buildCurriculumPrompt({
        childAgeMonths: ageMonths,
        domainScores: aggregated.domains.map((d) => ({
          domain: d.domain,
          label: d.label,
          currentScore: d.currentScore,
          trend: { direction: d.trend.direction },
        })),
        recentAssessmentCount: aggregated.assessmentCount,
        targetDate: date,
        previousWeeklyGoal: previousCurriculum?.weeklyGoal ?? undefined,
      });

      const result = await this.aiService.generateStructured(
        { messages },
        curriculumOutputSchema,
        undefined,
        child.familyId,
      );

      const curriculum = await this.prisma.curriculum.create({
        data: {
          childId,
          familyId: child.familyId,
          date: dateStart,
          status: 'GENERATED',
          weeklyGoal: result.weeklyGoal,
          activities: result.activities as unknown as Record<string, unknown>[],
          notes: result.notes ?? null,
          rawAiOutput: result as unknown as Record<string, unknown>,
          generatedAt: new Date(),
          promptVersion: 'v1',
        },
      });

      return curriculum;
    } catch (error) {
      this.logger.error(`Curriculum generation failed for child ${childId}:`, error);

      await this.prisma.curriculum.create({
        data: {
          childId,
          familyId: child.familyId,
          date: dateStart,
          status: 'FAILED',
          activities: [],
          notes: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (error instanceof ApiException) {
        throw error;
      }
      throw new ApiException(500, 'CURRICULUM_001', `커리큘럼 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTodayCurriculum(childId: string, userId: string): Promise<Curriculum | null> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const today = this.getTargetDate();
    const dateStart = new Date(`${today}T00:00:00.000Z`);
    const dateEnd = new Date(`${today}T23:59:59.999Z`);

    return this.prisma.curriculum.findFirst({
      where: {
        childId,
        date: { gte: dateStart, lte: dateEnd },
        status: { not: 'FAILED' },
      },
    });
  }

  async getCurriculumHistory(childId: string, userId: string, limit = 10): Promise<Curriculum[]> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    return this.prisma.curriculum.findMany({
      where: { childId, status: { not: 'FAILED' } },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async getOneCurriculum(curriculumId: string, userId: string): Promise<Curriculum> {
    const curriculum = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } });
    if (!curriculum) {
      throw new ApiException(404, 'CURRICULUM_404', '커리큘럼을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(curriculum.familyId, userId);

    return curriculum;
  }

  async confirmCurriculum(curriculumId: string, userId: string): Promise<Curriculum> {
    const curriculum = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } });
    if (!curriculum) {
      throw new ApiException(404, 'CURRICULUM_404', '커리큘럼을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(curriculum.familyId, userId);

    return this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
  }

  async regenerateCurriculum(curriculumId: string, userId: string): Promise<Curriculum> {
    const curriculum = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } });
    if (!curriculum) {
      throw new ApiException(404, 'CURRICULUM_404', '커리큘럼을 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(curriculum.familyId, userId);

    await this.prisma.curriculum.delete({ where: { id: curriculumId } });

    const dateStr = curriculum.date.toISOString().split('T')[0];
    return this.generateForChild(curriculum.childId, userId, dateStr);
  }

  private getTargetDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  private calculateAgeMonths(birthDate: string): number {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    let totalMonths = years * 12 + months;
    if (now.getDate() < birth.getDate()) {
      totalMonths--;
    }
    return Math.max(0, totalMonths);
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
}
