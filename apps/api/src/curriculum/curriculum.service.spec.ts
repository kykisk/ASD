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
  sensoryProfile: {
    findFirst: vi.fn(),
  },
  clinicalReport: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  sessionFeedback: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  activityLog: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  strategyTrial: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  concern: {
    findMany: vi.fn().mockResolvedValue([]),
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

const mockNotificationTrigger = {
  triggerCurriculumReady: vi.fn().mockResolvedValue(undefined),
};

const mockSessionFeedbacksService = {
  buildPromptSummary: vi.fn().mockResolvedValue(null),
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
        { provide: 'NotificationTriggerService', useValue: mockNotificationTrigger },
      ],
    }).compile();

    service = module.get<CurriculumService>(CurriculumService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'aiService', { value: mockAiService });
    Object.defineProperty(service, 'promptService', { value: new CurriculumPromptService() });
    Object.defineProperty(service, 'domainAggregation', { value: mockDomainAggregation });
    Object.defineProperty(service, 'encryptionService', { value: mockEncryptionService });
    Object.defineProperty(service, 'notificationTrigger', { value: mockNotificationTrigger });
    Object.defineProperty(service, 'sessionFeedbacksService', {
      value: mockSessionFeedbacksService,
    });
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
      mockPrismaService.sensoryProfile.findFirst.mockResolvedValue(null);
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

    it('should pass recent activity logs (latest per activity) into the AI prompt', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockPrismaService.sensoryProfile.findFirst.mockResolvedValue(null);
      const prevCurriculum = {
        date: new Date('2026-05-19T00:00:00.000Z'),
        activities: [{ domain: 'COMMUNICATION' }, { domain: 'motor' }],
      };
      mockPrismaService.activityLog.findMany.mockResolvedValueOnce([
        {
          curriculumId: 'c-1',
          activityIndex: 0,
          activityTitle: '간식 고르기',
          result: 'SUCCESS',
          notes: '두 번 가리킴',
          curriculum: prevCurriculum,
        },
        {
          curriculumId: 'c-1',
          activityIndex: 0,
          activityTitle: '간식 고르기',
          result: 'FAILED',
          notes: null,
          curriculum: prevCurriculum,
        },
        {
          curriculumId: 'c-1',
          activityIndex: 1,
          activityTitle: '빨래집게',
          result: 'SKIPPED',
          notes: null,
          curriculum: prevCurriculum,
        },
      ]);
      mockAiService.generateStructured.mockResolvedValue({
        weeklyGoal: '의사소통 능력 향상',
        activities: mockCurriculumRecord.activities,
        notes: '참고사항',
      });
      mockPrismaService.curriculum.create.mockResolvedValue(mockCurriculumRecord);

      await service.generateForChild('child-1', 'user-1', '2026-05-20');

      const prompt = mockAiService.generateStructured.mock.calls.at(-1)[0].messages[1].content;
      expect(prompt).toContain('총 2건');
      expect(prompt).toContain('05-19 [의사소통] 간식 고르기: 성공 / 부모 메모: 두 번 가리킴');
      expect(prompt).toContain('05-19 [운동] 빨래집게: 건너뜀');
      expect(prompt).not.toContain('간식 고르기: 어려움');
    });

    it('should mark as FAILED on AI error', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockPrismaService.sensoryProfile.findFirst.mockResolvedValue(null);
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

    it('should look up today by Korean date, not the UTC date', async () => {
      vi.useFakeTimers();
      // 2026-10-20 18:00 UTC = 2026-10-21 03:00 KST
      vi.setSystemTime(new Date('2026-10-20T18:00:00.000Z'));
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.findFirst.mockResolvedValue(null);

      await service.getTodayCurriculum('child-1', 'user-1');

      expect(mockPrismaService.curriculum.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-10-21T00:00:00.000Z'),
              lte: new Date('2026-10-21T23:59:59.999Z'),
            },
          }),
        }),
      );
      vi.useRealTimers();
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
      mockPrismaService.sensoryProfile.findFirst.mockResolvedValue(null);
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

    it('should refuse when activities were already logged (would delete the logs)', async () => {
      mockPrismaService.curriculum.findUnique.mockResolvedValue(mockCurriculumRecord);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.curriculum.delete.mockClear();
      mockPrismaService.activityLog.count.mockResolvedValueOnce(2);

      await expect(service.regenerateCurriculum('curr-1', 'user-1')).rejects.toThrow(
        '이미 기록한 활동이 있어',
      );
      expect(mockPrismaService.curriculum.delete).not.toHaveBeenCalled();
    });
  });
});
