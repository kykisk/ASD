import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaService } from '@auticare/prisma-client';
import { DailyRecordsService } from './daily-records.service.js';
import type { SessionFeedbacksService } from '../session-feedbacks/session-feedbacks.service.js';
import type { InsightsService } from '../insights/insights.service.js';

const prisma = {
  child: { findUnique: vi.fn() },
  familyMember: { findUnique: vi.fn() },
  questionnaire: { findFirst: vi.fn(), create: vi.fn() },
  assessment: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  sessionFeedback: { findMany: vi.fn() },
  curriculum: { findMany: vi.fn() },
};
const sessionFeedbacks = { create: vi.fn() };
const insights = { invalidateWeekly: vi.fn() };

const questionnaire = {
  id: 'q-1',
  items: [
    { id: 'i-dl', domain: 'DAILY_LIVING' },
    { id: 'i-co', domain: 'COMMUNICATION' },
    { id: 'i-cg', domain: 'COGNITIVE' },
    { id: 'i-so', domain: 'SOCIAL' },
    { id: 'i-mo', domain: 'MOTOR' },
  ],
};

describe('DailyRecordsService', () => {
  let service: DailyRecordsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.child.findUnique.mockResolvedValue({ id: 'child-1', familyId: 'fam-1' });
    prisma.familyMember.findUnique.mockResolvedValue({ userId: 'user-1', familyId: 'fam-1' });
    prisma.questionnaire.findFirst.mockResolvedValue(questionnaire);
    prisma.assessment.findFirst.mockResolvedValue(null);
    prisma.sessionFeedback.findMany.mockResolvedValue([]);
    service = new DailyRecordsService(
      prisma as unknown as PrismaService,
      sessionFeedbacks as unknown as SessionFeedbacksService,
      insights as unknown as InsightsService,
    );
  });

  it('saves domain scores as one daily assessment', async () => {
    await service.create('child-1', 'user-1', {
      date: '2026-10-21',
      scores: { COMMUNICATION: 4, SOCIAL: 2 },
    });

    const data = prisma.assessment.create.mock.calls[0][0].data;
    expect(data.questionnaireId).toBe('q-1');
    expect(data.totalScore).toBe(3);
    expect(data.scores.create).toEqual([
      { itemId: 'i-co', domain: 'COMMUNICATION', score: 4 },
      { itemId: 'i-so', domain: 'SOCIAL', score: 2 },
    ]);
    expect(sessionFeedbacks.create).not.toHaveBeenCalled();
    expect(insights.invalidateWeekly).toHaveBeenCalledWith('child-1');
  });

  it('skips AI domain extraction for the note when the parent already scored', async () => {
    await service.create('child-1', 'user-1', {
      date: '2026-10-21',
      scores: { MOTOR: 5 },
      note: '마트에서 처음으로 과자라고 말했어요',
    });

    expect(sessionFeedbacks.create).toHaveBeenCalledWith(
      'child-1',
      'fam-1',
      'user-1',
      expect.objectContaining({
        feedbackType: 'DAILY_LOG',
        sessionDate: '2026-10-21T00:00:00.000Z',
      }),
      { extractDomains: false },
    );
  });

  it('saves session and behavior entries as separate feedbacks', async () => {
    await service.create('child-1', 'user-1', {
      date: '2026-10-21',
      scores: {},
      session: { sessionType: 'SPEECH', therapistFeedback: '요구하기 2번 성공' },
      behavior: { severity: 4, tags: ['멜트다운'], content: '마트에서 20분 울음' },
    });

    const types = sessionFeedbacks.create.mock.calls.map((c) => c[3].feedbackType);
    expect(types).toEqual(['SESSION', 'BEHAVIORAL_ISSUE']);
    expect(sessionFeedbacks.create.mock.calls[1][3]).toMatchObject({
      severity: 4,
      behaviorTags: ['멜트다운'],
      rating: 2,
    });
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });

  it('groups the timeline by day, newest first, keeping the last check of a day', async () => {
    prisma.assessment.findMany.mockResolvedValue([
      // 2026-10-21 10:00 KST (최신) / 2026-10-21 09:00 KST / 2026-10-20 23:30 KST
      {
        createdAt: new Date('2026-10-21T01:00:00Z'),
        notes: '저녁',
        scores: [{ domain: 'MOTOR', score: 5 }],
      },
      {
        createdAt: new Date('2026-10-21T00:00:00Z'),
        notes: '아침',
        scores: [{ domain: 'MOTOR', score: 2 }],
      },
      {
        createdAt: new Date('2026-10-20T14:30:00Z'),
        notes: null,
        scores: [{ domain: 'SOCIAL', score: 3 }],
      },
    ]);
    prisma.sessionFeedback.findMany.mockResolvedValue([
      {
        id: 'f1',
        sessionDate: new Date('2026-10-19T00:00:00Z'),
        feedbackType: 'BEHAVIORAL_ISSUE',
        sessionType: 'BEHAVIOR',
        content: '마트에서 울음',
        severity: 3,
        behaviorTags: ['멜트다운'],
      },
    ]);
    prisma.curriculum.findMany.mockResolvedValue([
      {
        date: new Date('2026-10-21T00:00:00Z'),
        activities: [{}, {}, {}, {}],
        activityLogs: [{ activityIndex: 0 }, { activityIndex: 0 }, { activityIndex: 2 }],
      },
    ]);

    const days = await service.timeline('child-1', 'user-1', '2026-10-15', '2026-10-21');

    expect(days.map((d) => d.date)).toEqual(['2026-10-21', '2026-10-20', '2026-10-19']);
    expect(days[0]).toMatchObject({
      scores: { MOTOR: 5 },
      note: '저녁',
      activities: { done: 2, total: 4 },
    });
    expect(days[1].scores).toEqual({ SOCIAL: 3 });
    expect(days[2].feedbacks[0]).toMatchObject({ feedbackType: 'BEHAVIORAL_ISSUE', severity: 3 });
  });

  it('does not repeat a daily note that is also saved as a daily log', async () => {
    prisma.assessment.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-10-21T01:00:00Z'),
        notes: '처음 말했어요',
        scores: [{ domain: 'MOTOR', score: 4 }],
      },
    ]);
    prisma.sessionFeedback.findMany.mockResolvedValue([
      {
        id: 'f1',
        sessionDate: new Date('2026-10-21T00:00:00Z'),
        feedbackType: 'DAILY_LOG',
        sessionType: 'DAILY',
        content: '처음 말했어요',
        severity: null,
        behaviorTags: [],
      },
    ]);
    prisma.curriculum.findMany.mockResolvedValue([]);

    const [day] = await service.timeline('child-1', 'user-1', '2026-10-21', '2026-10-21');

    expect(day.note).toBeNull();
    expect(day.feedbacks).toHaveLength(1);
  });

  it('rejects malformed timeline dates', async () => {
    await expect(service.timeline('child-1', 'user-1', '10/15/2026')).rejects.toThrow('YYYY-MM-DD');
  });

  it('rejects users outside the child family', async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);

    await expect(service.create('child-1', 'user-2', { scores: { MOTOR: 3 } })).rejects.toThrow(
      '가족 구성원이 아닙니다',
    );
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });
});
