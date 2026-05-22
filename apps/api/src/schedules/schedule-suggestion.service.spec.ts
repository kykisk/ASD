import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleSuggestionService } from './schedule-suggestion.service';
import { AIService } from '../ai/ai.service';
import { DomainAggregationService } from '../assessments/domain-aggregation.service';
import { ApiException } from '../common/exceptions/api.exception';

const now = new Date('2024-06-01T00:00:00.000Z');

const mockPrismaService = {
  child: {
    findUnique: vi.fn(),
  },
  familyMember: {
    findUnique: vi.fn(),
  },
  schedule: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  assessment: {
    findMany: vi.fn(),
  },
};

const mockAIService = {
  generateStructured: vi.fn(),
};

const mockDomainAggregation = {
  aggregate: vi.fn(),
};

const mockChild = {
  id: 'child-1',
  familyId: 'family-1',
};

const mockMembership = {
  id: 'member-1',
  userId: 'user-1',
  familyId: 'family-1',
  role: 'FAMILY_ADMIN',
  joinedAt: now,
};

describe('ScheduleSuggestionService', () => {
  let service: ScheduleSuggestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleSuggestionService,
        { provide: 'AIService', useValue: mockAIService },
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'DomainAggregationService', useValue: mockDomainAggregation },
      ],
    }).compile();

    service = new ScheduleSuggestionService(
      mockAIService as any,
      mockPrismaService as any,
      mockDomainAggregation as any,
    );

    vi.clearAllMocks();
  });

  describe('getSuggestions', () => {
    it('should return suggestion schema', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.schedule.findMany.mockResolvedValue([
        {
          id: 's1',
          title: '치료',
          category: 'THERAPY',
          startTime: new Date('2024-06-01T09:00:00Z'),
          endTime: new Date('2024-06-01T10:00:00Z'),
        },
      ]);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockDomainAggregation.aggregate.mockReturnValue({
        overallScore: 0,
        domains: [],
        assessmentCount: 0,
        lastAssessedAt: null,
      });

      const expectedResult = {
        suggestions: [
          {
            type: 'ADD',
            title: '자유 놀이 시간',
            category: 'FREE_PLAY',
            reasoning: '자유 놀이가 부족합니다',
            suggestedTime: '15:00',
            suggestedDuration: 30,
          },
        ],
        summary: '스케줄 개선 제안입니다',
      };
      mockAIService.generateStructured.mockResolvedValue(expectedResult);

      const result = await service.getSuggestions('child-1', 'user-1');

      expect(result).toEqual(expectedResult);
      expect(mockAIService.generateStructured).toHaveBeenCalledTimes(1);
      expect(mockAIService.generateStructured).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        }),
        expect.any(Object),
        undefined,
        undefined,
        'SCHEDULE_SUGGEST',
      );
    });

    it('should handle empty schedule gracefully', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaService.schedule.findMany.mockResolvedValue([]);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);
      mockDomainAggregation.aggregate.mockReturnValue({
        overallScore: 0,
        domains: [],
        assessmentCount: 0,
        lastAssessedAt: null,
      });

      const expectedResult = {
        suggestions: [],
        summary: '현재 일정이 없어 기본 제안을 드립니다',
      };
      mockAIService.generateStructured.mockResolvedValue(expectedResult);

      const result = await service.getSuggestions('child-1', 'user-1');

      expect(result).toEqual(expectedResult);
      expect(mockAIService.generateStructured).toHaveBeenCalledTimes(1);
    });

    it('should throw 404 if child not found', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(null);

      await expect(service.getSuggestions('no-child', 'user-1'))
        .rejects.toThrow(ApiException);
    });
  });

  describe('acceptSuggestion', () => {
    it('should create schedule for ADD type', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);

      const createdSchedule = {
        id: 'new-schedule-1',
        childId: 'child-1',
        familyId: 'family-1',
        title: '자유 놀이 시간',
        category: 'FREE_PLAY',
        startTime: new Date('2024-06-10T15:00:00.000Z'),
        endTime: new Date('2024-06-10T15:30:00.000Z'),
        isAllDay: false,
        recurrenceType: 'NONE',
      };
      mockPrismaService.schedule.create.mockResolvedValue(createdSchedule);

      const suggestion = {
        type: 'ADD' as const,
        title: '자유 놀이 시간',
        category: 'FREE_PLAY' as const,
        reasoning: '자유 놀이가 부족합니다',
        suggestedTime: '15:00',
        suggestedDuration: 30,
      };

      const result = await service.acceptSuggestion(
        'child-1',
        'user-1',
        suggestion,
        '2024-06-10',
      );

      expect(result).toEqual(createdSchedule);
      expect(mockPrismaService.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          childId: 'child-1',
          familyId: 'family-1',
          title: '자유 놀이 시간',
          category: 'FREE_PLAY',
          isAllDay: false,
          recurrenceType: 'NONE',
        }),
      });
    });

    it('should return null for non-ADD types', async () => {
      mockPrismaService.child.findUnique.mockResolvedValue(mockChild);
      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMembership);

      const suggestion = {
        type: 'MODIFY' as const,
        title: '수정 제안',
        category: 'THERAPY' as const,
        reasoning: '시간 변경 필요',
      };

      const result = await service.acceptSuggestion(
        'child-1',
        'user-1',
        suggestion,
        '2024-06-10',
      );

      expect(result).toBeNull();
      expect(mockPrismaService.schedule.create).not.toHaveBeenCalled();
    });
  });
});
