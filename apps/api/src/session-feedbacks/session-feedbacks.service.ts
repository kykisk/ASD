import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { FeedbackDomainExtractionService } from './feedback-domain-extraction.service.js';

export interface CreateSessionFeedbackInput {
  sessionDate: string;
  sessionType: string;
  therapistName?: string;
  institution?: string;
  durationMin?: number;
  scheduleId?: string;
  rating: number;
  content: string;
  progress?: string;
  challenges?: string;
  homeWork?: string;
  parentNote?: string;
  feedbackType?: string;
  severity?: number | null;
  behaviorTags?: string[];
}

export interface UpdateSessionFeedbackInput {
  sessionType?: string;
  therapistName?: string;
  institution?: string;
  durationMin?: number;
  scheduleId?: string;
  rating?: number;
  content?: string;
  progress?: string;
  challenges?: string;
  homeWork?: string;
  parentNote?: string;
}

export interface QuerySessionFeedbackInput {
  from?: string;
  to?: string;
  sessionType?: string;
  scheduleId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SessionFeedbacksService {
  private readonly logger = new Logger(SessionFeedbacksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainExtraction: FeedbackDomainExtractionService,
  ) {}

  async create(
    childId: string,
    familyId: string,
    userId: string,
    input: CreateSessionFeedbackInput,
  ) {
    if (input.rating < 1 || input.rating > 5) {
      throw new ApiException(400, 'FEEDBACK_001', '평가는 1~5 사이여야 합니다');
    }

    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');

    if (input.scheduleId) {
      const schedule = await this.prisma.schedule.findUnique({ where: { id: input.scheduleId } });
      if (!schedule) throw new ApiException(404, 'SCHEDULE_404', '일정을 찾을 수 없습니다');
    }

    const feedback = await this.prisma.sessionFeedback.create({
      data: {
        childId,
        familyId,
        userId,
        sessionDate: new Date(input.sessionDate),
        sessionType: input.sessionType,
        therapistName: input.therapistName ?? null,
        institution: input.institution ?? null,
        durationMin: input.durationMin ?? null,
        scheduleId: input.scheduleId ?? null,
        rating: input.rating,
        content: input.content,
        progress: input.progress ?? null,
        challenges: input.challenges ?? null,
        homeWork: input.homeWork ?? null,
        parentNote: input.parentNote ?? null,
        feedbackType: input.feedbackType ?? 'SESSION',
        severity: input.severity ?? null,
        behaviorTags: input.behaviorTags ?? [],
      },
      include: { schedule: { select: { id: true, title: true } } },
    });

    this.domainExtraction.extractAsync(feedback.id);

    return feedback;
  }

  async findByChild(childId: string, query: QuerySessionFeedbackInput) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { childId };
    if (query.sessionType) where['sessionType'] = query.sessionType;
    if (query.scheduleId) where['scheduleId'] = query.scheduleId;
    if (query.from || query.to) {
      where['sessionDate'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to + 'T23:59:59.999Z') } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.sessionFeedback.findMany({
        where,
        orderBy: { sessionDate: 'desc' },
        skip,
        take: limit,
        include: { schedule: { select: { id: true, title: true } } },
      }),
      this.prisma.sessionFeedback.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findRecent(childId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.sessionFeedback.findMany({
      where: { childId, sessionDate: { gte: since } },
      orderBy: { sessionDate: 'desc' },
      include: { schedule: { select: { id: true, title: true } } },
    });
  }

  async getStats(childId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const feedbacks = await this.prisma.sessionFeedback.findMany({
      where: { childId, sessionDate: { gte: thirtyDaysAgo } },
      orderBy: { sessionDate: 'asc' },
    });

    if (feedbacks.length === 0) {
      return { total: 0, avgRating: null, bySessionType: {}, recentCount: 0 };
    }

    // 수업 종류별 집계
    const bySessionType: Record<string, { count: number; avgRating: number; lastDate: string }> =
      {};
    for (const f of feedbacks) {
      const key = f.sessionType;
      if (!bySessionType[key]) {
        bySessionType[key] = { count: 0, avgRating: 0, lastDate: '' };
      }
      bySessionType[key].count++;
      bySessionType[key].avgRating += f.rating;
      bySessionType[key].lastDate = f.sessionDate.toISOString();
    }
    for (const key of Object.keys(bySessionType)) {
      bySessionType[key].avgRating =
        Math.round((bySessionType[key].avgRating / bySessionType[key].count) * 10) / 10;
    }

    const avgRating =
      Math.round((feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length) * 10) / 10;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = feedbacks.filter((f) => f.sessionDate >= sevenDaysAgo).length;

    return { total: feedbacks.length, avgRating, bySessionType, recentCount };
  }

  async getAutocomplete(childId: string) {
    // DISTINCT 값 조회 (최근 6개월 기준)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rows = await this.prisma.sessionFeedback.findMany({
      where: { childId, sessionDate: { gte: sixMonthsAgo } },
      select: { sessionType: true, therapistName: true, institution: true },
      orderBy: { sessionDate: 'desc' },
    });

    const sessionTypes = [...new Set(rows.map((r) => r.sessionType))];
    const therapistNames = [
      ...new Set(rows.map((r) => r.therapistName).filter(Boolean) as string[]),
    ];
    const institutions = [...new Set(rows.map((r) => r.institution).filter(Boolean) as string[])];

    return { sessionTypes, therapistNames, institutions };
  }

  async update(id: string, userId: string, input: UpdateSessionFeedbackInput) {
    const feedback = await this.prisma.sessionFeedback.findUnique({ where: { id } });
    if (!feedback) throw new ApiException(404, 'FEEDBACK_404', '피드백을 찾을 수 없습니다');
    if (feedback.userId !== userId)
      throw new ApiException(403, 'FEEDBACK_403', '본인이 작성한 피드백만 수정할 수 있습니다');

    if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
      throw new ApiException(400, 'FEEDBACK_001', '평가는 1~5 사이여야 합니다');
    }

    return this.prisma.sessionFeedback.update({
      where: { id },
      data: {
        ...(input.sessionType !== undefined && { sessionType: input.sessionType }),
        ...(input.therapistName !== undefined && { therapistName: input.therapistName }),
        ...(input.institution !== undefined && { institution: input.institution }),
        ...(input.durationMin !== undefined && { durationMin: input.durationMin }),
        ...(input.scheduleId !== undefined && { scheduleId: input.scheduleId }),
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.progress !== undefined && { progress: input.progress }),
        ...(input.challenges !== undefined && { challenges: input.challenges }),
        ...(input.homeWork !== undefined && { homeWork: input.homeWork }),
        ...(input.parentNote !== undefined && { parentNote: input.parentNote }),
      },
      include: { schedule: { select: { id: true, title: true } } },
    });
  }

  async remove(id: string, userId: string) {
    const feedback = await this.prisma.sessionFeedback.findUnique({ where: { id } });
    if (!feedback) throw new ApiException(404, 'FEEDBACK_404', '피드백을 찾을 수 없습니다');
    if (feedback.userId !== userId)
      throw new ApiException(403, 'FEEDBACK_403', '본인이 작성한 피드백만 삭제할 수 있습니다');

    await this.prisma.sessionFeedback.delete({ where: { id } });
  }

  /** 커리큘럼 프롬프트용: 최근 N일 피드백 요약 텍스트 반환 */
  async buildPromptSummary(childId: string, days = 7): Promise<string | null> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const feedbacks = await this.prisma.sessionFeedback.findMany({
      where: { childId, sessionDate: { gte: since } },
      orderBy: { sessionDate: 'desc' },
      take: 20,
    });

    if (feedbacks.length === 0) return null;

    // sessionType별 집계
    const grouped: Record<
      string,
      {
        count: number;
        totalRating: number;
        progress: string[];
        challenges: string[];
        homeWork: string[];
      }
    > = {};

    for (const f of feedbacks) {
      const key = f.sessionType;
      if (!grouped[key]) {
        grouped[key] = { count: 0, totalRating: 0, progress: [], challenges: [], homeWork: [] };
      }
      grouped[key].count++;
      grouped[key].totalRating += f.rating;
      if (f.progress) grouped[key].progress.push(f.progress.slice(0, 80));
      if (f.challenges) grouped[key].challenges.push(f.challenges.slice(0, 80));
      if (f.homeWork) grouped[key].homeWork.push(f.homeWork.slice(0, 60));
    }

    const lines: string[] = [];
    for (const [type, data] of Object.entries(grouped)) {
      const avg = Math.round((data.totalRating / data.count) * 10) / 10;
      const progressStr = data.progress.length
        ? `진전="${data.progress.slice(0, 2).join('; ')}"`
        : '';
      const challengeStr = data.challenges.length
        ? `과제="${data.challenges.slice(0, 2).join('; ')}"`
        : '';
      lines.push(
        `- ${type} (${data.count}회, ${avg}/5): ${[progressStr, challengeStr].filter(Boolean).join(', ')}`,
      );
    }

    const allHomeWork = Object.values(grouped)
      .flatMap((d) => d.homeWork)
      .slice(0, 3);
    if (allHomeWork.length) {
      lines.push(`[가정연습] ${allHomeWork.join(', ')}`);
    }

    return lines.join('\n');
  }
}
