import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaService } from '@auticare/prisma-client';
import { DailyRecordsService } from './daily-records.service.js';
import type { SessionFeedbacksService } from '../session-feedbacks/session-feedbacks.service.js';
import type { InsightsService } from '../insights/insights.service.js';

const prisma = {
  child: { findUnique: vi.fn() },
  familyMember: { findUnique: vi.fn() },
  questionnaire: { findFirst: vi.fn(), create: vi.fn() },
  assessment: { create: vi.fn(), findFirst: vi.fn() },
  sessionFeedback: { findMany: vi.fn() },
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

  it('rejects users outside the child family', async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);

    await expect(service.create('child-1', 'user-2', { scores: { MOTOR: 3 } })).rejects.toThrow(
      '가족 구성원이 아닙니다',
    );
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });
});
