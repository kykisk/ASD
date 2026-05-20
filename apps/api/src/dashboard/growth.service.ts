import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';

export interface TimeSeriesPoint {
  date: string;
  score: number;
  assessmentId: string;
}

export interface DomainTimeSeries {
  domain: string;
  label: string;
  color: string;
  data: TimeSeriesPoint[];
}

export interface GrowthData {
  childId: string;
  dateRange: { from: string; to: string };
  domains: DomainTimeSeries[];
  overall: TimeSeriesPoint[];
  weeklyAverages: { week: string; score: number }[];
  monthlyAverages: { month: string; score: number }[];
}

const DOMAIN_COLORS: Record<string, string> = {
  COMMUNICATION: '#7B9FD4',
  SOCIAL: '#E8A87C',
  MOTOR: '#9B8EC4',
  COGNITIVE: '#7EC8C8',
  EMOTIONAL: '#F2B880',
  DAILY_LIVING: '#94B8A0',
  OTHER: '#C4B5A0',
};

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
  OTHER: '기타',
};

@Injectable()
export class GrowthService {
  constructor(private prisma: PrismaService) {}

  async getGrowthData(childId: string, userId: string, days: number = 30): Promise<GrowthData> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    }

    await this.verifyFamilyMember(child.familyId, userId);

    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        childId,
        completedAt: { not: null },
        createdAt: { gte: fromDate },
      },
      include: { scores: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group scores by domain and date
    const domainDateMap = new Map<string, Map<string, { scores: number[]; assessmentId: string }>>();
    const overallDateMap = new Map<string, { scores: number[]; assessmentId: string }>();

    for (const assessment of assessments) {
      const dateKey = assessment.createdAt.toISOString().split('T')[0];

      for (const score of assessment.scores) {
        // Domain-level grouping
        if (!domainDateMap.has(score.domain)) {
          domainDateMap.set(score.domain, new Map());
        }
        const dateMap = domainDateMap.get(score.domain)!;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { scores: [], assessmentId: assessment.id });
        }
        dateMap.get(dateKey)!.scores.push(score.score);

        // Overall grouping
        if (!overallDateMap.has(dateKey)) {
          overallDateMap.set(dateKey, { scores: [], assessmentId: assessment.id });
        }
        overallDateMap.get(dateKey)!.scores.push(score.score);
      }
    }

    // Build domain time series
    const domains: DomainTimeSeries[] = Array.from(domainDateMap.entries()).map(([domain, dateMap]) => ({
      domain,
      label: DOMAIN_LABELS[domain] || domain,
      color: DOMAIN_COLORS[domain] || DOMAIN_COLORS.OTHER,
      data: Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { scores, assessmentId }]) => ({
          date,
          score: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100,
          assessmentId,
        })),
    }));

    // Build overall time series
    const overall: TimeSeriesPoint[] = Array.from(overallDateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { scores, assessmentId }]) => ({
        date,
        score: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100,
        assessmentId,
      }));

    // Calculate weekly averages
    const weeklyAverages = this.calculateWeeklyAverages(overall);

    // Calculate monthly averages
    const monthlyAverages = this.calculateMonthlyAverages(overall);

    return {
      childId,
      dateRange: {
        from: fromDate.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      domains,
      overall,
      weeklyAverages,
      monthlyAverages,
    };
  }

  private calculateWeeklyAverages(overall: TimeSeriesPoint[]): { week: string; score: number }[] {
    if (overall.length === 0) return [];

    const weekMap = new Map<string, number[]>();

    for (const point of overall) {
      const date = new Date(point.date);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(point.score);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, scores]) => ({
        week,
        score: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100,
      }));
  }

  private calculateMonthlyAverages(overall: TimeSeriesPoint[]): { month: string; score: number }[] {
    if (overall.length === 0) return [];

    const monthMap = new Map<string, number[]>();

    for (const point of overall) {
      const monthKey = point.date.substring(0, 7); // YYYY-MM

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(point.score);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, scores]) => ({
        month,
        score: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100,
      }));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
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
