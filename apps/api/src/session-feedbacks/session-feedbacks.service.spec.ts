import { Test, TestingModule } from '@nestjs/testing';
import { SessionFeedbacksService } from './session-feedbacks.service.js';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';

describe('SessionFeedbacksService', () => {
  let service: SessionFeedbacksService;
  let prisma: {
    child: { findUnique: ReturnType<typeof vi.fn> };
    schedule: { findUnique: ReturnType<typeof vi.fn> };
    sessionFeedback: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  const mockChild = { id: 'child-1', familyId: 'family-1' };
  const mockSchedule = { id: 'schedule-1', title: '언어치료' };

  const baseFeedback = {
    id: 'fb-1',
    childId: 'child-1',
    familyId: 'family-1',
    userId: 'user-1',
    sessionDate: new Date('2026-06-01'),
    sessionType: '언어치료',
    therapistName: '김선생',
    institution: 'ABC센터',
    durationMin: 50,
    scheduleId: 'schedule-1',
    rating: 4,
    content: '오늘 수업 잘 했어요',
    progress: '발음 좋아짐',
    challenges: '집중력 부족',
    homeWork: '매일 10분 읽기',
    parentNote: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    prisma = {
      child: { findUnique: vi.fn() },
      schedule: { findUnique: vi.fn() },
      sessionFeedback: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionFeedbacksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SessionFeedbacksService>(SessionFeedbacksService);
    Object.defineProperty(service, 'prisma', { value: prisma });
  });

  describe('create', () => {
    const input = {
      sessionDate: '2026-06-01',
      sessionType: '언어치료',
      therapistName: '김선생',
      institution: 'ABC센터',
      durationMin: 50,
      scheduleId: 'schedule-1',
      rating: 4,
      content: '오늘 수업 잘 했어요',
      progress: '발음 좋아짐',
      challenges: '집중력 부족',
      homeWork: '매일 10분 읽기',
    };

    it('should create feedback and return with schedule relation', async () => {
      prisma.child.findUnique.mockResolvedValue(mockChild);
      prisma.schedule.findUnique.mockResolvedValue(mockSchedule);
      prisma.sessionFeedback.create.mockResolvedValue({
        ...baseFeedback,
        schedule: { id: 'schedule-1', title: '언어치료' },
      });

      const result = await service.create('child-1', 'family-1', 'user-1', input);

      expect(result.schedule).toEqual({ id: 'schedule-1', title: '언어치료' });
      expect(prisma.sessionFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            childId: 'child-1',
            familyId: 'family-1',
            userId: 'user-1',
            rating: 4,
          }),
          include: { schedule: { select: { id: true, title: true } } },
        }),
      );
    });

    it('should throw 400 when rating is below 1', async () => {
      await expect(
        service.create('child-1', 'family-1', 'user-1', { ...input, rating: 0 }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'FEEDBACK_001' });
    });

    it('should throw 400 when rating is above 5', async () => {
      await expect(
        service.create('child-1', 'family-1', 'user-1', { ...input, rating: 6 }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'FEEDBACK_001' });
    });

    it('should throw 404 when child not found', async () => {
      prisma.child.findUnique.mockResolvedValue(null);

      await expect(service.create('child-1', 'family-1', 'user-1', input)).rejects.toMatchObject({
        statusCode: 404,
        code: 'CHILD_404',
      });
    });

    it('should throw 404 when scheduleId is invalid', async () => {
      prisma.child.findUnique.mockResolvedValue(mockChild);
      prisma.schedule.findUnique.mockResolvedValue(null);

      await expect(service.create('child-1', 'family-1', 'user-1', input)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SCHEDULE_404',
      });
    });
  });

  describe('findByChild', () => {
    it('should return paginated items with total', async () => {
      const items = [baseFeedback];
      prisma.sessionFeedback.findMany.mockResolvedValue(items);
      prisma.sessionFeedback.count.mockResolvedValue(1);

      const result = await service.findByChild('child-1', {});

      expect(result).toEqual({ items, total: 1, page: 1, limit: 20 });
      expect(prisma.sessionFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { childId: 'child-1' },
          orderBy: { sessionDate: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by sessionType', async () => {
      prisma.sessionFeedback.findMany.mockResolvedValue([]);
      prisma.sessionFeedback.count.mockResolvedValue(0);

      await service.findByChild('child-1', { sessionType: '작업치료' });

      expect(prisma.sessionFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { childId: 'child-1', sessionType: '작업치료' },
        }),
      );
    });

    it('should filter by date range (from/to)', async () => {
      prisma.sessionFeedback.findMany.mockResolvedValue([]);
      prisma.sessionFeedback.count.mockResolvedValue(0);

      await service.findByChild('child-1', {
        from: '2026-06-01',
        to: '2026-06-30',
      });

      expect(prisma.sessionFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            childId: 'child-1',
            sessionDate: {
              gte: new Date('2026-06-01'),
              lte: new Date('2026-06-30T23:59:59.999Z'),
            },
          },
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return correct avgRating and bySessionType counts', async () => {
      const feedbacks = [
        { ...baseFeedback, sessionType: '언어치료', rating: 4, sessionDate: new Date() },
        {
          ...baseFeedback,
          id: 'fb-2',
          sessionType: '언어치료',
          rating: 5,
          sessionDate: new Date(),
        },
        {
          ...baseFeedback,
          id: 'fb-3',
          sessionType: '작업치료',
          rating: 3,
          sessionDate: new Date(),
        },
      ];
      prisma.sessionFeedback.findMany.mockResolvedValue(feedbacks);

      const result = await service.getStats('child-1');

      expect(result.total).toBe(3);
      expect(result.avgRating).toBe(4);
      expect(result.bySessionType['언어치료'].count).toBe(2);
      expect(result.bySessionType['언어치료'].avgRating).toBe(4.5);
      expect(result.bySessionType['작업치료'].count).toBe(1);
      expect(result.bySessionType['작업치료'].avgRating).toBe(3);
    });

    it('should return null avgRating when no feedbacks', async () => {
      prisma.sessionFeedback.findMany.mockResolvedValue([]);

      const result = await service.getStats('child-1');

      expect(result).toEqual({ total: 0, avgRating: null, bySessionType: {}, recentCount: 0 });
    });
  });

  describe('getAutocomplete', () => {
    it('should return deduplicated sessionTypes, therapistNames, institutions', async () => {
      const rows = [
        { sessionType: '언어치료', therapistName: '김선생', institution: 'ABC센터' },
        { sessionType: '언어치료', therapistName: '김선생', institution: 'ABC센터' },
        { sessionType: '작업치료', therapistName: '박선생', institution: null },
        { sessionType: '미술치료', therapistName: null, institution: 'XYZ센터' },
      ];
      prisma.sessionFeedback.findMany.mockResolvedValue(rows);

      const result = await service.getAutocomplete('child-1');

      expect(result.sessionTypes).toEqual(['언어치료', '작업치료', '미술치료']);
      expect(result.therapistNames).toEqual(['김선생', '박선생']);
      expect(result.institutions).toEqual(['ABC센터', 'XYZ센터']);
    });
  });

  describe('update', () => {
    it('should update only provided fields', async () => {
      prisma.sessionFeedback.findUnique.mockResolvedValue(baseFeedback);
      prisma.sessionFeedback.update.mockResolvedValue({
        ...baseFeedback,
        rating: 5,
        content: '수정됨',
        schedule: null,
      });

      const result = await service.update('fb-1', 'user-1', { rating: 5, content: '수정됨' });

      expect(prisma.sessionFeedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fb-1' },
          data: { rating: 5, content: '수정됨' },
        }),
      );
      expect(result.rating).toBe(5);
    });

    it('should throw 404 when feedback not found', async () => {
      prisma.sessionFeedback.findUnique.mockResolvedValue(null);

      await expect(service.update('not-exist', 'user-1', { rating: 3 })).rejects.toMatchObject({
        statusCode: 404,
        code: 'FEEDBACK_404',
      });
    });

    it('should throw 403 when userId does not match', async () => {
      prisma.sessionFeedback.findUnique.mockResolvedValue(baseFeedback);

      await expect(service.update('fb-1', 'other-user', { rating: 3 })).rejects.toMatchObject({
        statusCode: 403,
        code: 'FEEDBACK_403',
      });
    });
  });

  describe('remove', () => {
    it('should delete feedback and return void', async () => {
      prisma.sessionFeedback.findUnique.mockResolvedValue(baseFeedback);
      prisma.sessionFeedback.delete.mockResolvedValue(baseFeedback);

      const result = await service.remove('fb-1', 'user-1');

      expect(result).toBeUndefined();
      expect(prisma.sessionFeedback.delete).toHaveBeenCalledWith({ where: { id: 'fb-1' } });
    });

    it('should throw 403 when userId does not match', async () => {
      prisma.sessionFeedback.findUnique.mockResolvedValue(baseFeedback);

      await expect(service.remove('fb-1', 'other-user')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FEEDBACK_403',
      });
    });
  });

  describe('buildPromptSummary', () => {
    it('should return null when no feedbacks', async () => {
      prisma.sessionFeedback.findMany.mockResolvedValue([]);

      const result = await service.buildPromptSummary('child-1');

      expect(result).toBeNull();
    });

    it('should return formatted string with grouped session types', async () => {
      const feedbacks = [
        {
          ...baseFeedback,
          sessionType: '언어치료',
          rating: 4,
          progress: '발음 개선',
          challenges: '집중력',
          homeWork: '읽기 연습',
        },
        {
          ...baseFeedback,
          id: 'fb-2',
          sessionType: '언어치료',
          rating: 5,
          progress: '어휘력 향상',
          challenges: null,
          homeWork: null,
        },
        {
          ...baseFeedback,
          id: 'fb-3',
          sessionType: '작업치료',
          rating: 3,
          progress: null,
          challenges: '소근육 약함',
          homeWork: '가위질',
        },
      ];
      prisma.sessionFeedback.findMany.mockResolvedValue(feedbacks);

      const result = await service.buildPromptSummary('child-1');

      expect(result).not.toBeNull();
      expect(result).toContain('언어치료');
      expect(result).toContain('2회');
      expect(result).toContain('4.5/5');
      expect(result).toContain('작업치료');
      expect(result).toContain('1회');
      expect(result).toContain('[가정연습]');
      expect(result).toContain('읽기 연습');
    });
  });
});
