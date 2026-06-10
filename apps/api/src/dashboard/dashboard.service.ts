import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { TrendService } from '../assessments/trend.service.js';
import type { TrendDirection } from '../assessments/trend.service.js';
import { SchedulesService } from '../schedules/schedules.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import { CacheService } from '../common/cache/cache.service.js';

export interface TodaySchedule {
  id: string;
  title: string;
  time: string;
  startTime: string;
  endTime: string;
  category: string;
  isCompleted: boolean;
  completed: boolean;
}

export interface DashboardAlert {
  type: 'ASSESSMENT_DUE' | 'MILESTONE' | 'NO_SCHEDULE' | 'RE_EVALUATION_DUE' | 'FEEDBACK_REMINDER';
  message: string;
  severity: 'info' | 'warning';
  detail?: string;
}

export interface DashboardData {
  child: {
    id: string;
    name: string;
    ageMonths: number;
    therapyDays: number;
  };
  today: {
    schedules: TodaySchedule[];
    completedCount: number;
    totalCount: number;
  };
  recentAssessment: {
    date: string;
    overallScore: number;
    domainScores: { domain: string; score: number; trend: TrendDirection }[];
  } | null;
  weeklyProgress: {
    completionRate: number;
    assessmentCount: number;
    streak: number;
  };
  alerts: DashboardAlert[];
}

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private trendService: TrendService,
    private schedulesService: SchedulesService,
    private cacheService: CacheService,
  ) {}

  async getDashboardData(childId: string, userId: string): Promise<DashboardData> {
    const cacheKey = `dashboard:${childId}`;
    const cached = await this.cacheService.get<DashboardData>(cacheKey);
    if (cached) return cached;

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    // Decrypt child name and birthDate
    const pii = await this.encryptionService.decryptPii({
      ciphertext: child.nameEnc,
      iv: child.encIv,
      authTag: child.encAuthTag,
      salt: child.encSalt,
    });

    const birthDate = new Date(pii.birthDate);
    const now = new Date();
    const ageMonths = this.calculateAgeMonths(birthDate, now);

    // Get first assessment to calculate therapy days
    const firstAssessment = await this.prisma.assessment.findFirst({
      where: { childId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const therapyDays = firstAssessment
      ? Math.floor((now.getTime() - firstAssessment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const allSchedules = await this.prisma.schedule.findMany({
      where: {
        childId,
        OR: [
          { startTime: { gte: todayStart, lte: todayEnd } },
          { recurrenceType: { not: 'NONE' }, startTime: { lt: todayEnd } },
        ],
      },
      orderBy: { startTime: 'asc' },
    });

    const todayOccurrences = allSchedules
      .flatMap((s) => this.schedulesService.expandRecurrences(s, todayStart, todayEnd))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const upcomingSchedules: TodaySchedule[] = todayOccurrences.slice(0, 3).map((s) => {
      const isDone = s.endTime < now;
      const kstMs = s.startTime.getTime() + 9 * 60 * 60 * 1000;
      const kst = new Date(kstMs);
      const hh = String(kst.getUTCHours()).padStart(2, '0');
      const mm = String(kst.getUTCMinutes()).padStart(2, '0');
      return {
        id: s.id,
        title: s.title,
        time: `${hh}:${mm}`,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        category: s.category,
        isCompleted: isDone,
        completed: isDone,
      };
    });

    const completedCount = todayOccurrences.filter((s) => s.endTime < now).length;

    // Get most recent assessment with domain scores
    const recentAssessment = await this.getRecentAssessment(childId);

    // Calculate weekly progress
    const weeklyProgress = await this.calculateWeeklyProgress(childId);

    // Generate alerts
    const alerts = await this.generateAlerts(childId, todayOccurrences.length);

    const result: DashboardData = {
      child: {
        id: childId,
        name: pii.name,
        ageMonths,
        therapyDays,
      },
      today: {
        schedules: upcomingSchedules,
        completedCount,
        totalCount: todayOccurrences.length,
      },
      recentAssessment,
      weeklyProgress,
      alerts,
    };

    await this.cacheService.set(cacheKey, result, 120);

    return result;
  }

  private calculateAgeMonths(birthDate: Date, now: Date): number {
    const months =
      (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    return Math.max(0, months);
  }

  private async getRecentAssessment(childId: string) {
    const recent = await this.prisma.assessment.findFirst({
      where: { childId, completedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { scores: true },
    });

    if (!recent) return null;

    // Get previous assessments for trend calculation
    const previousAssessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        completedAt: { not: null },
        createdAt: { lt: recent.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: { scores: true },
    });

    // Group scores by domain
    const domainMap = new Map<string, number[]>();
    for (const score of recent.scores) {
      const existing = domainMap.get(score.domain) || [];
      existing.push(score.score);
      domainMap.set(score.domain, existing);
    }

    // Calculate trend for each domain
    const domainScores = Array.from(domainMap.entries()).map(([domain, scores]) => {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      const previousScores = previousAssessments.flatMap((a) =>
        a.scores.filter((s) => s.domain === domain).map((s) => s.score),
      );

      const trendResult = this.trendService.calculateTrend(scores, previousScores);

      return {
        domain,
        score: Math.round(avgScore * 100) / 100,
        trend: trendResult.direction,
      };
    });

    return {
      date: recent.createdAt.toISOString().split('T')[0],
      overallScore: recent.totalScore ?? 0,
      domainScores,
    };
  }

  private async calculateWeeklyProgress(childId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekAssessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        completedAt: { not: null },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    const assessmentCount = weekAssessments.length;
    const completionRate = Math.round((assessmentCount / 7) * 100);

    // Calculate streak
    const streak = await this.calculateStreak(childId);

    return {
      completionRate: Math.min(100, completionRate),
      assessmentCount,
      streak,
    };
  }

  private async calculateStreak(childId: string): Promise<number> {
    const assessments = await this.prisma.assessment.findMany({
      where: { childId, completedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { createdAt: true },
    });

    if (assessments.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assessmentDates = new Set(
      assessments.map((a) => {
        const d = new Date(a.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    );

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      if (assessmentDates.has(checkDate.getTime())) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async generateAlerts(
    childId: string,
    todayScheduleCount: number,
  ): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    // Check if no assessment in 3+ days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentAssessmentCount = await this.prisma.assessment.count({
      where: {
        childId,
        completedAt: { not: null },
        createdAt: { gte: threeDaysAgo },
      },
    });

    if (recentAssessmentCount === 0) {
      alerts.push({
        type: 'ASSESSMENT_DUE',
        message: '이번 주 평가가 없어요',
        severity: 'warning',
      });
    }

    // Check if no schedules today
    if (todayScheduleCount === 0) {
      alerts.push({
        type: 'NO_SCHEDULE',
        message: '오늘 예정된 일정이 없어요',
        severity: 'info',
      });
    }

    const REEVAL_INTERVALS: Record<string, { months: number; label: string }> = {
      M_CHAT_R_F: { months: 3, label: 'M-CHAT-R/F' },
      CARS_2: { months: 6, label: 'CARS-2' },
      ABC: { months: 12, label: 'ABC' },
    };

    for (const [tool, { months, label }] of Object.entries(REEVAL_INTERVALS)) {
      const cutoff = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
      const last = await this.prisma.assessment.findFirst({
        where: {
          childId,
          questionnaire: { licensedTool: tool as never },
          totalScore: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!last || last.createdAt < cutoff) {
        const monthsAgo = last
          ? Math.round((Date.now() - last.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
          : null;
        alerts.push({
          type: 'RE_EVALUATION_DUE',
          message: `${label} 재평가가 필요합니다`,
          severity: 'warning',
          detail: last
            ? `마지막 평가: ${monthsAgo}개월 전 (${months}개월 주기 권고)`
            : `아직 ${label} 평가 기록이 없습니다`,
        });
      }
    }

    const reportCutoff = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
    const lastReport = await this.prisma.clinicalReport.findFirst({
      where: { childId },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (!lastReport || (lastReport.assessmentDate ?? lastReport.createdAt) < reportCutoff) {
      const monthsAgo = lastReport
        ? Math.round(
            (Date.now() - (lastReport.assessmentDate ?? lastReport.createdAt).getTime()) /
              (30 * 24 * 60 * 60 * 1000),
          )
        : null;
      alerts.push({
        type: 'RE_EVALUATION_DUE',
        message: '외부 기관 임상 평가 업데이트를 권고합니다',
        severity: 'info',
        detail: lastReport
          ? `마지막 평가: ${monthsAgo}개월 전 (연 1회 권고)`
          : '외부 기관 평가 보고서가 없습니다',
      });
    }

    const threeDaysAgoFeedback = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentFeedbackCount = await this.prisma.sessionFeedback.count({
      where: { childId, sessionDate: { gte: threeDaysAgoFeedback } },
    });
    if (recentFeedbackCount === 0) {
      alerts.push({
        type: 'FEEDBACK_REMINDER',
        message: '수업 피드백을 입력해주세요',
        severity: 'info',
        detail:
          '최근 3일간 수업 피드백이 없어요. 치료사 피드백을 기록하면 AI 커리큘럼이 더 정확해집니다.',
      });
    }

    return alerts;
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
