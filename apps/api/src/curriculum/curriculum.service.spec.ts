import { Test, TestingModule } from '@nestjs/testing';
import { CurriculumService } from './curriculum.service';
import { CurriculumPromptService } from './curriculum-prompt.service';

const mockCurriculumRecord = {
  id: 'curr-1',
  childId: 'child-1',
  familyId: 'family-1',
  date: new Date('2026-05-20T00:00:00.000Z'),
  status: 'GENERATED',
  aiProvider: null,
  promptVersion: 'v1',
  rawAiOutput: null,
  weeklyGoal: '의사소통 능력 향상',
  activities: [
    {
      title: '그림 카드 놀이',
      domain: 'COMMUNICATION',
      durationMin: 15,
      description: '그림 카드를 사용한 단어 연습',
      materials: ['그림 카드'],
      steps: ['카드 준비', '아이에게 보여주기', '따라 말하기'],
      successCriteria: '3개 이상 단어 따라 말하기',
      difficultyLevel: 'EASY',
    },
  ],
  notes: '아이가 피곤할 때는 쉬어주세요',
  generatedAt: new Date(),
  confirmedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  child: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  familyMember: {
    findUnique: vi.fn(),
  },
  curriculum: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  assessment: {
    findMany: vi.fn(),
  },
};

const mockAiService = {
  generateStructured: vi.fn(),
};

const mockEncryptionService = {
  decryptPii: vi.fn(),
};

const mockDomainAggregation = {
  aggregate: vi.fn(),
};

const defaultAggregationResult = {
  overallScore: 3.2,
  domains: [
    {
      domain: 'COMMUNICATION',
      label: '의사소통',
      currentScore: 3.5,
      maxScore: 5,
      percentage: 70,
      trend: { direction: 'up', slope: 0.1, confidence: 0.8 },
      itemCount: 5,
    },
  ],
  assessmentCount: 3,
  lastAssessedAt: new Date(),
};

const mockChild = {
  id: 'child-1',
  familyId: 'family-1',
  nameEnc: 'enc',
  encIv: 'iv',
  encAuthTag: 'tag',
  encSalt: 'salt',
  encVersion: 1,
  gender: 'MALE',
  diagnosisName: null,
  diagnosisDate: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMembership = {
  id: 'member-1',
  userId: 'user-1',
  familyId: 'family-1',
  role: 'FAMILY_ADMIN',
  joinedAt: new Date(),
};

describe('CurriculumService', () => {
  let service: CurriculumService;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockEncryptionService.decryptPii.mockResolvedValue({ name: '홍길동', birthDate: '2023-03-15' });
    mockDomainAggregation.aggregate.mockReturnValue(defaultAggregationResult);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumService,
        CurriculumPromptService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'AIService', useValue: mockAiService },
        { provide: 'DomainAggregationService', useValue: mockDomainAggregation },
        { provide: 'EncryptionService', useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<CurriculumService>(CurriculumService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'aiService', { value: mockAiService });
    Object.defineProperty(service, 'promptService', { value: new CurriculumPromptService() });
    Object.defineProperty(service, 'domainAggregation', { value: mockDomainAggregation });
    Object.defineProperty(service, 'encryptionService', { value: mockEncryptionService });
  });

  describe('generateForChild', () => {
    it('should return existing curriculum if already generated today', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst.mockResolvedValue(mockCurriculumRecord);

      const result = await service.generateForChild('child-1', 'user-1', '2026-05-20');

      expect(result).toEqual(mockCurriculumRecord);
      expect(mockAiService.generateStructured).not.toHaveBeenCalled();
    });

    it('should call AIService and save result', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockAiService.generateStructured.mockResolvedValue({
        weeklyGoal: '의사소통 능력 향상',
        activities: mockCurriculumRecord.activities,
        notes: '참고사항',
      });
      mockPrismaService.curriculum.create.mockResolvedValue(mockCurriculumRecord);

      const result = await service.generateForChild('child-1', 'user-1', '2026-05-20');

      expect(mockAiService.generateStructured).toHaveBeenCalled();
      expect(mockPrismaService.curriculum.create).toHaveBeenCalled();
      expect(result).toEqual(mockCurriculumRecord);
    });

    it('should mark as FAILED on AI error', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockAiService.generateStructured.mockRejectedValue(new Error('AI provider down'));
      mockPrismaService.curriculum.create.mockResolvedValue({
        ...mockCurriculumRecord,
        status: 'FAILED',
      });

      await expect(service.generateForChild('child-1', 'user-1', '2026-05-20')).rejects.toThrow(
        '커리큘럼 생성에 실패했습니다',
      );

      expect(mockPrismaService.curriculum.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('should throw if child not found', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(null);

      await expect(service.generateForChild('nonexistent', 'user-1')).rejects.toThrow(
        '아이를 찾을 수 없습니다',
      );
    });

    it('should throw if user is not a family member', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.generateForChild('child-1', 'user-2')).rejects.toThrow(
        '가족 구성원이 아닙니다',
      );
    });
  });

  describe('getTodayCurriculum', () => {
    it('should return null when none exists', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst.mockResolvedValue(null);

      const result = await service.getTodayCurriculum('child-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return existing curriculum for today', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst.mockResolvedValue(mockCurriculumRecord);

      const result = await service.getTodayCurriculum('child-1', 'user-1');

      expect(result).toEqual(mockCurriculumRecord);
    });
  });

  describe('confirmCurriculum', () => {
    it('should update status to CONFIRMED', async () => {
      mockPrismaService.curriculum.findUnique.mockResolvedValue(mockCurriculumRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.update.mockResolvedValue({
        ...mockCurriculumRecord,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });

      const result = await service.confirmCurriculum('curr-1', 'user-1');

      expect(result.status).toBe('CONFIRMED');
      expect(mockPrismaService.curriculum.update).toHaveBeenCalledWith({
        where: { id: 'curr-1' },
        data: { status: 'CONFIRMED', confirmedAt: expect.any(Date) },
      });
    });

    it('should throw if curriculum not found', async () => {
      mockPrismaService.curriculum.findUnique.mockResolvedValue(null);

      await expect(service.confirmCurriculum('nonexistent', 'user-1')).rejects.toThrow(
        '커리큘럼을 찾을 수 없습니다',
      );
    });
  });

  describe('getCurriculumHistory', () => {
    it('should return recent curricula', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findMany.mockResolvedValue([mockCurriculumRecord]);

      const result = await service.getCurriculumHistory('child-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('regenerateCurriculum', () => {
    it('should delete existing and generate new', async () => {
      mockPrismaService.curriculum.findUnique.mockResolvedValue(mockCurriculumRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.delete.mockResolvedValue(mockCurriculumRecord);
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.curriculum.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockAiService.generateStructured.mockResolvedValue({
        weeklyGoal: '새로운 목표',
        activities: mockCurriculumRecord.activities,
      });
      mockPrismaService.curriculum.create.mockResolvedValue({
        ...mockCurriculumRecord,
        weeklyGoal: '새로운 목표',
      });

      const result = await service.regenerateCurriculum('curr-1', 'user-1');

      expect(mockPrismaService.curriculum.delete).toHaveBeenCalledWith({ where: { id: 'curr-1' } });
      expect(result.weeklyGoal).toBe('새로운 목표');
    });
  });
});
