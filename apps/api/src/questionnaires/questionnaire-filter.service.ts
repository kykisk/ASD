import { Injectable } from '@nestjs/common';
import { AIService } from '../ai/ai.service.js';
import { filterResultSchema } from '../ai/schemas/questionnaire-filter.schema.js';
import type { FilterResult } from '../ai/schemas/questionnaire-filter.schema.js';

@Injectable()
export class QuestionnaireFilterService {
  constructor(private aiService: AIService) {}

  async filterItems(items: Array<{ text: string; domain: string }>): Promise<FilterResult> {
    const systemPrompt = `당신은 자폐 아동 평가 도구의 저작권 전문가입니다.
CARS-2, ADOS-2, ABC, M-CHAT-R/F, SCQ 등 라이선스 도구와 유사한 문항을 감지하고 수정안을 제안합니다.
JSON 형식으로만 응답하세요.

응답 형식:
{
  "overallRisk": "LOW" | "MEDIUM" | "HIGH",
  "items": [
    {
      "originalIndex": number,
      "originalText": string,
      "riskLevel": "SAFE" | "CAUTION" | "HIGH_RISK",
      "reason": string (optional),
      "suggestedRevision": string (optional)
    }
  ],
  "summary": string
}`;

    const userPrompt = `다음 문항들의 라이선스 도구 유사도를 분석하고 수정안을 제시하세요:

${items.map((item, idx) => `${idx}. [${item.domain}] ${item.text}`).join('\n')}`;

    return this.aiService.generateStructured(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      filterResultSchema,
      undefined,
      undefined,
      'QUESTIONNAIRE_FILTER',
    );
  }
}
