import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireFilterService } from './questionnaire-filter.service';
import { filterResultSchema } from '../ai/schemas/questionnaire-filter.schema';

const mockAIService = {
  generateStructured: vi.fn(),
};

describe('QuestionnaireFilterService', () => {
  let service: QuestionnaireFilterService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnaireFilterService,
        { provide: 'AIService', useValue: mockAIService },
      ],
    }).compile();

    service = module.get<QuestionnaireFilterService>(QuestionnaireFilterService);
    Object.defineProperty(service, 'aiService', { value: mockAIService });
  });

  describe('filterItems', () => {
    it('should return LOW risk for safe items', async () => {
      const lowRiskResult = {
        overallRisk: 'LOW',
        items: [
          {
            originalIndex: 0,
            originalText: '아이가 좋아하는 놀이는 무엇인가요?',
            riskLevel: 'SAFE',
          },
          {
            originalIndex: 1,
            originalText: '하루 중 가장 활발한 시간대는 언제인가요?',
            riskLevel: 'SAFE',
          },
        ],
        summary: '모든 문항이 안전합니다. 라이선스 도구와의 유사성이 발견되지 않았습니다.',
      };

      mockAIService.generateStructured.mockResolvedValue(lowRiskResult);

      const items = [
        { text: '아이가 좋아하는 놀이는 무엇인가요?', domain: 'SOCIAL' },
        { text: '하루 중 가장 활발한 시간대는 언제인가요?', domain: 'DAILY_LIVING' },
      ];

      const result = await service.filterItems(items);

      expect(result.overallRisk).toBe('LOW');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].riskLevel).toBe('SAFE');
      expect(result.items[1].riskLevel).toBe('SAFE');
      expect(result.summary).toBeDefined();

      const parsed = filterResultSchema.parse(result);
      expect(parsed).toEqual(result);
    });

    it('should return HIGH risk for items similar to licensed tools', async () => {
      const highRiskResult = {
        overallRisk: 'HIGH',
        items: [
          {
            originalIndex: 0,
            originalText: '아이가 이름을 부르면 반응합니까?',
            riskLevel: 'HIGH_RISK',
            reason: 'M-CHAT-R/F 문항과 높은 유사도',
            suggestedRevision: '아이가 주변 소리에 어떻게 반응하나요?',
          },
          {
            originalIndex: 1,
            originalText: '다른 아이들에게 관심을 보입니까?',
            riskLevel: 'CAUTION',
            reason: 'M-CHAT-R/F 문항과 부분 유사',
            suggestedRevision: '또래 친구들과 어떤 방식으로 교류하나요?',
          },
        ],
        summary: '일부 문항이 라이선스 도구와 유사합니다. 수정이 필요합니다.',
      };

      mockAIService.generateStructured.mockResolvedValue(highRiskResult);

      const items = [
        { text: '아이가 이름을 부르면 반응합니까?', domain: 'COMMUNICATION' },
        { text: '다른 아이들에게 관심을 보입니까?', domain: 'SOCIAL' },
      ];

      const result = await service.filterItems(items);

      expect(result.overallRisk).toBe('HIGH');
      expect(result.items[0].riskLevel).toBe('HIGH_RISK');
      expect(result.items[0].suggestedRevision).toBeDefined();
      expect(result.items[1].riskLevel).toBe('CAUTION');
      expect(result.items[1].reason).toBeDefined();

      const parsed = filterResultSchema.parse(result);
      expect(parsed).toEqual(result);
    });

    it('should call aiService.generateStructured with correct parameters', async () => {
      mockAIService.generateStructured.mockResolvedValue({
        overallRisk: 'LOW',
        items: [],
        summary: '문항 없음',
      });

      const items = [
        { text: '테스트 문항', domain: 'COGNITIVE' },
      ];

      await service.filterItems(items);

      expect(mockAIService.generateStructured).toHaveBeenCalledWith(
        {
          messages: [
            { role: 'system', content: expect.stringContaining('저작권 전문가') },
            { role: 'user', content: expect.stringContaining('테스트 문항') },
          ],
        },
        filterResultSchema,
      );
    });
  });
});
