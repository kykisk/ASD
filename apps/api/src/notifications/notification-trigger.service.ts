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

  async triggerCurriculumReady(
    childId: string,
    familyId: string,
    excludeUserId?: string,
  ): Promise<void> {
    const users = await this.getFamilyUsers(familyId, excludeUserId);

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

  async triggerWeeklyInsightReady(
    childId: string,
    familyId: string,
    excludeUserId?: string,
  ): Promise<void> {
    const users = await this.getFamilyUsers(familyId, excludeUserId);

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

  private async getFamilyUsers(familyId: string, excludeUserId?: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: {
        familyId,
        role: { in: ['FAMILY_ADMIN', 'FAMILY_MEMBER'] },
        user: { isActive: true },
        ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    return members.map((m) => m.userId);
  }

  async triggerWellbeingReminder(userId: string, familyId: string): Promise<void> {
    await this.notificationsService.create({
      userId,
      childId: undefined,
      type: 'WELLBEING_REMINDER',
      title: '오늘 기분 체크인',
      body: '오늘 하루 어떠셨나요? 잠깐 체크해보세요 💚',
      data: {},
    });
  }

  async triggerResearchReady(familyId: string, articleCount: number): Promise<void> {
    const users = await this.getFamilyUsers(familyId);
    for (const userId of users) {
      await this.notificationsService.create({
        userId,
        type: 'RESEARCH_READY',
        title: '새 연구 자료',
        body: `아이에게 맞는 논문 ${articleCount}편이 준비됐어요`,
        data: { articleCount: String(articleCount) },
      });
    }
  }

  async triggerEmergencyPattern(userId: string, childId: string): Promise<void> {
    await this.notificationsService.create({
      userId,
      childId,
      type: 'EMERGENCY_PATTERN',
      title: '비상 상황 패턴 감지',
      body: '최근 비상 상황이 자주 발생했어요. AI 패턴 분석을 확인해보세요.',
      data: { childId },
    });
  }
}
