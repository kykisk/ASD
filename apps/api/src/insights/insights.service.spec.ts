import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';

const mockAiService = {
  generateStructured: vi.fn(),
};

const mockPrismaService = {
  child: { findUnique: vi.fn() },
  familyMember: { findFirst: vi.fn(), findMany: vi.fn() },
  assessment: { findMany: vi.fn() },
  questionnaireItem: { findMany: vi.fn() },
};

const mockDomainAggregation = {
  aggregate: vi.fn(),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockNotificationTrigger = {
  triggerWeeklyInsightReady: vi.fn().mockResolvedValue(undefined),
};

describe('InsightsService', () => {
  let service: InsightsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: 'AIService', useValue: mockAiService },
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'DomainAggregationService', useValue: mockDomainAggregation },
        { provide: 'CacheService', useValue: mockCacheService },
        { provide: 'NotificationTriggerService', useValue: mockNotificationTrigger },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
    Object.defineProperty(service, 'aiService', { value: mockAiService });
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'domainAggregation', { value: mockDomainAggregation });
    Object.defineProperty(service, 'cacheService', { value: mockCacheService });
    Object.defineProperty(service, 'notificationTrigger', { value: mockNotificationTrigger });
  });

  describe('getWeeklyInsight', () => {
    const childId = 'child-1';
    const userId = 'user-1';

    beforeEach(() => {
      mockPrismaService.child.findUnique.mockResolvedValue({ familyId: 'family-1' });
      mockPrismaService.familyMember.findFirst.mockResolvedValue({ id: 'member-1' });
    });

    it('should return cached insight if available', async () => {
      const cachedInsight = {
        childId,
        weekKey: '2026-W21',
        summary: 'Great progress!',
        highlights: ['Improved communication'],
        concerns: [],
        recommendations: ['Continue speech exercises'],
        overallTrend: 'IMPROVING',
        generatedAt: '2026-05-20T00:00:00.000Z',
      };

      mockCacheService.get.mockResolvedValue(cachedInsight);

      const result = await service.getWeeklyInsight(childId, userId);

      expect(result).toEqual(cachedInsight);
      expect(mockAiService.generateStructured).not.toHaveBeenCalled();
    });

    it('should generate insight via AI when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.assessment.findMany.mockResolvedValue([
        {
          id: 'a-1',
          questionnaireId: 'q-1',
          createdAt: new Date(),
          scores: [{ domain: 'COMMUNICATION', score: 4, itemId: 'item-1' }],
        },
      ]);
      mockPrismaService.questionnaireItem.findMany.mockResolvedValue([
        { id: 'item-1', weight: 1.0 },
      ]);
      mockDomainAggregation.aggregate.mockReturnValue({
        overallScore: 4.0,
        domains: [
          {
            domain: 'COMMUNICATION',
            label: '의사소통',
            currentScore: 4,
            maxScore: 5,
            percentage: 80,
            trend: { direction: 'IMPROVING' },
            itemCount: 1,
          },
        ],
        assessmentCount: 1,
        lastAssessedAt: new Date(),
      });
      mockAiService.generateStructured.mockResolvedValue({
        summary: '의사소통 영역에서 좋은 발전',
        highlights: ['의사소통 능력 향상'],
        concerns: [],
        recommendations: ['대화 연습 지속'],
        overallTrend: 'IMPROVING',
      });

      const result = await service.getWeeklyInsight(childId, userId);

      expect(result.childId).toBe(childId);
      expect(result.summary).toBe('의사소통 영역에서 좋은 발전');
      expect(result.overallTrend).toBe('IMPROVING');
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockAiService.generateStructured).toHaveBeenCalled();
    });

    it('should throw 404 if child not found', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(null);

      await expect(service.getWeeklyInsight(childId, userId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'CHILD_404',
      });
    });

    it('should throw 403 if user has no access', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue({ familyId: 'family-1' });
      mockPrismaService.familyMember.findFirst.mockResolvedValue(null);

      await expect(service.getWeeklyInsight(childId, userId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'AI_004',
      });
    });
  });

  describe('getInsightHistory', () => {
    it('should return cached insights for past weeks', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue({ familyId: 'family-1' });
      mockPrismaService.familyMember.findFirst.mockResolvedValue({ id: 'member-1' });

      const mockInsight = {
        childId: 'child-1',
        weekKey: '2026-W21',
        summary: 'Good week',
        highlights: [],
        concerns: [],
        recommendations: [],
        overallTrend: 'STABLE',
        generatedAt: '2026-05-20T00:00:00.000Z',
      };

      mockCacheService.get
        .mockResolvedValueOnce(mockInsight)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockInsight);

      const result = await service.getInsightHistory('child-1', 'user-1', 3);

      expect(result).toHaveLength(2);
    });
  });
});
