import { Test, TestingModule } from '@nestjs/testing';
import { TrendService } from './trend.service';

describe('TrendService', () => {
  let service: TrendService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrendService],
    }).compile();

    service = module.get<TrendService>(TrendService);
  });

  describe('calculateTrend', () => {
    it('should return UP when current scores are higher than previous (+33%)', () => {
      const current = [4, 4, 4, 4, 4, 4];
      const previous = [3, 3, 3, 3, 3, 3];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('UP');
      expect(result.changePercent).toBeCloseTo(33.3, 0);
      expect(result.currentAvg).toBe(4);
      expect(result.previousAvg).toBe(3);
      expect(result.label).toBe('상승중');
    });

    it('should return DOWN when current scores are lower than previous (-50%)', () => {
      const current = [2, 2, 2, 2, 2, 2];
      const previous = [4, 4, 4, 4, 4, 4];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('DOWN');
      expect(result.changePercent).toBe(-50);
      expect(result.currentAvg).toBe(2);
      expect(result.previousAvg).toBe(4);
      expect(result.label).toBe('하락중');
    });

    it('should return STABLE when scores are the same (0%)', () => {
      const current = [3, 3, 3, 3, 3, 3];
      const previous = [3, 3, 3, 3, 3, 3];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('STABLE');
      expect(result.changePercent).toBe(0);
      expect(result.currentAvg).toBe(3);
      expect(result.previousAvg).toBe(3);
      expect(result.label).toBe('유지중');
    });

    it('should return STABLE at exactly +5% boundary', () => {
      // previousAvg = 20, currentAvg = 21 → +5% exactly
      const previous = [20];
      const current = [21];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('STABLE');
      expect(result.changePercent).toBe(5);
    });

    it('should return STABLE at exactly -5% boundary', () => {
      // previousAvg = 20, currentAvg = 19 → -5% exactly
      const previous = [20];
      const current = [19];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('STABLE');
      expect(result.changePercent).toBe(-5);
    });

    it('should return UP just above +5% boundary', () => {
      // previousAvg = 100, currentAvg = 105.1 → +5.1%
      const previous = [100];
      const current = [105.1];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('UP');
      expect(result.changePercent).toBe(5.1);
    });

    it('should return DOWN just below -5% boundary', () => {
      // previousAvg = 100, currentAvg = 94.9 → -5.1%
      const previous = [100];
      const current = [94.9];

      const result = service.calculateTrend(current, previous);

      expect(result.direction).toBe('DOWN');
      expect(result.changePercent).toBe(-5.1);
    });
  });

  describe('calculateTrendFromAssessments', () => {
    it('should return STABLE with null change when only 1 assessment', () => {
      const assessments = [
        { scores: [{ score: 4, domain: 'SOCIAL' }, { score: 3, domain: 'MOTOR' }] },
      ];

      const result = service.calculateTrendFromAssessments(assessments);

      expect(result.direction).toBe('STABLE');
      expect(result.changePercent).toBeNull();
      expect(result.currentAvg).toBe(3.5);
    });

    it('should return STABLE with null change when no assessments', () => {
      const result = service.calculateTrendFromAssessments([]);

      expect(result.direction).toBe('STABLE');
      expect(result.changePercent).toBeNull();
      expect(result.currentAvg).toBe(0);
    });

    it('should calculate trend comparing periods correctly', () => {
      // 8 assessments: first 4 (current) avg=4, last 4 (previous) avg=3
      const assessments = [
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }] },
      ];

      const result = service.calculateTrendFromAssessments(assessments, 4);

      expect(result.direction).toBe('UP');
      expect(result.changePercent).toBeCloseTo(33.3, 0);
    });

    it('should filter by domain when specified', () => {
      const assessments = [
        { scores: [{ score: 5, domain: 'SOCIAL' }, { score: 2, domain: 'MOTOR' }] },
        { scores: [{ score: 5, domain: 'SOCIAL' }, { score: 2, domain: 'MOTOR' }] },
        { scores: [{ score: 5, domain: 'SOCIAL' }, { score: 2, domain: 'MOTOR' }] },
        { scores: [{ score: 5, domain: 'SOCIAL' }, { score: 2, domain: 'MOTOR' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }, { score: 4, domain: 'MOTOR' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }, { score: 4, domain: 'MOTOR' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }, { score: 4, domain: 'MOTOR' }] },
        { scores: [{ score: 3, domain: 'SOCIAL' }, { score: 4, domain: 'MOTOR' }] },
      ];

      const socialResult = service.calculateTrendFromAssessments(assessments, 4, 'SOCIAL');
      expect(socialResult.direction).toBe('UP');

      const motorResult = service.calculateTrendFromAssessments(assessments, 4, 'MOTOR');
      expect(motorResult.direction).toBe('DOWN');
    });

    it('should return STABLE when not enough assessments for previous period', () => {
      const assessments = [
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
        { scores: [{ score: 4, domain: 'SOCIAL' }] },
      ];

      const result = service.calculateTrendFromAssessments(assessments, 4);

      expect(result.direction).toBe('STABLE');
      expect(result.changePercent).toBeNull();
    });
  });
});
