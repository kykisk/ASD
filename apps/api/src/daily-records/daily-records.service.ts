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

export interface DailyRecordSummary {
  date: string;
  scores: Record<string, number> | null;
  note: string | null;
  feedbacks: Array<{ id: string; feedbackType: string; sessionType: string; content: string }>;
}

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
    const date = input.date ?? KST_DATE_FORMAT.format(new Date());
    const sessionDate = `${date}T00:00:00.000Z`;

    const scored = DAILY_RECORD_DOMAINS.flatMap((domain) => {
      const score = input.scores[domain];
      return score === undefined ? [] : [{ domain, score }];
    });
    const avg =
      scored.length > 0 ? scored.reduce((sum, s) => sum + s.score, 0) / scored.length : null;
    const rating = avg === null ? 3 : Math.round(avg);

    if (scored.length > 0) {
      const questionnaire = await this.getOrCreateQuestionnaire(familyId, userId);
      const itemIds = new Map(questionnaire.items.map((item) => [item.domain, item.id]));
      // 지난 날짜 기록이면 그날 정오(KST)로 남겨 추이 계산이 그 날짜에 잡히도록 함
      const isToday = date === KST_DATE_FORMAT.format(new Date());
      await this.prisma.assessment.create({
        data: {
          childId,
          familyId,
          questionnaireId: questionnaire.id,
          frequency: 'DAILY',
          notes: input.note || null,
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

    if (input.note) {
      // 부모가 직접 점수를 매긴 날은 같은 메모에서 AI 점수를 또 뽑지 않음 (이중 반영 방지)
      await this.sessionFeedbacks.create(
        childId,
        familyId,
        userId,
        {
          sessionDate,
          sessionType: 'DAILY',
          rating,
          content: input.note,
          feedbackType: 'DAILY_LOG',
        },
        { extractDomains: scored.length === 0 },
      );
    }

    if (input.session) {
      await this.sessionFeedbacks.create(childId, familyId, userId, {
        sessionDate,
        sessionType: input.session.sessionType,
        rating,
        content: input.session.therapistFeedback || '수업 참여',
        feedbackType: 'SESSION',
      });
    }

    if (input.behavior) {
      await this.sessionFeedbacks.create(childId, familyId, userId, {
        sessionDate,
        sessionType: 'BEHAVIOR',
        rating: Math.max(1, 6 - input.behavior.severity),
        content: input.behavior.content,
        feedbackType: 'BEHAVIORAL_ISSUE',
        severity: input.behavior.severity,
        behaviorTags: input.behavior.tags,
      });
    }

    await this.insights.invalidateWeekly(childId);

    return this.findByDate(childId, userId, date);
  }

  async findByDate(childId: string, userId: string, date?: string): Promise<DailyRecordSummary> {
    await this.verifyAccess(childId, userId);
    const day = date ?? KST_DATE_FORMAT.format(new Date());

    const kstStart = new Date(`${day}T00:00:00.000+09:00`);
    const kstEnd = new Date(kstStart.getTime() + 24 * 60 * 60 * 1000);
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        childId,
        questionnaire: { name: DAILY_QUESTIONNAIRE_NAME },
        createdAt: { gte: kstStart, lt: kstEnd },
      },
      orderBy: { createdAt: 'desc' },
      include: { scores: true },
    });

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

  private async verifyAccess(childId: string, userId: string): Promise<string> {
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
