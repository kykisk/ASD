import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { DAILY_RECORD_DOMAINS, type CreateDailyRecordInput } from '@auticare/dto';
import { ApiException } from '../common/exceptions/api.exception.js';
import { SessionFeedbacksService } from '../session-feedbacks/session-feedbacks.service.js';
import { InsightsService } from '../insights/insights.service.js';

const DAILY_QUESTIONNAIRE_NAME = '일일 발달 체크';

const DOMAIN_LABELS: Record<(typeof DAILY_RECORD_DOMAINS)[number], string> = {
  DAILY_LIVING: '오늘 아이의 일상생활(식사·옷 입기·화장실)은 어땠나요?',
  COMMUNICATION: '오늘 아이의 의사소통은 어땠나요?',
  COGNITIVE: '오늘 아이의 인지(집중·이해)는 어땠나요?',
  SOCIAL: '오늘 아이의 사회성(눈맞춤·상호작용)은 어땠나요?',
  MOTOR: '오늘 아이의 운동(대근육·소근육)은 어땠나요?',
};

const KST_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function kstToday(): string {
  return KST_DATE_FORMAT.format(new Date());
}

type DailyRecordDomain = (typeof DAILY_RECORD_DOMAINS)[number];

export interface PersistRecord {
  scores: Partial<Record<DailyRecordDomain, number | undefined>>;
  note?: string;
  sessions: Array<{ sessionType: string; therapistFeedback?: string }>;
  behaviors: Array<{
    severity?: number | null;
    tags: string[];
    content: string;
    antecedent?: string | null;
    parentResponse?: string | null;
    settled?: string | null;
  }>;
}

export interface DailyRecordSummary {
  date: string;
  scores: Record<string, number> | null;
  note: string | null;
  feedbacks: Array<{ id: string; feedbackType: string; sessionType: string; content: string }>;
}

export interface DailyTimelineDay {
  date: string;
  /** 부모가 체크한 5개 영역 점수 */
  scores: Record<string, number> | null;
  note: string | null;
  feedbacks: Array<{
    id: string;
    feedbackType: string;
    sessionType: string;
    content: string;
    severity: number | null;
    behaviorTags: string[];
  }>;
  /** 그날 커리큘럼 활동 중 기록한 수 */
  activities: { done: number; total: number } | null;
  /** 쭉 적기로 남긴 원문 (AI 정리 결과는 위 점수 · 피드백에 들어 있음) */
  freeform: Array<{ id: string; rawText: string; status: string }>;
}

const MAX_TIMELINE_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * '오늘 하루 기록' — 5개 영역 점수, 일상 메모, 수업 피드백, 힘든 행동을 한 번에 저장.
 * 저장은 기존 모델(Assessment, SessionFeedback)을 그대로 써서 대시보드·성장·커리큘럼 AI 가 변경 없이 반영한다.
 */
@Injectable()
export class DailyRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionFeedbacks: SessionFeedbacksService,
    private readonly insights: InsightsService,
  ) {}

  async create(
    childId: string,
    userId: string,
    input: CreateDailyRecordInput,
  ): Promise<DailyRecordSummary> {
    const familyId = await this.verifyAccess(childId, userId);
    const date = input.date ?? kstToday();

    await this.persist(childId, familyId, userId, date, {
      scores: input.scores,
      note: input.note,
      sessions: input.session ? [input.session] : [],
      behaviors: input.behavior ? [input.behavior] : [],
    });
    // 쭉 적기와 비교하는 통계용 (원문 없음)
    await this.prisma.dailyRecordEntry.create({
      data: {
        childId,
        familyId,
        userId,
        date,
        mode: 'DETAILED',
        status: 'SAVED',
        savedAt: new Date(),
      },
    });

    return this.findByDate(childId, userId, date);
  }

  /**
   * 기록 저장 (자세히 입력 · 쭉 적기 공통).
   * mergeScores: 같은 날 이미 체크한 영역 점수는 남기고 새 점수로 덮어써 하루 기록을 하나로 합침
   */
  async persist(
    childId: string,
    familyId: string,
    userId: string,
    date: string,
    record: PersistRecord,
    options: { mergeScores?: boolean } = {},
  ): Promise<void> {
    const sessionDate = `${date}T00:00:00.000Z`;

    const scores: Partial<Record<DailyRecordDomain, number>> = {};
    if (options.mergeScores) {
      const previous = await this.latestDailyAssessment(childId, date);
      for (const s of previous?.scores ?? []) {
        if ((DAILY_RECORD_DOMAINS as readonly string[]).includes(s.domain)) {
          scores[s.domain as DailyRecordDomain] = s.score;
        }
      }
    }
    const newlyScored = DAILY_RECORD_DOMAINS.filter((d) => record.scores[d] !== undefined);
    for (const d of newlyScored) scores[d] = record.scores[d] as number;

    const scored = DAILY_RECORD_DOMAINS.flatMap((domain) => {
      const score = scores[domain];
      return score === undefined ? [] : [{ domain, score }];
    });
    const avg =
      scored.length > 0 ? scored.reduce((sum, s) => sum + s.score, 0) / scored.length : null;
    const rating = avg === null ? 3 : Math.round(avg);

    if (newlyScored.length > 0) {
      const questionnaire = await this.getOrCreateQuestionnaire(familyId, userId);
      const itemIds = new Map(questionnaire.items.map((item) => [item.domain, item.id]));
      // 지난 날짜 기록이면 그날 정오(KST)로 남겨 추이 계산이 그 날짜에 잡히도록 함
      const isToday = date === kstToday();
      await this.prisma.assessment.create({
        data: {
          childId,
          familyId,
          questionnaireId: questionnaire.id,
          frequency: 'DAILY',
          notes: record.note || null,
          totalScore: Math.round((avg as number) * 10) / 10,
          completedAt: new Date(),
          ...(isToday ? {} : { createdAt: new Date(`${date}T03:00:00.000Z`) }),
          scores: {
            create: scored.map((s) => ({
              itemId: itemIds.get(s.domain) as string,
              domain: s.domain,
              score: s.score,
            })),
          },
        },
      });
    }

    if (record.note) {
      // 부모가 직접 점수를 매긴 날은 같은 메모에서 AI 점수를 또 뽑지 않음 (이중 반영 방지)
      await this.sessionFeedbacks.create(
        childId,
        familyId,
        userId,
        {
          sessionDate,
          sessionType: 'DAILY',
          rating,
          content: record.note,
          feedbackType: 'DAILY_LOG',
        },
        { extractDomains: scored.length === 0 },
      );
    }

    for (const session of record.sessions) {
      await this.sessionFeedbacks.create(childId, familyId, userId, {
        sessionDate,
        sessionType: session.sessionType,
        rating,
        content: session.therapistFeedback || '수업 참여',
        feedbackType: 'SESSION',
      });
    }

    for (const behavior of record.behaviors) {
      await this.sessionFeedbacks.create(childId, familyId, userId, {
        sessionDate,
        sessionType: 'BEHAVIOR',
        rating: behavior.severity ? Math.max(1, 6 - behavior.severity) : 3,
        content: behavior.content,
        feedbackType: 'BEHAVIORAL_ISSUE',
        severity: behavior.severity ?? undefined,
        behaviorTags: behavior.tags,
        antecedent: behavior.antecedent,
        parentResponse: behavior.parentResponse,
        settled: behavior.settled,
      });
    }

    await this.insights.invalidateWeekly(childId);
  }

  /** 그날(KST) 마지막 '오늘 하루 기록' 점수 */
  async latestDailyAssessment(childId: string, date: string) {
    const kstStart = new Date(`${date}T00:00:00.000+09:00`);
    return this.prisma.assessment.findFirst({
      where: {
        childId,
        questionnaire: { name: DAILY_QUESTIONNAIRE_NAME },
        createdAt: { gte: kstStart, lt: new Date(kstStart.getTime() + DAY_MS) },
      },
      orderBy: { createdAt: 'desc' },
      include: { scores: true },
    });
  }

  async findByDate(childId: string, userId: string, date?: string): Promise<DailyRecordSummary> {
    await this.verifyAccess(childId, userId);
    const day = date ?? kstToday();
    const assessment = await this.latestDailyAssessment(childId, day);

    const feedbacks = await this.prisma.sessionFeedback.findMany({
      where: {
        childId,
        sessionDate: {
          gte: new Date(`${day}T00:00:00.000Z`),
          lte: new Date(`${day}T23:59:59.999Z`),
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, feedbackType: true, sessionType: true, content: true },
    });

    return {
      date: day,
      scores: assessment
        ? Object.fromEntries(assessment.scores.map((s) => [s.domain, s.score]))
        : null,
      note: assessment?.notes ?? null,
      feedbacks,
    };
  }

  /**
   * 기록 모아보기: 날짜별로 그날 점수·메모·수업 피드백·힘든 행동·활동 완료 수를 묶어 최신순으로.
   * 기록이 하나라도 있는 날만 돌려줌. 기본 최근 7일, 최대 92일.
   */
  async timeline(
    childId: string,
    userId: string,
    from?: string,
    to?: string,
  ): Promise<DailyTimelineDay[]> {
    await this.verifyAccess(childId, userId);
    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
      throw new ApiException(400, 'VALIDATION_001', '날짜는 YYYY-MM-DD 형식이어야 합니다');
    }

    const end = to ?? KST_DATE_FORMAT.format(new Date());
    const endMs = Date.parse(`${end}T00:00:00.000Z`);
    let startMs = from ? Date.parse(`${from}T00:00:00.000Z`) : endMs - 6 * DAY_MS;
    startMs = Math.max(startMs, endMs - (MAX_TIMELINE_DAYS - 1) * DAY_MS);
    const start = new Date(startMs).toISOString().slice(0, 10);

    const [assessments, feedbacks, curricula, entries] = await Promise.all([
      this.prisma.assessment.findMany({
        where: {
          childId,
          questionnaire: { name: DAILY_QUESTIONNAIRE_NAME },
          createdAt: {
            gte: new Date(`${start}T00:00:00.000+09:00`),
            lt: new Date(Date.parse(`${end}T00:00:00.000+09:00`) + DAY_MS),
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { scores: true },
      }),
      this.prisma.sessionFeedback.findMany({
        where: {
          childId,
          sessionDate: {
            gte: new Date(`${start}T00:00:00.000Z`),
            lte: new Date(`${end}T23:59:59.999Z`),
          },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          sessionDate: true,
          feedbackType: true,
          sessionType: true,
          content: true,
          severity: true,
          behaviorTags: true,
        },
      }),
      this.prisma.curriculum.findMany({
        where: {
          childId,
          status: { not: 'FAILED' },
          date: {
            gte: new Date(`${start}T00:00:00.000Z`),
            lte: new Date(`${end}T23:59:59.999Z`),
          },
        },
        select: {
          date: true,
          activities: true,
          activityLogs: { select: { activityIndex: true } },
        },
      }),
      this.prisma.dailyRecordEntry.findMany({
        where: {
          childId,
          mode: 'FREEFORM',
          status: { in: ['SAVED', 'FAILED', 'RECOVERED'] },
          date: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, date: true, rawText: true, status: true, feedbackId: true },
      }),
    ]);

    const days = new Map<string, DailyTimelineDay>();
    const day = (date: string): DailyTimelineDay => {
      let d = days.get(date);
      if (!d) {
        d = { date, scores: null, note: null, feedbacks: [], activities: null, freeform: [] };
        days.set(date, d);
      }
      return d;
    };

    // 최신순이므로 하루에 여러 번 체크했으면 마지막 체크만 남김
    for (const a of assessments) {
      const d = day(KST_DATE_FORMAT.format(a.createdAt));
      if (d.scores) continue;
      d.scores = Object.fromEntries(a.scores.map((s) => [s.domain, s.score]));
      d.note = a.notes;
    }
    for (const f of feedbacks) {
      const { sessionDate, ...rest } = f;
      day(sessionDate.toISOString().slice(0, 10)).feedbacks.push(rest);
    }
    for (const c of curricula) {
      const total = Array.isArray(c.activities) ? c.activities.length : 0;
      const done = new Set(c.activityLogs.map((l) => l.activityIndex)).size;
      day(c.date.toISOString().slice(0, 10)).activities = { done, total };
    }

    for (const e of entries) {
      // AI 정리에 실패한 원문은 일상 메모(피드백)로 이미 보이므로 빼고
      if (e.rawText && !e.feedbackId) {
        day(e.date).freeform.push({ id: e.id, rawText: e.rawText, status: e.status });
      }
    }

    // 오늘 하루 기록의 메모는 일상 기록(DAILY_LOG)으로도 저장되므로 한 번만 보여줌
    for (const d of days.values()) {
      if (
        d.note &&
        d.feedbacks.some((f) => f.feedbackType === 'DAILY_LOG' && f.content === d.note)
      ) {
        d.note = null;
      }
    }

    return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  /** 아이에 접근할 수 있는 가족 구성원인지 확인하고 familyId 반환 */
  async verifyAccess(childId: string, userId: string): Promise<string> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');

    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId: child.familyId } },
    });
    if (!membership) throw new ApiException(403, 'FORBIDDEN', '가족 구성원이 아닙니다');

    return child.familyId;
  }

  private async getOrCreateQuestionnaire(familyId: string, userId: string) {
    const existing = await this.prisma.questionnaire.findFirst({
      where: { familyId, name: DAILY_QUESTIONNAIRE_NAME, type: 'NON_LICENSED_USER_INPUT' },
      include: { items: true },
    });
    if (existing) return existing;

    return this.prisma.questionnaire.create({
      data: {
        familyId,
        name: DAILY_QUESTIONNAIRE_NAME,
        description: '오늘 하루 기록에서 부모가 체크한 5개 영역',
        type: 'NON_LICENSED_USER_INPUT',
        domains: [...DAILY_RECORD_DOMAINS],
        isActive: true,
        createdBy: userId,
        items: {
          create: DAILY_RECORD_DOMAINS.map((domain, idx) => ({
            domain,
            text: DOMAIN_LABELS[domain],
            orderIndex: idx,
          })),
        },
      },
      include: { items: true },
    });
  }
}
