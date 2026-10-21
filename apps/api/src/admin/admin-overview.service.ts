import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { AICostTrackingService, kstDate } from '../ai/ai-cost-tracking.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** 이메일이 이 패턴이면 테스트 계정으로 봄 (정리 대상 안내) */
export const TEST_ACCOUNT_PATTERN = /^qa-.*@example\.com$/;

export interface OverviewTodo {
  kind: 'RESEARCH_SUMMARY' | 'AI_FAILURES' | 'JOB_FAILED' | 'TEST_ACCOUNTS' | 'INACTIVE_FAMILY';
  title: string;
  detail: string;
  /** 관리자 화면에서 이동할 곳 */
  link: string;
}

/** 관리자 첫 화면(운영 현황) 집계 */
@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costTracker: AICostTrackingService,
  ) {}

  async overview() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

    const [lastCurriculumJob, failedJobs, usage, aiLimit, missingSummaries, users, families] =
      await Promise.all([
        this.prisma.batchJob.findFirst({
          where: { type: 'CURRICULUM_GENERATION' },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.batchJob.findMany({
          where: {
            createdAt: { gte: weekAgo },
            OR: [{ status: 'FAILED' }, { failedItems: { gt: 0 } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.costTracker.getUsageSummary(1),
        this.prisma.aiConfig.findFirst({
          where: { isActive: true, isDefault: true },
          select: { dailyBudgetLimit: true },
        }),
        this.prisma.researchArticle.count({ where: { koreanSummary: null } }),
        this.prisma.user.findMany({
          where: { role: { not: 'SYSTEM_ADMIN' } },
          select: { id: true, email: true, createdAt: true },
        }),
        this.prisma.family.findMany({
          select: { id: true, name: true, children: { select: { id: true } } },
        }),
      ]);

    const failures24h = usage.recentFailures.filter(
      (f) => now.getTime() - new Date(f.at).getTime() < DAY_MS,
    );
    const familyActivity = await this.familyActivity(families, now);
    const testAccounts = users.filter((u) => TEST_ACCOUNT_PATTERN.test(u.email));

    const todos: OverviewTodo[] = [];
    if (missingSummaries > 0) {
      todos.push({
        kind: 'RESEARCH_SUMMARY',
        title: `논문 ${missingSummaries}편에 한국어 요약이 없어요`,
        detail: '요약 재처리를 실행하면 다시 요약해요',
        link: '/jobs',
      });
    }
    if (failures24h.length > 0) {
      todos.push({
        kind: 'AI_FAILURES',
        title: `AI 호출 실패 ${failures24h.length}건 (24시간)`,
        detail: failures24h[0]
          ? `최근: ${failures24h[0].feature} · ${failures24h[0].error.slice(0, 60)}`
          : '',
        link: '/ai',
      });
    }
    for (const job of failedJobs.slice(0, 2)) {
      todos.push({
        kind: 'JOB_FAILED',
        title: `자동 작업 ${job.status === 'FAILED' ? '실패' : '일부 실패'}: ${job.type}`,
        detail: `${job.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC · 실패 ${job.failedItems}건`,
        link: '/jobs',
      });
    }
    if (testAccounts.length > 0) {
      todos.push({
        kind: 'TEST_ACCOUNTS',
        title: `테스트 계정 ${testAccounts.length}개가 남아 있어요`,
        detail: testAccounts
          .map((u) => u.email)
          .slice(0, 2)
          .join(', '),
        link: '/users',
      });
    }
    for (const f of familyActivity
      .filter((f) => f.hasChildren && f.daysSinceLast >= 5)
      .slice(0, 3)) {
      todos.push({
        kind: 'INACTIVE_FAMILY',
        title: `${f.name}: ${f.daysSinceLast === Infinity ? '아직 기록이 없어요' : `${f.daysSinceLast}일째 기록이 없어요`}`,
        detail: '오늘 하루 기록 · 활동 기록 기준',
        link: '/users',
      });
    }

    return {
      generatedAt: now.toISOString(),
      lastNight: lastCurriculumJob,
      ai: {
        todayCalls: usage.today.calls,
        dailyLimit: aiLimit?.dailyBudgetLimit ?? null,
        failures24h: failures24h.length,
        monthCostUsd: usage.month.estimatedCostUsd,
      },
      todos,
      stats: {
        families: families.length,
        children: families.reduce((n, f) => n + f.children.length, 0),
        activeFamiliesThisWeek: familyActivity.filter((f) => f.recordDays7 > 0).length,
        newUsers7d: users.filter((u) => u.createdAt >= weekAgo).length,
      },
      families: familyActivity
        .filter((f) => f.hasChildren)
        .map(({ id, name, recordDays7 }) => ({ id, name, recordDays7 })),
    };
  }

  /** 가족별 최근 7일 기록한 날 수와 마지막 기록 이후 지난 날 (오늘 하루 기록 · 피드백 · 활동 기록) */
  private async familyActivity(
    families: Array<{ id: string; name: string; children: Array<{ id: string }> }>,
    now: Date,
  ) {
    const childToFamily = new Map<string, string>();
    for (const f of families) for (const c of f.children) childToFamily.set(c.id, f.id);
    const childIds = [...childToFamily.keys()];

    const [assessments, feedbacks, logs] = await Promise.all([
      this.prisma.assessment.findMany({
        where: { childId: { in: childIds } },
        select: { childId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      this.prisma.sessionFeedback.findMany({
        where: { childId: { in: childIds } },
        select: { childId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      this.prisma.activityLog.findMany({
        where: { childId: { in: childIds } },
        select: { childId: true, loggedAt: true },
        orderBy: { loggedAt: 'desc' },
        take: 2000,
      }),
    ]);

    const byFamily = new Map<string, Date[]>();
    const add = (childId: string, at: Date) => {
      const familyId = childToFamily.get(childId);
      if (!familyId) return;
      byFamily.set(familyId, [...(byFamily.get(familyId) ?? []), at]);
    };
    assessments.forEach((a) => add(a.childId, a.createdAt));
    feedbacks.forEach((f) => add(f.childId, f.createdAt));
    logs.forEach((l) => add(l.childId, l.loggedAt));

    const today = kstDate(now);
    return families.map((f) => {
      const dates = byFamily.get(f.id) ?? [];
      const recent = new Set(
        dates.filter((d) => now.getTime() - d.getTime() < 7 * DAY_MS).map((d) => kstDate(d)),
      );
      const last = dates.reduce<Date | null>((max, d) => (!max || d > max ? d : max), null);
      const daysSinceLast = last
        ? Math.round(
            (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${kstDate(last)}T00:00:00Z`)) / DAY_MS,
          )
        : Infinity;
      return {
        id: f.id,
        name: f.name,
        hasChildren: f.children.length > 0,
        recordDays7: recent.size,
        daysSinceLast,
      };
    });
  }
}
