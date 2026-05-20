import { Test, TestingModule } from '@nestjs/testing';
import { GrowthService } from './growth.service';
import { PrismaService } from '@auticare/prisma-client';

describe('GrowthService', () => {
  let service: GrowthService;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  const mockChild = {
    id: 'child-1',
    familyId: 'family-1',
  };

  const mockMembership = { userId: 'user-1', familyId: 'family-1', role: 'FAMILY_ADMIN' };

  beforeEach(async () => {
    prisma = {
      child: { findUnique: vi.fn() },
      familyMember: { findUnique: vi.fn() },
      assessment: { findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrowthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GrowthService>(GrowthService);
    Object.defineProperty(service, 'prisma', { value: prisma });
  });

  it('should group scores by domain correctly', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findMany.mockResolvedValue([
      {
        id: 'a-1',
        createdAt: new Date('2024-03-01'),
        completedAt: new Date('2024-03-01'),
        scores: [
          { domain: 'COMMUNICATION', score: 4, assessmentId: 'a-1' },
          { domain: 'SOCIAL', score: 3, assessmentId: 'a-1' },
          { domain: 'COMMUNICATION', score: 5, assessmentId: 'a-1' },
        ],
      },
    ]);

    const result = await service.getGrowthData('child-1', 'user-1', 30);

    expect(result.domains).toHaveLength(2);
    const commDomain = result.domains.find((d) => d.domain === 'COMMUNICATION');
    expect(commDomain).toBeDefined();
    expect(commDomain!.label).toBe('의사소통');
    expect(commDomain!.color).toBe('#7B9FD4');
    expect(commDomain!.data[0].score).toBe(4.5);

    const socialDomain = result.domains.find((d) => d.domain === 'SOCIAL');
    expect(socialDomain).toBeDefined();
    expect(socialDomain!.data[0].score).toBe(3);
  });

  it('should calculate daily averages correctly', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findMany.mockResolvedValue([
      {
        id: 'a-1',
        createdAt: new Date('2024-03-01'),
        completedAt: new Date('2024-03-01'),
        scores: [
          { domain: 'COMMUNICATION', score: 4, assessmentId: 'a-1' },
          { domain: 'SOCIAL', score: 2, assessmentId: 'a-1' },
        ],
      },
      {
        id: 'a-2',
        createdAt: new Date('2024-03-01'),
        completedAt: new Date('2024-03-01'),
        scores: [
          { domain: 'COMMUNICATION', score: 5, assessmentId: 'a-2' },
          { domain: 'SOCIAL', score: 4, assessmentId: 'a-2' },
        ],
      },
    ]);

    const result = await service.getGrowthData('child-1', 'user-1', 30);

    expect(result.overall).toHaveLength(1);
    expect(result.overall[0].score).toBe(3.75);
    expect(result.overall[0].date).toBe('2024-03-01');
  });

  it('should calculate weekly aggregation with correct week boundaries', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findMany.mockResolvedValue([
      {
        id: 'a-1',
        createdAt: new Date('2024-03-04'),
        completedAt: new Date('2024-03-04'),
        scores: [{ domain: 'COMMUNICATION', score: 3, assessmentId: 'a-1' }],
      },
      {
        id: 'a-2',
        createdAt: new Date('2024-03-06'),
        completedAt: new Date('2024-03-06'),
        scores: [{ domain: 'COMMUNICATION', score: 5, assessmentId: 'a-2' }],
      },
      {
        id: 'a-3',
        createdAt: new Date('2024-03-11'),
        completedAt: new Date('2024-03-11'),
        scores: [{ domain: 'COMMUNICATION', score: 4, assessmentId: 'a-3' }],
      },
    ]);

    const result = await service.getGrowthData('child-1', 'user-1', 30);

    expect(result.weeklyAverages.length).toBeGreaterThanOrEqual(2);
    const firstWeek = result.weeklyAverages[0];
    expect(firstWeek.week).toBe('2024-03-04');
    expect(firstWeek.score).toBe(4);
  });

  it('should return empty arrays when no data exists', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findMany.mockResolvedValue([]);

    const result = await service.getGrowthData('child-1', 'user-1', 30);

    expect(result.childId).toBe('child-1');
    expect(result.domains).toHaveLength(0);
    expect(result.overall).toHaveLength(0);
    expect(result.weeklyAverages).toHaveLength(0);
    expect(result.monthlyAverages).toHaveLength(0);
    expect(result.dateRange.from).toBeDefined();
    expect(result.dateRange.to).toBeDefined();
  });

  it('should handle 90-day range correctly', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);

    const assessments = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 9);
      assessments.push({
        id: `a-${i}`,
        createdAt: date,
        completedAt: date,
        scores: [
          { domain: 'COMMUNICATION', score: 3 + (i % 3), assessmentId: `a-${i}` },
          { domain: 'MOTOR', score: 2 + (i % 4), assessmentId: `a-${i}` },
        ],
      });
    }
    prisma.assessment.findMany.mockResolvedValue(assessments);

    const result = await service.getGrowthData('child-1', 'user-1', 90);

    expect(result.domains.length).toBeGreaterThan(0);
    expect(result.overall.length).toBeGreaterThan(0);
    expect(result.monthlyAverages.length).toBeGreaterThanOrEqual(1);
  });

  it('should throw 404 if child not found', async () => {
    prisma.child.findUnique.mockResolvedValue(null);

    await expect(service.getGrowthData('nonexistent', 'user-1', 30))
      .rejects.toThrow();
  });

  it('should throw 403 if user is not family member', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(null);

    await expect(service.getGrowthData('child-1', 'user-2', 30))
      .rejects.toThrow();
  });
});
