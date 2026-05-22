import { Injectable } from '@nestjs/common';
import { AIService } from '../ai/ai.service.js';
import { QuestionnairesService } from './questionnaires.service.js';
import { generatedQuestionnaireSchema } from '../ai/schemas/questionnaire-generate.schema.js';
import type { GeneratedQuestionnaire } from '../ai/schemas/questionnaire-generate.schema.js';

@Injectable()
export class QuestionnaireGenerateService {
  constructor(
    private aiService: AIService,
    private questionnairesService: QuestionnairesService,
  ) {}

  async generateQuestionnaire(params: {
    familyId: string;
    userId: string;
    childAgeMonths: number;
    targetDomains: string[];
    additionalContext?: string;
    developmentalLevel?: { language?: string; cognitive?: string; motor?: string; selfCare?: string; social?: string; overall?: string };
    centerInfo?: Array<{ name: string; type: string; frequency: string; currentGoal?: string }>;
  }): Promise<GeneratedQuestionnaire> {
    const systemPrompt = `당신은 자폐 아동 발달 평가 전문가입니다.
아이의 연령과 발달 영역에 맞는 맞춤형 평가 질문지를 생성합니다.
라이선스가 있는 기존 도구(CARS-2, ADOS-2, ABC, M-CHAT-R/F, SCQ 등)의 문항을 직접 복사하지 마세요.
독창적인 문항을 만들어주세요.
JSON 형식으로만 응답하세요.

응답 형식:
{
  "name": string,
  "description": string,
  "items": [
    {
      "domain": "COMMUNICATION" | "SOCIAL" | "MOTOR" | "COGNITIVE" | "EMOTIONAL" | "DAILY_LIVING" | "OTHER",
      "text": string,
      "description": string (optional),
      "weight": number (0.5 ~ 3)
    }
  ]
}`;

    const domainLabels = params.targetDomains.join(', ');
    const ageYears = Math.floor(params.childAgeMonths / 12);
    const ageRemainderMonths = params.childAgeMonths % 12;
    const ageStr = ageYears > 0
      ? `${ageYears}세 ${ageRemainderMonths}개월`
      : `${params.childAgeMonths}개월`;

    let userPrompt = `다음 조건에 맞는 발달 평가 질문지를 생성해주세요:
- 아이 연령: ${ageStr}
- 대상 발달 영역: ${domainLabels}
- 문항 수: 각 영역당 3~5개`;

    if (params.additionalContext) {
      userPrompt += `\n- 추가 맥락: ${params.additionalContext}`;
    }

    if (params.developmentalLevel) {
      const dl = params.developmentalLevel;
      userPrompt += `\n\n아이의 현재 발달 수준:`;
      if (dl.language) userPrompt += `\n- 언어: ${dl.language}`;
      if (dl.cognitive) userPrompt += `\n- 인지: ${dl.cognitive}`;
      if (dl.motor) userPrompt += `\n- 대소근육: ${dl.motor}`;
      if (dl.selfCare) userPrompt += `\n- 자조: ${dl.selfCare}`;
      if (dl.social) userPrompt += `\n- 사회성: ${dl.social}`;
      userPrompt += `\n\n위 발달 수준에 적합한 난이도의 문항을 만들어주세요.`;
    }

    if (params.centerInfo && params.centerInfo.length > 0) {
      userPrompt += `\n\n현재 치료 센터:`;
      for (const center of params.centerInfo) {
        userPrompt += `\n- ${center.name} (${center.type}, ${center.frequency})`;
        if (center.currentGoal) userPrompt += ` — 목표: ${center.currentGoal}`;
      }
      userPrompt += `\n\n센터에서 다루는 영역을 보완할 수 있는 가정용 문항을 포함해주세요.`;
    }

    return this.aiService.generateStructured(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      generatedQuestionnaireSchema,
      undefined,
      undefined,
      'QUESTIONNAIRE_GENERATE',
    );
  }

  async createFromGenerated(
    familyId: string,
    userId: string,
    generated: GeneratedQuestionnaire,
  ) {
    const domains = [...new Set(generated.items.map((item) => item.domain))];

    return this.questionnairesService.create(familyId, userId, {
      name: generated.name,
      description: generated.description,
      domains,
      items: generated.items.map((item, index) => ({
        domain: item.domain,
        text: item.text,
        description: item.description,
        orderIndex: index,
        weight: item.weight,
      })),
    });
  }
}
