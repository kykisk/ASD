import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { TrendService } from '../assessments/trend.service';
import { CacheService } from '../common/cache/cache.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let encryptionService: { decryptPii: ReturnType<typeof vi.fn> };
  let cacheService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn>; delByPattern: ReturnType<typeof vi.fn> };
  let trendService: TrendService;

  const mockChild = {
    id: 'child-1',
    familyId: 'family-1',
    nameEnc: 'encrypted',
    encIv: 'iv',
    encAuthTag: 'tag',
    encSalt: 'salt',
    createdAt: new Date('2024-01-01'),
  };

  const mockMembership = { userId: 'user-1', familyId: 'family-1', role: 'FAMILY_ADMIN' };

  beforeEach(async () => {
    prisma = {
      child: { findUnique: vi.fn() },
      familyMember: { findUnique: vi.fn() },
      assessment: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
      schedule: { findMany: vi.fn() },
    };

    encryptionService = {
      decryptPii: vi.fn().mockResolvedValue({ name: '김민준', birthDate: '2021-06-15' }),
    };

    cacheService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      delByPattern: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryptionService },
        { provide: CacheService, useValue: cacheService },
        TrendService,
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    trendService = module.get<TrendService>(TrendService);
    Object.defineProperty(service, 'prisma', { value: prisma });
    Object.defineProperty(service, 'encryptionService', { value: encryptionService });
    Object.defineProperty(service, 'trendService', { value: trendService });
    Object.defineProperty(service, 'cacheService', { value: cacheService });
  });

  it('should return dashboard with all sections', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findFirst
      .mockResolvedValueOnce({ createdAt: new Date('2024-01-10') })
      .mockResolvedValueOnce({
        id: 'a-1',
        createdAt: new Date('2024-06-01'),
        completedAt: new Date('2024-06-01'),
        totalScore: 3.5,
        scores: [
          { domain: 'COMMUNICATION', score: 4 },
          { domain: 'SOCIAL', score: 3 },
        ],
      });
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'sched-1',
        title: '언어치료',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        category: 'THERAPY',
      },
    ]);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.assessment.count.mockResolvedValue(1);

    const result = await service.getDashboardData('child-1', 'user-1');

    expect(result.child.id).toBe('child-1');
    expect(result.child.name).toBe('김민준');
    expect(result.child.ageMonths).toBeGreaterThan(0);
    expect(result.today).toBeDefined();
    expect(result.today.schedules).toHaveLength(1);
    expect(result.recentAssessment).not.toBeNull();
    expect(result.recentAssessment!.domainScores).toHaveLength(2);
    expect(result.weeklyProgress).toBeDefined();
    expect(result.alerts).toBeDefined();
  });

  it('should filter today schedules to current day only', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findFirst.mockResolvedValue(null);
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'sched-1',
        title: '아침 치료',
        startTime: new Date(),
        endTime: new Date(Date.now() + 1800000),
        category: 'THERAPY',
      },
      {
        id: 'sched-2',
        title: '오후 교육',
        startTime: new Date(Date.now() + 7200000),
        endTime: new Date(Date.now() + 9000000),
        category: 'EDUCATION',
      },
      {
        id: 'sched-3',
        title: '저녁 놀이',
        startTime: new Date(Date.now() + 14400000),
        endTime: new Date(Date.now() + 16200000),
        category: 'FREE_PLAY',
      },
      {
        id: 'sched-4',
        title: '추가 일정',
        startTime: new Date(Date.now() + 21600000),
        endTime: new Date(Date.now() + 23400000),
        category: 'OTHER',
      },
    ]);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.assessment.count.mockResolvedValue(1);

    const result = await service.getDashboardData('child-1', 'user-1');

    expect(result.today.schedules).toHaveLength(3);
    expect(result.today.totalCount).toBe(4);
  });

  it('should calculate weeklyProgress correctly', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findFirst.mockResolvedValue(null);
    prisma.schedule.findMany.mockResolvedValue([]);

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    prisma.assessment.findMany.mockImplementation((args: { where?: { createdAt?: { gte?: Date } }; take?: number }) => {
      if (args?.take === 30) {
        return Promise.resolve([
          { createdAt: today },
          { createdAt: yesterday },
        ]);
      }
      return Promise.resolve([
        { id: 'a1', createdAt: today, completedAt: today },
        { id: 'a2', createdAt: yesterday, completedAt: yesterday },
      ]);
    });
    prisma.assessment.count.mockResolvedValue(2);

    const result = await service.getDashboardData('child-1', 'user-1');

    expect(result.weeklyProgress.assessmentCount).toBe(2);
    expect(result.weeklyProgress.completionRate).toBe(29);
    expect(result.weeklyProgress.streak).toBe(2);
  });

  it('should generate alert when no assessment in 3+ days', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findFirst.mockResolvedValue(null);
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'sched-1',
        title: '일정',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        category: 'THERAPY',
      },
    ]);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.assessment.count.mockResolvedValue(0);

    const result = await service.getDashboardData('child-1', 'user-1');

    const assessmentAlert = result.alerts.find((a) => a.type === 'ASSESSMENT_DUE');
    expect(assessmentAlert).toBeDefined();
    expect(assessmentAlert!.message).toBe('이번 주 평가가 없어요');
    expect(assessmentAlert!.severity).toBe('warning');
  });

  it('should handle new child with no data gracefully', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findFirst.mockResolvedValue(null);
    prisma.schedule.findMany.mockResolvedValue([]);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.assessment.count.mockResolvedValue(0);

    const result = await service.getDashboardData('child-1', 'user-1');

    expect(result.child.therapyDays).toBe(0);
    expect(result.today.schedules).toHaveLength(0);
    expect(result.today.completedCount).toBe(0);
    expect(result.today.totalCount).toBe(0);
    expect(result.recentAssessment).toBeNull();
    expect(result.weeklyProgress.assessmentCount).toBe(0);
    expect(result.weeklyProgress.streak).toBe(0);
    expect(result.alerts).toContainEqual(
      expect.objectContaining({ type: 'ASSESSMENT_DUE' }),
    );
    expect(result.alerts).toContainEqual(
      expect.objectContaining({ type: 'NO_SCHEDULE' }),
    );
  });

  it('should throw 404 if child not found', async () => {
    prisma.child.findUnique.mockResolvedValue(null);

    await expect(service.getDashboardData('nonexistent', 'user-1'))
      .rejects.toThrow();
  });

  it('should throw 403 if user is not family member', async () => {
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(null);

    await expect(service.getDashboardData('child-1', 'user-2'))
      .rejects.toThrow();
  });

  it('should return cached result on cache hit without calling DB', async () => {
    const cachedData = {
      child: { id: 'child-1', name: '김민준', ageMonths: 36, therapyDays: 100 },
      today: { schedules: [], completedCount: 0, totalCount: 0 },
      recentAssessment: null,
      weeklyProgress: { completionRate: 0, assessmentCount: 0, streak: 0 },
      alerts: [],
    };

    cacheService.get.mockResolvedValue(cachedData);

    const result = await service.getDashboardData('child-1', 'user-1');

    expect(result).toEqual(cachedData);
    expect(cacheService.get).toHaveBeenCalledWith('dashboard:child-1');
    expect(prisma.child.findUnique).not.toHaveBeenCalled();
  });

  it('should cache result on cache miss after fetching from DB', async () => {
    cacheService.get.mockResolvedValue(null);
    prisma.child.findUnique.mockResolvedValue(mockChild);
    prisma.familyMember.findUnique.mockResolvedValue(mockMembership);
    prisma.assessment.findFirst.mockResolvedValue(null);
    prisma.schedule.findMany.mockResolvedValue([]);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.assessment.count.mockResolvedValue(0);

    const result = await service.getDashboardData('child-1', 'user-1');

    expect(prisma.child.findUnique).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalledWith('dashboard:child-1', result, 120);
  });
});
