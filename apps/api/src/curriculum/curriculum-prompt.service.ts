import { Injectable } from '@nestjs/common';
import type { AIMessage } from '@auticare/ai-provider';

export interface LicensedScoreSnapshot {
  tool: string;
  totalScore: number;
  maxPossibleScore: number;
  severity: string;
  interpretation: string;
}

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
  developmentalLevel?: {
    language?: string;
    cognitive?: string;
    motor?: string;
    selfCare?: string;
    social?: string;
    overall?: string;
  };
  centerInfo?: Array<{ name: string; type: string; frequency: string; currentGoal?: string }>;
  sensoryProfile?: {
    visual: number;
    auditory: number;
    tactile: number;
    vestibular: number;
    proprioception: number;
    olfactory: number;
    aiRecommendations?: string | null;
  };
  recentMilestones?: string[];
  licensedScores?: LicensedScoreSnapshot[];
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

    let userContent = `아이 정보:
- 연령: ${ageText}
- 최근 평가 횟수: ${params.recentAssessmentCount}회
${previousGoalText}

발달 영역별 점수 (5점 만점):
${domainText}`;

    // 발달 수준 (있으면 포함)
    if (params.developmentalLevel) {
      const dl = params.developmentalLevel;
      userContent += `\n\n아이의 발달 수준 (현재 상태 설명):\n`;
      const devItems = [
        { key: 'language', label: '언어/의사소통' },
        { key: 'cognitive', label: '인지/학습' },
        { key: 'motor', label: '대소근육 운동' },
        { key: 'selfCare', label: '자조 기술' },
        { key: 'social', label: '사회성/정서' },
        { key: 'overall', label: '전반적 발달' },
      ];
      for (const item of devItems) {
        const val = (dl as Record<string, string | undefined>)[item.key];
        if (val) {
          userContent += `- ${item.label}: ${val}\n`;
        }
      }
      userContent += `위 발달 수준에 맞게 활동의 난이도와 지침을 조정해주세요.\n`;
    }

    // 센터/치료 정보 (있으면 포함)
    if (params.centerInfo && params.centerInfo.length > 0) {
      userContent += `\n\n현재 다니는 치료 센터:\n`;
      for (const center of params.centerInfo) {
        userContent += `- ${center.name} (${center.type}, ${center.frequency})`;
        if (center.currentGoal) userContent += ` — 현재 목표: ${center.currentGoal}`;
        userContent += `\n`;
      }
      userContent += `\n위 센터 치료를 보완하는 가정 활동을 만들어주세요. 센터에서 하는 것과 중복되지 않도록 해주세요.\n`;
    }

    // 감각 프로파일 (있으면 포함)
    if (params.sensoryProfile) {
      const sp = params.sensoryProfile;
      userContent += `\n\n아이의 감각 프로파일 (1=과민, 3=보통, 5=둔감):\n`;
      userContent += `- 시각: ${sp.visual}/5, 청각: ${sp.auditory}/5, 촉각: ${sp.tactile}/5\n`;
      userContent += `- 전정감각: ${sp.vestibular}/5, 고유감각: ${sp.proprioception}/5, 후각: ${sp.olfactory}/5\n`;
      if (sp.aiRecommendations) {
        userContent += `감각 통합 권장사항: ${sp.aiRecommendations}\n`;
      }
      userContent += `위 감각 프로파일을 고려하여 감각적으로 적합한 활동을 설계해주세요.\n`;
    }

    // 최근 달성 마일스톤 (있으면 포함)
    if (params.recentMilestones && params.recentMilestones.length > 0) {
      userContent += `\n\n최근 달성된 마일스톤:\n`;
      params.recentMilestones.forEach((m) => {
        userContent += `✅ ${m}\n`;
      });
      userContent += `위 마일스톤을 기반으로 다음 단계 활동을 포함해주세요.\n`;
    }

    if (params.licensedScores && params.licensedScores.length > 0) {
      userContent += `\n\n표준화 임상 평가 결과:\n`;
      for (const ls of params.licensedScores) {
        userContent += `- [${ls.tool}] ${ls.interpretation} (${ls.totalScore}/${ls.maxPossibleScore}점, 중증도: ${ls.severity})\n`;
      }
      userContent += `위 임상 평가 결과를 반영하여 아이의 현재 기능 수준에 맞는 활동을 설계해주세요.\n`;
    }

    userContent += `\n오늘(${params.targetDate}) 커리큘럼을 생성해주세요.
활동은 반드시 3~5개 이내로 생성하세요.

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
