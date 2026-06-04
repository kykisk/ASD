import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AIService } from '../ai/ai.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

interface CreateCheckinInput {
  mood: number;
  stressLevel: number;
  notes?: string;
}

@Injectable()
export class WellbeingService {
  private readonly logger = new Logger(WellbeingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async createCheckin(
    userId: string,
    childId: string,
    familyId: string,
    input: CreateCheckinInput,
  ) {
    const burnoutRisk = await this.calculateBurnoutRisk(userId, childId, input);

    let aiMessage: string | null = null;
    try {
      const response = await this.aiService.generate({
        messages: [
          {
            role: 'system',
            content:
              '당신은 자폐 아동을 돌보는 부모를 위한 따뜻한 상담사입니다. 짧고 따뜻한 응원 메시지를 작성해주세요.',
          },
          {
            role: 'user',
            content: `오늘 기분: ${input.mood}/5, 스트레스: ${input.stressLevel}/5, 메모: ${input.notes ?? '없음'}\n번아웃 위험도: ${burnoutRisk}\n50자 이내의 따뜻한 응원 메시지를 한 문장으로만 작성해주세요.`,
          },
        ],
        maxTokens: 100,
      });
      aiMessage = response.content;
    } catch (err) {
      this.logger.warn(
        `AI message generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      aiMessage = this.getDefaultMessage(input.mood);
    }

    const record = await this.prisma.parentWellbeing.create({
      data: {
        userId,
        childId,
        familyId,
        mood: input.mood,
        stressLevel: input.stressLevel,
        notes: input.notes,
        burnoutRisk,
        aiMessage,
      },
    });

    return record;
  }

  async getHistory(userId: string, childId: string, limit = 30) {
    return this.prisma.parentWellbeing.findMany({
      where: { userId, childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStats(userId: string, childId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.parentWellbeing.findMany({
      where: {
        userId,
        childId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (records.length === 0) {
      return {
        avgMood: 0,
        avgStress: 0,
        burnoutRisk: 'LOW',
        checkInCount: 0,
        streak: 0,
      };
    }

    const avgMood = records.reduce((sum, r) => sum + r.mood, 0) / records.length;
    const avgStress = records.reduce((sum, r) => sum + r.stressLevel, 0) / records.length;
    const burnoutRisk = records[0].burnoutRisk;
    const streak = this.calculateStreak(records);

    return {
      avgMood: Math.round(avgMood * 10) / 10,
      avgStress: Math.round(avgStress * 10) / 10,
      burnoutRisk,
      checkInCount: records.length,
      streak,
    };
  }

  private async calculateBurnoutRisk(
    userId: string,
    childId: string,
    current: CreateCheckinInput,
  ): Promise<string> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRecords = await this.prisma.parentWellbeing.findMany({
      where: {
        userId,
        childId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { mood: true, stressLevel: true },
    });

    const allMoods = [...recentRecords.map((r) => r.mood), current.mood];
    const allStress = [...recentRecords.map((r) => r.stressLevel), current.stressLevel];

    const avgMood = allMoods.reduce((sum, m) => sum + m, 0) / allMoods.length;
    const avgStress = allStress.reduce((sum, s) => sum + s, 0) / allStress.length;

    if (avgMood < 2 || avgStress > 4) return 'HIGH';
    if (avgMood < 3) return 'MEDIUM';
    return 'LOW';
  }

  private getDefaultMessage(mood: number): string {
    if (mood >= 4) return '오늘도 정말 잘 하고 계세요! 💚';
    if (mood >= 3) return '힘든 하루였지만 잘 버텨내셨어요 💪';
    return '당신의 노력은 아이에게 큰 힘이 됩니다 🌿';
  }

  private calculateStreak(records: Array<{ createdAt: Date }>): number {
    if (records.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstRecordDate = new Date(records[0].createdAt);
    firstRecordDate.setHours(0, 0, 0, 0);

    if (today.getTime() - firstRecordDate.getTime() > 86400000) {
      return 0;
    }

    for (let i = 0; i < records.length - 1; i++) {
      const current = new Date(records[i].createdAt);
      const next = new Date(records[i + 1].createdAt);
      current.setHours(0, 0, 0, 0);
      next.setHours(0, 0, 0, 0);

      const diffDays = (current.getTime() - next.getTime()) / 86400000;
      if (diffDays <= 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
