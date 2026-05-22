import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireGenerateService } from './questionnaire-generate.service';
import { generatedQuestionnaireSchema } from '../ai/schemas/questionnaire-generate.schema';

const mockAIService = {
  generateStructured: vi.fn(),
};

const mockQuestionnairesService = {
  create: vi.fn(),
};

describe('QuestionnaireGenerateService', () => {
  let service: QuestionnaireGenerateService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnaireGenerateService,
        { provide: 'AIService', useValue: mockAIService },
        { provide: 'QuestionnairesService', useValue: mockQuestionnairesService },
      ],
    }).compile();

    service = module.get<QuestionnaireGenerateService>(QuestionnaireGenerateService);
    Object.defineProperty(service, 'aiService', { value: mockAIService });
    Object.defineProperty(service, 'questionnairesService', { value: mockQuestionnairesService });
  });

  describe('generateQuestionnaire', () => {
    it('should generate questionnaire from params', async () => {
      const generatedResult = {
        name: '36개월 의사소통 발달 평가',
        description: '36개월 아동의 의사소통 및 사회성 발달을 평가하는 질문지입니다.',
        items: [
          {
            domain: 'COMMUNICATION' as const,
            text: '아이가 두 단어 이상의 문장을 사용하나요?',
            description: '언어 표현 능력을 평가합니다.',
            weight: 1.5,
          },
          {
            domain: 'COMMUNICATION' as const,
            text: '아이가 간단한 지시를 이해하나요?',
            weight: 1.0,
          },
          {
            domain: 'SOCIAL' as const,
            text: '또래와 함께 놀이할 때 차례를 기다릴 수 있나요?',
            description: '사회적 상호작용 능력을 평가합니다.',
            weight: 2.0,
          },
        ],
      };

      mockAIService.generateStructured.mockResolvedValue(generatedResult);

      const result = await service.generateQuestionnaire({
        familyId: 'family-1',
        userId: 'user-1',
        childAgeMonths: 36,
        targetDomains: ['COMMUNICATION', 'SOCIAL'],
      });

      expect(result.name).toBe('36개월 의사소통 발달 평가');
      expect(result.items).toHaveLength(3);
      expect(result.items[0].domain).toBe('COMMUNICATION');
      expect(result.items[2].domain).toBe('SOCIAL');

      const parsed = generatedQuestionnaireSchema.parse(result);
      expect(parsed).toEqual(result);
    });

    it('should include additional context in prompt when provided', async () => {
      mockAIService.generateStructured.mockResolvedValue({
        name: '테스트',
        description: '테스트',
        items: [
          { domain: 'COGNITIVE', text: '테스트 문항', weight: 1.0 },
        ],
      });

      await service.generateQuestionnaire({
        familyId: 'family-1',
        userId: 'user-1',
        childAgeMonths: 24,
        targetDomains: ['COGNITIVE'],
        additionalContext: '언어 지연이 있는 아이입니다',
      });

      expect(mockAIService.generateStructured).toHaveBeenCalledWith(
        {
          messages: [
            { role: 'system', content: expect.stringContaining('발달 평가 전문가') },
            { role: 'user', content: expect.stringContaining('언어 지연이 있는 아이입니다') },
          ],
        },
        generatedQuestionnaireSchema,
        undefined,
        undefined,
        'QUESTIONNAIRE_GENERATE',
      );
    });

    it('should format age correctly for young children', async () => {
      mockAIService.generateStructured.mockResolvedValue({
        name: '테스트',
        description: '테스트',
        items: [
          { domain: 'MOTOR', text: '테스트', weight: 1.0 },
        ],
      });

      await service.generateQuestionnaire({
        familyId: 'family-1',
        userId: 'user-1',
        childAgeMonths: 8,
        targetDomains: ['MOTOR'],
      });

      expect(mockAIService.generateStructured).toHaveBeenCalledWith(
        {
          messages: [
            { role: 'system', content: expect.any(String) },
            { role: 'user', content: expect.stringContaining('8개월') },
          ],
        },
        generatedQuestionnaireSchema,
        undefined,
        undefined,
        'QUESTIONNAIRE_GENERATE',
      );
    });
  });

  describe('createFromGenerated', () => {
    it('should create questionnaire in DB from generated data', async () => {
      const generated = {
        name: '생성된 질문지',
        description: 'AI가 생성한 질문지입니다.',
        items: [
          { domain: 'COMMUNICATION' as const, text: '문항 1', weight: 1.0 },
          { domain: 'SOCIAL' as const, text: '문항 2', description: '설명', weight: 1.5 },
        ],
      };

      const createdQuestionnaire = {
        id: 'q-new',
        familyId: 'family-1',
        name: generated.name,
        description: generated.description,
        domains: ['COMMUNICATION', 'SOCIAL'],
        items: generated.items.map((item, idx) => ({
          id: `item-${idx}`,
          ...item,
          orderIndex: idx,
        })),
      };

      mockQuestionnairesService.create.mockResolvedValue(createdQuestionnaire);

      const result = await service.createFromGenerated('family-1', 'user-1', generated);

      expect(result).toEqual(createdQuestionnaire);
      expect(mockQuestionnairesService.create).toHaveBeenCalledWith(
        'family-1',
        'user-1',
        {
          name: '생성된 질문지',
          description: 'AI가 생성한 질문지입니다.',
          domains: ['COMMUNICATION', 'SOCIAL'],
          items: [
            { domain: 'COMMUNICATION', text: '문항 1', description: undefined, orderIndex: 0, weight: 1.0 },
            { domain: 'SOCIAL', text: '문항 2', description: '설명', orderIndex: 1, weight: 1.5 },
          ],
        },
      );
    });
  });
});
