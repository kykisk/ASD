import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { DomainAggregationService } from '../assessments/domain-aggregation.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import { scheduleSuggestionSchema } from '../ai/schemas/schedule-suggestion.schema.js';
import type { ScheduleSuggestion } from '../ai/schemas/schedule-suggestion.schema.js';
import type { Schedule } from '@prisma/client';
import type { z } from 'zod';

@Injectable()
export class ScheduleSuggestionService {
  constructor(
    private aiService: AIService,
    private prisma: PrismaService,
    private domainAggregation: DomainAggregationService,
  ) {}

  async getSuggestions(childId: string, userId: string): Promise<ScheduleSuggestion> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        childId,
        startTime: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startTime: 'asc' },
    });

    const assessments = await this.prisma.assessment.findMany({
      where: { childId },
      include: { scores: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const assessmentsForAggregation = assessments.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      scores: a.scores.map((s) => ({
        domain: s.domain,
        score: s.score,
        itemId: s.itemId,
      })),
    }));

    const aggregated = this.domainAggregation.aggregate(assessmentsForAggregation, new Map());

    const scheduleList = schedules.map((s) => ({
      title: s.title,
      category: s.category,
      time: `${s.startTime.toISOString().slice(11, 16)}-${s.endTime.toISOString().slice(11, 16)}`,
    }));

    const domainList = aggregated.domains.map((d) => ({
      domain: d.label,
      score: d.currentScore,
      trend: d.trend.direction,
    }));

    const systemMessage = '당신은 자폐 아동 치료 스케줄 전문 컨설턴트입니다. JSON으로만 응답하세요.';
    const userMessage = `현재 주간 일정과 최근 발달 평가 데이터를 분석하여 스케줄 개선을 제안해주세요.

현재 일정: ${JSON.stringify(scheduleList)}

발달 추이: ${JSON.stringify(domainList)}`;

    return this.aiService.generateStructured(
      {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
      },
      scheduleSuggestionSchema,
    );
  }

  async acceptSuggestion(
    childId: string,
    userId: string,
    suggestion: z.infer<typeof scheduleSuggestionSchema>['suggestions'][0],
    targetDate: string,
  ): Promise<Schedule | null> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    if (suggestion.type !== 'ADD') {
      return null;
    }

    const startTime = new Date(targetDate);
    if (suggestion.suggestedTime) {
      const [hours, minutes] = suggestion.suggestedTime.split(':').map(Number);
      startTime.setHours(hours, minutes, 0, 0);
    }

    const duration = suggestion.suggestedDuration ?? 30;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    return this.prisma.schedule.create({
      data: {
        childId,
        familyId: child.familyId,
        title: suggestion.title,
        category: suggestion.category,
        startTime,
        endTime,
        isAllDay: false,
        recurrenceType: 'NONE',
      },
    });
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
