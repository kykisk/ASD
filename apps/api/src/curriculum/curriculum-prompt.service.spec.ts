import { Test, TestingModule } from '@nestjs/testing';
import { CurriculumPromptService } from './curriculum-prompt.service';

describe('CurriculumPromptService', () => {
  let service: CurriculumPromptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurriculumPromptService],
    }).compile();

    service = module.get<CurriculumPromptService>(CurriculumPromptService);
  });

  describe('buildCurriculumPrompt', () => {
    const baseParams = {
      childAgeMonths: 38,
      domainScores: [
        { domain: 'COMMUNICATION', label: '의사소통', currentScore: 3.5, trend: { direction: 'up' } },
        { domain: 'SOCIAL', label: '사회성', currentScore: 2.8, trend: { direction: 'down' } },
      ],
      recentAssessmentCount: 5,
      targetDate: '2026-05-20',
    };

    it('should return system + user messages', () => {
      const messages = service.buildCurriculumPrompt(baseParams);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });

    it('should contain child age in prompt', () => {
      const messages = service.buildCurriculumPrompt(baseParams);
      const userContent = messages[1].content;

      expect(userContent).toContain('3세 2개월');
    });

    it('should contain domain scores in prompt', () => {
      const messages = service.buildCurriculumPrompt(baseParams);
      const userContent = messages[1].content;

      expect(userContent).toContain('의사소통(COMMUNICATION): 3.5점');
      expect(userContent).toContain('사회성(SOCIAL): 2.8점');
      expect(userContent).toContain('↑');
      expect(userContent).toContain('↓');
    });

    it('should include JSON format instructions', () => {
      const messages = service.buildCurriculumPrompt(baseParams);
      const userContent = messages[1].content;

      expect(userContent).toContain('weeklyGoal');
      expect(userContent).toContain('activities');
      expect(userContent).toContain('difficultyLevel');
    });

    it('should include previous weekly goal when provided', () => {
      const params = { ...baseParams, previousWeeklyGoal: '의사소통 능력 향상' };
      const messages = service.buildCurriculumPrompt(params);
      const userContent = messages[1].content;

      expect(userContent).toContain('의사소통 능력 향상');
    });

    it('should format age correctly for infants under 12 months', () => {
      const params = { ...baseParams, childAgeMonths: 8 };
      const messages = service.buildCurriculumPrompt(params);
      const userContent = messages[1].content;

      expect(userContent).toContain('8개월');
    });

    it('should handle empty domain scores', () => {
      const params = { ...baseParams, domainScores: [] };
      const messages = service.buildCurriculumPrompt(params);
      const userContent = messages[1].content;

      expect(userContent).toContain('아직 평가 데이터가 없습니다');
    });

    it('should contain system prompt with ASD curriculum designer instructions', () => {
      const messages = service.buildCurriculumPrompt(baseParams);
      const systemContent = messages[0].content;

      expect(systemContent).toContain('자폐 스펙트럼 장애(ASD)');
      expect(systemContent).toContain('가정치료');
      expect(systemContent).toContain('JSON 형식으로만 응답하세요');
    });
  });
});
