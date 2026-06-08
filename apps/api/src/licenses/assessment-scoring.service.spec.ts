import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssessmentScoringService } from './assessment-scoring.service';
import { LicensedTool } from '@auticare/prisma-client';

const mockPrisma = {
  assessment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

function makeScores(domains: string[], score: number) {
  return domains.map((domain) => ({ domain, score }));
}

describe('AssessmentScoringService', () => {
  let service: AssessmentScoringService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessmentScoringService, { provide: 'PrismaService', useValue: mockPrisma }],
    }).compile();

    service = module.get<AssessmentScoringService>(AssessmentScoringService);
    Object.defineProperty(service, 'prisma', { value: mockPrisma });
  });

  describe('score - NotFoundException', () => {
    it('should throw NotFoundException if assessment not found', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue(null);
      await expect(service.score('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('M-CHAT-R/F scoring', () => {
    const buildMChatAssessment = (scores: Array<{ domain: string; score: number }>) => ({
      id: 'a-1',
      scores,
      questionnaire: { licensedTool: LicensedTool.M_CHAT_R_F },
    });

    beforeEach(() => {
      mockPrisma.assessment.update.mockResolvedValue({});
    });

    it('should return LOW_RISK for 2 or fewer fails', async () => {
      const scores = [
        ...makeScores(['SOCIAL', 'COMMUNICATION'], 4),
        ...makeScores(Array(18).fill('SOCIAL'), 2),
      ];
      mockPrisma.assessment.findUnique.mockResolvedValue(buildMChatAssessment(scores));

      const result = await service.score('a-1');
      expect(result.severity).toBe('LOW_RISK');
      expect(result.totalScore).toBe(2);
    });

    it('should return MEDIUM_RISK for 3-7 fails', async () => {
      const scores = [
        ...makeScores(Array(5).fill('SOCIAL'), 4),
        ...makeScores(Array(15).fill('SOCIAL'), 2),
      ];
      mockPrisma.assessment.findUnique.mockResolvedValue(buildMChatAssessment(scores));

      const result = await service.score('a-1');
      expect(result.severity).toBe('MEDIUM_RISK');
      expect(result.totalScore).toBe(5);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should return HIGH_RISK for 8+ fails', async () => {
      const scores = [
        ...makeScores(Array(10).fill('SOCIAL'), 4),
        ...makeScores(Array(10).fill('COMMUNICATION'), 2),
      ];
      mockPrisma.assessment.findUnique.mockResolvedValue(buildMChatAssessment(scores));

      const result = await service.score('a-1');
      expect(result.severity).toBe('HIGH_RISK');
      expect(result.totalScore).toBe(10);
      expect(result.clinicalDescription).toBeTruthy();
    });

    it('should include subscaleScores per domain', async () => {
      const scores = [
        { domain: 'SOCIAL', score: 4 },
        { domain: 'COMMUNICATION', score: 4 },
        { domain: 'COGNITIVE', score: 2 },
      ];
      mockPrisma.assessment.findUnique.mockResolvedValue(buildMChatAssessment(scores));

      const result = await service.score('a-1');
      expect(result.subscaleScores['SOCIAL']).toBe(1);
      expect(result.subscaleScores['COMMUNICATION']).toBe(1);
      expect(result.subscaleScores['COGNITIVE']).toBe(0);
    });
  });

  describe('CARS-2 scoring', () => {
    const buildCars2Assessment = (scores: Array<{ domain: string; score: number }>) => ({
      id: 'a-2',
      scores,
      questionnaire: { licensedTool: LicensedTool.CARS_2 },
    });

    beforeEach(() => {
      mockPrisma.assessment.update.mockResolvedValue({});
    });

    it('should return NON_AUTISTIC for total < 30', async () => {
      const scores = makeScores(Array(15).fill('SOCIAL'), 1);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildCars2Assessment(scores));

      const result = await service.score('a-2');
      expect(result.severity).toBe('NON_AUTISTIC');
      expect(result.totalScore).toBe(15);
    });

    it('should return MILD_MODERATE for 30-36', async () => {
      const scores = makeScores(Array(15).fill('SOCIAL'), 2);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildCars2Assessment(scores));

      const result = await service.score('a-2');
      expect(result.severity).toBe('MILD_MODERATE');
      expect(result.totalScore).toBe(30);
    });

    it('should return SEVERE for 37+', async () => {
      const scores = makeScores(Array(15).fill('SOCIAL'), 3);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildCars2Assessment(scores));

      const result = await service.score('a-2');
      expect(result.severity).toBe('SEVERE');
      expect(result.totalScore).toBe(45);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should cap score at 4 for values > 4', async () => {
      const scores = makeScores(Array(15).fill('SOCIAL'), 5);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildCars2Assessment(scores));

      const result = await service.score('a-2');
      expect(result.totalScore).toBe(60);
      expect(result.maxPossibleScore).toBe(60);
    });
  });

  describe('ABC scoring', () => {
    const buildAbcAssessment = (scores: Array<{ domain: string; score: number }>) => ({
      id: 'a-3',
      scores,
      questionnaire: { licensedTool: LicensedTool.ABC },
    });

    beforeEach(() => {
      mockPrisma.assessment.update.mockResolvedValue({});
    });

    it('should return WITHIN_RANGE when all subscales below threshold', async () => {
      const scores = makeScores(Array(10).fill('EMOTIONAL'), 1);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildAbcAssessment(scores));

      const result = await service.score('a-3');
      expect(result.severity).toBe('WITHIN_RANGE');
    });

    it('should return SIGNIFICANT when subscale exceeds 50% threshold', async () => {
      const scores = makeScores(Array(10).fill('EMOTIONAL'), 4);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildAbcAssessment(scores));

      const result = await service.score('a-3');
      expect(result.severity).toBe('SIGNIFICANT');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should map 1-5 scores to 0-3 range', async () => {
      const scores = [
        { domain: 'MOTOR', score: 1 },
        { domain: 'MOTOR', score: 5 },
      ];
      mockPrisma.assessment.findUnique.mockResolvedValue(buildAbcAssessment(scores));

      const result = await service.score('a-3');
      expect(result.subscaleScores['상동행동']).toBe(3);
    });

    it('should include subscaleInterpretations', async () => {
      const scores = makeScores(Array(5).fill('COMMUNICATION'), 3);
      mockPrisma.assessment.findUnique.mockResolvedValue(buildAbcAssessment(scores));

      const result = await service.score('a-3');
      expect(result.subscaleInterpretations).toHaveProperty('부적절한 언어');
    });
  });
});
