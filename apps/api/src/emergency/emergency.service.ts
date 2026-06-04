import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { NotificationTriggerService } from '../notifications/notification-trigger.service.js';
import { EMERGENCY_GUIDES } from './emergency-guide.data.js';

interface LogEventInput {
  type: string;
  severity: string;
  trigger?: string;
  durationMin?: number;
  interventions?: string[];
  outcome?: string;
  notes?: string;
}

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  getGuide(type: string) {
    const key = type as keyof typeof EMERGENCY_GUIDES;
    return EMERGENCY_GUIDES[key] ?? EMERGENCY_GUIDES.OTHER;
  }

  getAllGuides() {
    return Object.entries(EMERGENCY_GUIDES).map(([type, guide]) => ({
      type,
      title: guide.title,
    }));
  }

  async logEvent(userId: string, childId: string, familyId: string, input: LogEventInput) {
    const event = await this.prisma.emergencyEvent.create({
      data: {
        childId,
        familyId,
        userId,
        type: input.type,
        severity: input.severity,
        trigger: input.trigger,
        durationMin: input.durationMin,
        interventions: input.interventions ?? undefined,
        outcome: input.outcome,
        notes: input.notes,
      },
    });

    // Check for pattern (async, non-blocking)
    this.checkPatternThreshold(childId, userId, familyId).catch((err) => {
      this.logger.warn(`Pattern check failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    return event;
  }

  async getHistory(childId: string, userId: string, limit = 20) {
    return this.prisma.emergencyEvent.findMany({
      where: { childId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  async getStats(childId: string, userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allEvents = await this.prisma.emergencyEvent.findMany({
      where: { childId },
      select: { type: true, occurredAt: true },
    });

    const last30Days = allEvents.filter((e) => e.occurredAt >= thirtyDaysAgo);

    const byType: Record<string, number> = {};
    for (const event of allEvents) {
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    return {
      totalCount: allEvents.length,
      last30Days: last30Days.length,
      byType,
    };
  }

  async analyzePatterns(childId: string) {
    const events = await this.prisma.emergencyEvent.findMany({
      where: { childId },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    });

    if (events.length === 0) return null;

    try {
      const eventsData = events.map((e) => ({
        type: e.type,
        severity: e.severity,
        trigger: e.trigger,
        durationMin: e.durationMin,
        occurredAt: e.occurredAt,
      }));

      const response = await this.aiService.generate({
        messages: [
          {
            role: 'system',
            content: '당신은 자폐 아동 행동 분석 전문가입니다.',
          },
          {
            role: 'user',
            content: `다음 비상 사건 기록을 분석해서 패턴과 예방 방법을 알려주세요:\n${JSON.stringify(eventsData)}\n100자 이내로 한국어로 답해주세요.`,
          },
        ],
        maxTokens: 200,
      });

      await this.prisma.emergencyEvent.update({
        where: { id: events[0].id },
        data: { aiPattern: response.content },
      });

      return response.content;
    } catch (err) {
      this.logger.warn(
        `Pattern analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async checkPatternThreshold(childId: string, userId: string, familyId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCount = await this.prisma.emergencyEvent.count({
      where: {
        childId,
        occurredAt: { gte: thirtyDaysAgo },
      },
    });

    if (recentCount >= 3) {
      await this.analyzePatterns(childId);
      await this.notificationTrigger.triggerEmergencyPattern(userId, childId);
    }
  }
}
