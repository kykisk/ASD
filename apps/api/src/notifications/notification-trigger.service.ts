import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);

  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
  ) {}

  async triggerCurriculumReady(childId: string, familyId: string): Promise<void> {
    const users = await this.getFamilyUsers(familyId);

    for (const userId of users) {
      await this.notificationsService.create({
        userId,
        childId,
        type: 'CURRICULUM_READY',
        title: '커리큘럼 준비 완료',
        body: '오늘의 커리큘럼이 준비됐어요',
        data: { childId },
      });
    }
  }

  async triggerAssessmentReminder(childId: string, familyId: string): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentAssessment = await this.prisma.assessment.findFirst({
      where: { childId, createdAt: { gte: threeDaysAgo } },
    });

    if (recentAssessment) return;

    const users = await this.getFamilyUsers(familyId);

    for (const userId of users) {
      await this.notificationsService.create({
        userId,
        childId,
        type: 'ASSESSMENT_DUE',
        title: '평가 알림',
        body: '오늘 평가를 기록해보세요',
        data: { childId },
      });
    }
  }

  async triggerInputReminder(childId: string, familyId: string): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentLog = await this.prisma.activityLog.findFirst({
      where: { childId, createdAt: { gte: oneWeekAgo } },
    });

    if (recentLog) return;

    const users = await this.getFamilyUsers(familyId);

    for (const userId of users) {
      await this.notificationsService.create({
        userId,
        childId,
        type: 'INPUT_REMINDER',
        title: '활동 기록 알림',
        body: '활동 기록을 남겨보세요',
        data: { childId },
      });
    }
  }

  async triggerWeeklyInsightReady(childId: string, familyId: string): Promise<void> {
    const users = await this.getFamilyUsers(familyId);

    for (const userId of users) {
      await this.notificationsService.create({
        userId,
        childId,
        type: 'WEEKLY_INSIGHT_READY',
        title: '주간 분석 준비 완료',
        body: '이번 주 성장 분석이 준비됐어요',
        data: { childId },
      });
    }
  }

  private async getFamilyUsers(familyId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: {
        familyId,
        role: { in: ['FAMILY_ADMIN', 'FAMILY_MEMBER'] },
        user: { isActive: true },
      },
      select: { userId: true },
    });

    return members.map((m) => m.userId);
  }
}
