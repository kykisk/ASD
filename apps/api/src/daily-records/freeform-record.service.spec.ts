import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaService } from '@auticare/prisma-client';
import { FreeformRecordService } from './freeform-record.service.js';
import type { DailyRecordsService } from './daily-records.service.js';
import type { AIService } from '../ai/ai.service.js';
import type { SessionFeedbacksService } from '../session-feedbacks/session-feedbacks.service.js';
import type { FeedbackDomainExtractionService } from '../session-feedbacks/feedback-domain-extraction.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';

const prisma = {
  dailyRecordEntry: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};
const ai = { generateStructured: vi.fn(), availability: vi.fn() };
const dailyRecords = {
  verifyAccess: vi.fn(),
  latestDailyAssessment: vi.fn(),
  persist: vi.fn(),
  findByDate: vi.fn(),
};
const sessionFeedbacks = { create: vi.fn() };
const extraction = { extractNow: vi.fn() };

const TEXT = "언어치료에서 '물 주세요'를 처음 혼자 했대요. 저녁에 마트에서 바닥에 누워 울었어요.";

describe('FreeformRecordService', () => {
  let service: FreeformRecordService;

  beforeEach(() => {
    vi.clearAllMocks();
    dailyRecords.verifyAccess.mockResolvedValue('fam-1');
    dailyRecords.latestDailyAssessment.mockResolvedValue(null);
    dailyRecords.findByDate.mockResolvedValue({ date: '2026-10-25' });
    prisma.dailyRecordEntry.create.mockResolvedValue({ id: 'e-1' });
    service = new FreeformRecordService(
      prisma as unknown as PrismaService,
      ai as unknown as AIService,
      dailyRecords as unknown as DailyRecordsService,
      sessionFeedbacks as unknown as SessionFeedbacksService,
      extraction as unknown as FeedbackDomainExtractionService,
    );
  });

  it('turns the AI answer into a draft and keeps only answerable questions', async () => {
    ai.generateStructured.mockResolvedValue({
      scores: {
        COMMUNICATION: { score: 5, reason: "'물 주세요' 처음 혼자" },
        SOCIAL: { score: null, reason: '' },
        UNKNOWN: { score: 3, reason: 'x' },
      },
      note: null,
      sessions: [{ sessionType: '언어치료', therapistFeedback: "'물 주세요' 처음" }],
      behaviors: [
        { tags: ['멜트다운', '없는태그'], content: '마트에서 누워 울음', severity: null },
      ],
      questions: [
        { kind: 'SESSION_HOMEWORK', index: 0, question: '숙제가 있었나요?' },
        { kind: 'SESSION_HOMEWORK', index: 5, question: '없는 수업' },
        { kind: 'WHATEVER', question: '?' },
      ],
    });

    const result = await service.analyze('child-1', 'user-1', { text: TEXT, date: '2026-10-25' });

    expect(result.status).toBe('DRAFT');
    if (result.status !== 'DRAFT') return;
    expect(result.draft.scores).toEqual({
      COMMUNICATION: { score: 5, reason: "'물 주세요' 처음 혼자" },
    });
    // 모르는 수업 종류는 OTHER, 없는 태그는 버림
    expect(result.draft.sessions[0].sessionType).toBe('OTHER');
    expect(result.draft.behaviors[0].tags).toEqual(['멜트다운']);
    // 정도를 모르는 힘든 행동은 AI 가 안 물어도 첫 질문으로
    expect(result.questions.map((q) => q.kind)).toEqual(['BEHAVIOR_SEVERITY', 'SESSION_HOMEWORK']);
    expect(ai.generateStructured).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      'fam-1',
      'DAILY_RECORD_PARSE',
    );
  });

  it('saves the raw text as a daily note when AI fails', async () => {
    ai.generateStructured.mockRejectedValue(
      new ApiException(429, 'AI_002', '오늘의 AI 사용량이 소진됐어요'),
    );
    sessionFeedbacks.create.mockResolvedValue({ id: 'fb-1' });

    const result = await service.analyze('child-1', 'user-1', { text: TEXT, date: '2026-10-25' });

    expect(result.status).toBe('FAILED');
    expect(sessionFeedbacks.create).toHaveBeenCalledWith(
      'child-1',
      'fam-1',
      'user-1',
      expect.objectContaining({ feedbackType: 'DAILY_LOG', content: TEXT }),
      { extractDomains: false },
    );
    expect(prisma.dailyRecordEntry.update).toHaveBeenCalledWith({
      where: { id: 'e-1' },
      data: expect.objectContaining({ status: 'FAILED', feedbackId: 'fb-1' }),
    });
  });

  it('applies answers, merges into the day and records whether the parent edited', async () => {
    prisma.dailyRecordEntry.findUnique.mockResolvedValue({
      id: 'e-1',
      childId: 'child-1',
      mode: 'FREEFORM',
      status: 'DRAFT',
      date: '2026-10-25',
      draft: {
        scores: { COMMUNICATION: { score: 5, reason: '' } },
        note: null,
        sessions: [{ sessionType: 'SPEECH', therapistFeedback: '요청하기 성공' }],
        behaviors: [{ tags: ['멜트다운'], content: '마트에서 울음', severity: null }],
      },
      questions: [
        { kind: 'BEHAVIOR_SEVERITY', index: 0, question: '', answer: 'scale' },
        { kind: 'SESSION_HOMEWORK', index: 0, question: '', answer: 'text' },
      ],
    });

    await service.confirm('child-1', 'user-1', 'e-1', {
      scores: { COMMUNICATION: 4 },
      sessions: [{ sessionType: 'SPEECH', therapistFeedback: '요청하기 성공' }],
      behaviors: [{ tags: ['멜트다운'], content: '마트에서 울음', severity: null }],
      answers: [
        { index: 0, value: 3 },
        { index: 1, value: "'더' 말하기 연습" },
      ],
    });

    expect(dailyRecords.persist).toHaveBeenCalledWith(
      'child-1',
      'fam-1',
      'user-1',
      '2026-10-25',
      {
        scores: { COMMUNICATION: 4 },
        note: undefined,
        sessions: [
          { sessionType: 'SPEECH', therapistFeedback: "요청하기 성공 / 집에서: '더' 말하기 연습" },
        ],
        behaviors: [{ tags: ['멜트다운'], content: '마트에서 울음', severity: 3 }],
      },
      { mergeScores: true },
    );
    expect(prisma.dailyRecordEntry.update).toHaveBeenCalledWith({
      where: { id: 'e-1' },
      data: expect.objectContaining({ status: 'SAVED', edited: true, answeredCount: 2 }),
    });
  });

  it('refuses to save the same draft twice', async () => {
    prisma.dailyRecordEntry.findUnique.mockResolvedValue({
      id: 'e-1',
      childId: 'child-1',
      mode: 'FREEFORM',
      status: 'SAVED',
    });
    await expect(
      service.confirm('child-1', 'user-1', 'e-1', {
        scores: {},
        sessions: [],
        behaviors: [],
        answers: [],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('retries failed entries and marks them recovered', async () => {
    prisma.dailyRecordEntry.findMany.mockResolvedValue([
      { id: 'e-1', feedbackId: 'fb-1' },
      { id: 'e-2', feedbackId: 'fb-2' },
    ]);
    extraction.extractNow
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('budget'));

    const outcome = await service.retryFailed();

    expect(outcome).toMatchObject({ total: 2, processed: 1, failed: 1 });
    expect(prisma.dailyRecordEntry.update).toHaveBeenCalledTimes(1);
  });
});
