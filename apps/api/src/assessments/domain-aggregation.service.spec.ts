import { Test, TestingModule } from '@nestjs/testing';
import { DomainAggregationService } from './domain-aggregation.service';
import { TrendService } from './trend.service';

describe('DomainAggregationService', () => {
  let service: DomainAggregationService;
  let trendService: TrendService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainAggregationService, TrendService],
    }).compile();

    service = module.get<DomainAggregationService>(DomainAggregationService);
    trendService = module.get<TrendService>(TrendService);
    Object.defineProperty(service, 'trendService', { value: trendService });
  });

  describe('aggregate', () => {
    it('should calculate weighted average per domain', () => {
      const itemWeights = new Map([
        ['item-1', 2.0],
        ['item-2', 1.0],
        ['item-3', 1.0],
      ]);

      const assessments = [
        {
          id: 'a-1',
          createdAt: new Date('2024-01-10'),
          scores: [
            { domain: 'COMMUNICATION', score: 4, itemId: 'item-1' },
            { domain: 'COMMUNICATION', score: 2, itemId: 'item-2' },
            { domain: 'SOCIAL', score: 5, itemId: 'item-3' },
          ],
        },
      ];

      const result = service.aggregate(assessments, itemWeights);

      const commDomain = result.domains.find((d) => d.domain === 'COMMUNICATION');
      expect(commDomain).toBeDefined();
      expect(commDomain!.currentScore).toBeCloseTo(3.33, 1);
      expect(commDomain!.label).toBe('의사소통');
      expect(commDomain!.maxScore).toBe(5);
      expect(commDomain!.itemCount).toBe(2);

      const socialDomain = result.domains.find((d) => d.domain === 'SOCIAL');
      expect(socialDomain).toBeDefined();
      expect(socialDomain!.currentScore).toBe(5);
      expect(socialDomain!.label).toBe('사회성');
    });

    it('should group scores by domain correctly', () => {
      const itemWeights = new Map([
        ['item-1', 1.0],
        ['item-2', 1.0],
        ['item-3', 1.0],
        ['item-4', 1.0],
      ]);

      const assessments = [
        {
          id: 'a-1',
          createdAt: new Date('2024-01-10'),
          scores: [
            { domain: 'MOTOR', score: 3, itemId: 'item-1' },
            { domain: 'MOTOR', score: 5, itemId: 'item-2' },
            { domain: 'COGNITIVE', score: 4, itemId: 'item-3' },
            { domain: 'EMOTIONAL', score: 2, itemId: 'item-4' },
          ],
        },
      ];

      const result = service.aggregate(assessments, itemWeights);

      expect(result.domains).toHaveLength(3);
      const motorDomain = result.domains.find((d) => d.domain === 'MOTOR');
      expect(motorDomain!.currentScore).toBe(4);
      expect(motorDomain!.label).toBe('운동');
      expect(motorDomain!.itemCount).toBe(2);
    });

    it('should return empty result for no assessments', () => {
      const result = service.aggregate([], new Map());

      expect(result.overallScore).toBe(0);
      expect(result.domains).toHaveLength(0);
      expect(result.assessmentCount).toBe(0);
      expect(result.lastAssessedAt).toBeNull();
    });

    it('should calculate trend per domain', () => {
      const itemWeights = new Map([
        ['item-1', 1.0],
        ['item-2', 1.0],
      ]);

      const assessments = [
        { id: 'a-1', createdAt: new Date('2024-01-08'), scores: [{ domain: 'SOCIAL', score: 5, itemId: 'item-1' }] },
        { id: 'a-2', createdAt: new Date('2024-01-07'), scores: [{ domain: 'SOCIAL', score: 5, itemId: 'item-1' }] },
        { id: 'a-3', createdAt: new Date('2024-01-06'), scores: [{ domain: 'SOCIAL', score: 5, itemId: 'item-1' }] },
        { id: 'a-4', createdAt: new Date('2024-01-05'), scores: [{ domain: 'SOCIAL', score: 5, itemId: 'item-1' }] },
        { id: 'a-5', createdAt: new Date('2024-01-04'), scores: [{ domain: 'SOCIAL', score: 2, itemId: 'item-1' }] },
        { id: 'a-6', createdAt: new Date('2024-01-03'), scores: [{ domain: 'SOCIAL', score: 2, itemId: 'item-1' }] },
        { id: 'a-7', createdAt: new Date('2024-01-02'), scores: [{ domain: 'SOCIAL', score: 2, itemId: 'item-1' }] },
        { id: 'a-8', createdAt: new Date('2024-01-01'), scores: [{ domain: 'SOCIAL', score: 2, itemId: 'item-1' }] },
      ];

      const result = service.aggregate(assessments, itemWeights, 4);

      const socialDomain = result.domains.find((d) => d.domain === 'SOCIAL');
      expect(socialDomain!.trend.direction).toBe('UP');
      expect(socialDomain!.trend.changePercent).toBe(150);
    });

    it('should calculate overall weighted score', () => {
      const itemWeights = new Map([
        ['item-1', 2.0],
        ['item-2', 1.0],
      ]);

      const assessments = [
        {
          id: 'a-1',
          createdAt: new Date('2024-01-10'),
          scores: [
            { domain: 'COMMUNICATION', score: 5, itemId: 'item-1' },
            { domain: 'SOCIAL', score: 2, itemId: 'item-2' },
          ],
        },
      ];

      const result = service.aggregate(assessments, itemWeights);

      expect(result.overallScore).toBe(4);
      expect(result.assessmentCount).toBe(1);
      expect(result.lastAssessedAt).toEqual(new Date('2024-01-10'));
    });

    it('should use default weight of 1.0 for unknown items', () => {
      const itemWeights = new Map<string, number>();

      const assessments = [
        {
          id: 'a-1',
          createdAt: new Date('2024-01-10'),
          scores: [
            { domain: 'COMMUNICATION', score: 4, itemId: 'item-1' },
            { domain: 'COMMUNICATION', score: 2, itemId: 'item-2' },
          ],
        },
      ];

      const result = service.aggregate(assessments, itemWeights);

      const commDomain = result.domains.find((d) => d.domain === 'COMMUNICATION');
      expect(commDomain!.currentScore).toBe(3);
    });

    it('should calculate percentage correctly', () => {
      const itemWeights = new Map([['item-1', 1.0]]);

      const assessments = [
        {
          id: 'a-1',
          createdAt: new Date('2024-01-10'),
          scores: [{ domain: 'COGNITIVE', score: 4, itemId: 'item-1' }],
        },
      ];

      const result = service.aggregate(assessments, itemWeights);

      const cogDomain = result.domains.find((d) => d.domain === 'COGNITIVE');
      expect(cogDomain!.percentage).toBe(80);
      expect(cogDomain!.label).toBe('인지');
    });
  });
});
