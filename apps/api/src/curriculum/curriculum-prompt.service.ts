import { Injectable } from '@nestjs/common';
import type { AIMessage } from '@auticare/ai-provider';

export interface CurriculumPromptParams {
  childAgeMonths: number;
  domainScores: Array<{
    domain: string;
    label: string;
    currentScore: number;
    trend: { direction: string };
  }>;
  recentAssessmentCount: number;
  targetDate: string; // YYYY-MM-DD
  previousWeeklyGoal?: string;
}

@Injectable()
export class CurriculumPromptService {
  buildCurriculumPrompt(params: CurriculumPromptParams): AIMessage[] {
    const systemMessage: AIMessage = {
      role: 'system',
      content: `당신은 자폐 스펙트럼 장애(ASD) 아동의 가정치료를 지원하는 전문 교육 커리큘럼 설계사입니다.
부모가 집에서 실천할 수 있는 실용적이고 따뜻한 활동을 설계해주세요.

규칙:
- 활동은 가정에서 특별한 도구 없이 할 수 있어야 합니다
- 아이의 연령과 발달 수준에 맞게 설계하세요
- 매우 구체적인 단계별 지침을 제공하세요
- 한국어로 작성하세요
- JSON 형식으로만 응답하세요 (다른 텍스트 없이)`,
    };

    const ageText = this.formatAge(params.childAgeMonths);
    const domainText = this.formatDomainScores(params.domainScores);
    const previousGoalText = params.previousWeeklyGoal
      ? `\n지난 주 목표: ${params.previousWeeklyGoal}`
      : '';

    const userContent = `아이 정보:
- 연령: ${ageText}
- 최근 평가 횟수: ${params.recentAssessmentCount}회
${previousGoalText}

발달 영역별 점수 (5점 만점):
${domainText}

오늘(${params.targetDate}) 커리큘럼을 생성해주세요.

다음 JSON 형식으로만 응답하세요:
{
  "weeklyGoal": "이번 주 주요 목표 (1-2문장)",
  "activities": [
    {
      "title": "활동 이름",
      "domain": "COMMUNICATION|SOCIAL|MOTOR|COGNITIVE|EMOTIONAL|DAILY_LIVING",
      "durationMin": 숫자,
      "description": "활동 설명",
      "materials": ["필요한 재료 (선택사항)"],
      "steps": ["1단계", "2단계", "3단계"],
      "successCriteria": "성공 기준",
      "difficultyLevel": "EASY|MEDIUM|HARD"
    }
  ],
  "notes": "부모를 위한 추가 참고사항 (선택사항)"
}`;

    const userMessage: AIMessage = {
      role: 'user',
      content: userContent,
    };

    return [systemMessage, userMessage];
  }

  private formatAge(months: number): string {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) {
      return `${remainingMonths}개월`;
    }
    return `${years}세 ${remainingMonths}개월`;
  }

  private formatDomainScores(
    scores: Array<{
      domain: string;
      label: string;
      currentScore: number;
      trend: { direction: string };
    }>,
  ): string {
    if (scores.length === 0) {
      return '- 아직 평가 데이터가 없습니다';
    }

    return scores
      .map((s) => {
        const trendIcon = this.getTrendIcon(s.trend.direction);
        return `- ${s.label}(${s.domain}): ${s.currentScore}점 ${trendIcon}`;
      })
      .join('\n');
  }

  private getTrendIcon(direction: string): string {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  }
}
