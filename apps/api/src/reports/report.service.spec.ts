import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { DomainAggregationService } from '../assessments/domain-aggregation.service';
import { TrendService } from '../assessments/trend.service';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: {
    child: { findUnique: ReturnType<typeof vi.fn> };
    familyMember: { findUnique: ReturnType<typeof vi.fn> };
    assessment: { findMany: ReturnType<typeof vi.fn> };
    curriculum: { findMany: ReturnType<typeof vi.fn> };
  };
  let encryptionService: { decryptPii: ReturnType<typeof vi.fn> };

  const mockChild = {
    id: 'child-1',
    familyId: 'family-1',
    nameEnc: 'encrypted',
    encIv: 'iv',
    encAuthTag: 'tag',
    encSalt: 'salt',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      child: { findUnique: vi.fn().mockResolvedValue(mockChild) },
      familyMember: { findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', familyId: 'family-1' }) },
      assessment: { findMany: vi.fn().mockResolvedValue([]) },
      curriculum: { findMany: vi.fn().mockResolvedValue([]) },
    };

    encryptionService = {
      decryptPii: vi.fn().mockResolvedValue({ name: '김민준', birthDate: '2021-06-15' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryptionService },
        TrendService,
        DomainAggregationService,
      ],
    }).compile();

    service = module.get(ReportService);
    const trendService = module.get(TrendService);
    const domainAggregation = module.get(DomainAggregationService);
    Object.defineProperty(service, 'prisma', { value: prisma });
    Object.defineProperty(service, 'encryptionService', { value: encryptionService });
    Object.defineProperty(service, 'domainAggregation', { value: domainAggregation });
    Object.defineProperty(domainAggregation, 'trendService', { value: trendService });
  });

  describe('buildReportData', () => {
    it('should return correct shape with empty data', async () => {
      const data = await service.buildReportData('child-1', 2026, 5);

      expect(data.child.name).toBe('김민준');
      expect(data.child.birthDate).toBe('2021-06-15');
      expect(data.child.ageMonths).toBeGreaterThan(0);
      expect(data.period.year).toBe(2026);
      expect(data.period.month).toBe(5);
      expect(data.period.label).toBe('2026년 5월');
      expect(data.assessmentCount).toBe(0);
      expect(data.assessmentDates).toEqual([]);
      expect(data.curriculumCount).toBe(0);
      expect(data.curriculumCompletionRate).toBe(0);
      expect(data.domainScores).toEqual([]);
      expect(data.topStrengths).toEqual([]);
      expect(data.focusAreas).toEqual([]);
    });

    it('should handle assessments with scores', async () => {
      const mockAssessments = [
        {
          id: 'a1',
          childId: 'child-1',
          createdAt: new Date('2026-05-10'),
          completedAt: new Date('2026-05-10'),
          scores: [
            { itemId: 'item-1', domain: 'COMMUNICATION', score: 4 },
            { itemId: 'item-2', domain: 'SOCIAL', score: 3 },
          ],
        },
      ];
      prisma.assessment.findMany.mockResolvedValue(mockAssessments);

      const data = await service.buildReportData('child-1', 2026, 5);

      expect(data.assessmentCount).toBe(1);
      expect(data.domainScores.length).toBe(2);
      expect(data.domainScores[0]).toHaveProperty('domain');
      expect(data.domainScores[0]).toHaveProperty('label');
      expect(data.domainScores[0]).toHaveProperty('percentage');
      expect(data.domainScores[0]).toHaveProperty('trend');
    });
  });

  describe('buildHtmlTemplate', () => {
    it('should return HTML string containing child name', () => {
      const data = {
        child: { name: '김민준', birthDate: '2021-06-15', ageMonths: 59 },
        period: { year: 2026, month: 5, label: '2026년 5월' },
        domainScores: [
          { domain: 'COMMUNICATION', label: '의사소통', percentage: 80, trend: 'UP' },
        ],
        assessmentCount: 5,
        assessmentDates: ['2026-05-01', '2026-05-05'],
        curriculumCount: 10,
        curriculumCompletionRate: 70,
        topStrengths: ['의사소통'],
        focusAreas: ['사회성'],
      };

      const html = service.buildHtmlTemplate(data);

      expect(html).toContain('김민준');
      expect(html).toContain('2026년 5월');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('의사소통');
      expect(html).toContain('80%');
      expect(html).toContain('월간 성장 보고서');
    });
  });
});
