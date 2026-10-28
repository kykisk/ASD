import { Injectable } from '@nestjs/common';
import type { AIMessage } from '@auticare/ai-provider';
import { ACTIVITY_METHODS } from '../ai/schemas/curriculum.schema.js';

export interface LicensedScoreSnapshot {
  tool: string;
  totalScore: number;
  maxPossibleScore: number;
  severity: string;
  interpretation: string;
}

export interface ClinicalReportSnapshot {
  assessmentTool: string;
  assessmentDate: string | null;
  evaluatorType: string | null;
  sectionScores: Array<{
    name: string;
    score: number | null;
    unit?: string;
    percentile?: number | null;
  }>;
  totalScore: number | null;
  totalScoreUnit: string | null;
  clinicalFindings: string | null;
}

export interface ActivityResultSnapshot {
  date: string; // YYYY-MM-DD
  title: string;
  domain: string | null;
  result: string; // SUCCESS | PARTIAL | FAILED | SKIPPED
  notes: string | null;
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
  clinicalReports?: ClinicalReportSnapshot[];
  sessionFeedbackSummary?: string;
  /** '선생님께 보여드리기'에서 받은 선생님 의견 (최근 것부터) */
  teacherOpinions?: Array<{ sessionType: string; content: string; concernTitle?: string }>;
  /** 2주 시도 중인 방법 */
  activeTrials?: Array<{ concernTitle: string; title: string; how: string }>;
  userInput?: {
    extraActivities?: string;
    dailyGoal?: string;
    weeklyGoal?: string;
    monthlyGoal?: string;
  };
  behaviorIssueSummary?: string;
  recentActivityResults?: ActivityResultSnapshot[];
}

const ACTIVITY_RESULT_LABELS: Record<string, string> = {
  SUCCESS: '성공',
  PARTIAL: '부분 성공',
  FAILED: '어려움',
  SKIPPED: '건너뜀',
};

const ACTIVITY_DOMAIN_LABELS: Record<string, string> = {
  DAILY_LIVING: '일상생활',
  COMMUNICATION: '의사소통',
  COGNITIVE: '인지',
  SOCIAL: '사회성',
  MOTOR: '운동',
  EMOTIONAL: '정서',
  OTHER: '기타',
};

const MAX_ACTIVITY_RESULT_LINES = 12;

const METHOD_GUIDE = Object.entries(ACTIVITY_METHODS)
  .map(([key, m]) => `${key}(${m.label})`)
  .join(', ');

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
- 각 텍스트 필드는 지정된 최대 글자 수를 반드시 지키세요 (초과 금지). 특히 notes는 500자 이내로 간결하게 작성하세요
- JSON 형식으로만 응답하세요 (다른 텍스트 없이)

근거 기반 원칙 (자폐 아동 근거 기반 중재 중 가정에서 쓸 수 있는 방법):
- 아이가 관심 보이는 것에서 시작하고(아이 주도), 매일 하는 일상(식사 · 목욕 · 놀이) 속에 끼워 넣으세요
- 한 번에 하나씩, 작은 단계로 나누고 성공하면 바로 구체적으로 칭찬하세요
- 먼저 시범을 보이고, 필요한 만큼만 도와준 뒤 도움을 점점 줄이세요
- 말로 요구하기 전에 기다려 주고(5초), 그림 · 순서표 같은 시각 자료를 활용하세요
- 각 활동의 methods 에는 실제로 쓴 방법만 아래 키에서 1~3개 고르세요:
  ${METHOD_GUIDE}

안전 규칙 (반드시 지키세요):
- 작은 물건 · 딱딱하거나 둥근 음식 등 질식 위험이 있는 재료는 쓰지 마세요
- 벌주기, 억지로 시키기, 몸을 붙잡아 막기를 제안하지 마세요 (다치는 걸 막는 잠깐의 안전 조치만 예외)
- 감각이 예민한 아이에게 큰 소리 · 강한 빛 · 원치 않는 접촉을 쓰지 마세요
- 아이가 힘들어하면 멈추고 쉬도록 안내하세요
- 위험할 수 있는 활동(높은 곳 · 물 · 뜨거운 것)이면 caution 에 주의할 점을 쓰세요
- 자해 · 공격 같은 다치는 행동이 기록돼 있으면 notes 에 전문가와 상의하도록 권하세요

활동마다 rationale 에 "왜 이 활동인지"를 위에서 받은 기록을 근거로 한 문장(80자 이내)으로 쓰세요.
예: "힘든 행동 기록 3번(손으로 탁탁 치기) · 언어치료 선생님 '눈 맞추면 칭찬'"
점수 변화는 '하락' · '정체' 같은 말 대신 "조금 더 신경 쓸 때", "천천히 자라는 중"처럼 부모가 부담 없이 읽을 말로 쓰세요.`,
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
        // 첫 사용 안내에서는 수업 종류만 받으므로 빈 항목은 빼고 표시
        const details = [center.type, center.frequency].filter(Boolean).join(', ');
        userContent += `- ${center.name}${details && details !== center.name ? ` (${details})` : ''}`;
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

    if (params.clinicalReports && params.clinicalReports.length > 0) {
      userContent += `\n\n외부 기관 임상 평가 보고서:\n`;
      for (const cr of params.clinicalReports) {
        const date = cr.assessmentDate ? ` (${cr.assessmentDate})` : '';
        const evaluator = cr.evaluatorType ? ` [${cr.evaluatorType}]` : '';
        userContent += `- [${cr.assessmentTool}]${date}${evaluator}\n`;
        if (cr.totalScore !== null && cr.totalScoreUnit) {
          userContent += `  전체 점수: ${cr.totalScore}${cr.totalScoreUnit}\n`;
        }
        if (cr.sectionScores?.length) {
          for (const s of cr.sectionScores.slice(0, 5)) {
            const pct =
              s.percentile !== null && s.percentile !== undefined ? ` (${s.percentile}백분위)` : '';
            if (s.score !== null) userContent += `  ${s.name}: ${s.score}${s.unit ?? ''}${pct}\n`;
          }
        }
        if (cr.clinicalFindings) {
          userContent += `  소견: ${cr.clinicalFindings.slice(0, 150)}\n`;
        }
      }
      userContent += `위 외부 평가 결과를 종합하여 치료 방향에 반영해주세요.\n`;
    }

    if (params.sessionFeedbackSummary) {
      userContent += `\n\n최근 수업 피드백 요약 (치료사 피드백 기반):\n${params.sessionFeedbackSummary}\n위 수업 피드백을 참고하여 센터 치료와 연계된 가정 활동을 설계해주세요.\n`;
    }

    if (params.behaviorIssueSummary) {
      userContent += `\n\n최근 문제행동 기록:\n${params.behaviorIssueSummary}\n위 문제행동 패턴을 고려하여 예방 및 개선에 도움이 되는 활동을 설계해주세요.\n`;
    }

    if (params.recentActivityResults && params.recentActivityResults.length > 0) {
      userContent += `\n\n${this.formatActivityResults(params.recentActivityResults)}`;
    }

    if (params.teacherOpinions && params.teacherOpinions.length > 0) {
      userContent += `\n\n센터 선생님 의견 (부모가 받아 적은 것, 가장 먼저 따르세요):\n`;
      for (const t of params.teacherOpinions) {
        userContent += `- [${t.sessionType}${t.concernTitle ? ` · 고민: ${t.concernTitle}` : ''}] ${t.content.slice(0, 200)}\n`;
      }
    }

    if (params.activeTrials && params.activeTrials.length > 0) {
      userContent += `\n\n지금 2주 동안 시도 중인 방법 (부모가 골랐어요):\n`;
      for (const t of params.activeTrials) {
        userContent += `- 고민 "${t.concernTitle}" → ${t.title}: ${t.how.slice(0, 200)}\n`;
      }
      userContent += `오늘 활동 중 하나는 이 방법을 집에서 연습하는 활동으로 만들고 그 활동에 "forTrial": true 를 넣으세요.\n`;
    }

    if (params.userInput) {
      const ui = params.userInput;
      const hasGoals = ui.dailyGoal || ui.weeklyGoal || ui.monthlyGoal;
      const hasExtra = ui.extraActivities;

      if (hasGoals || hasExtra) {
        userContent += `\n\n부모 요청사항 (최우선 반영):\n`;
        if (ui.monthlyGoal) userContent += `- 월간 목표: ${ui.monthlyGoal}\n`;
        if (ui.weeklyGoal) userContent += `- 주간 목표: ${ui.weeklyGoal}\n`;
        if (ui.dailyGoal) userContent += `- 오늘의 목표: ${ui.dailyGoal}\n`;
        if (ui.extraActivities) userContent += `- 포함해달라는 활동/공부: ${ui.extraActivities}\n`;
        userContent += `위 부모의 요청사항을 활동 설계에 반드시 반영해주세요.\n`;
      }
    }

    userContent += `\n오늘(${params.targetDate}) 커리큘럼을 생성해주세요.
활동은 반드시 3~5개 이내로 생성하세요.

다음 JSON 형식으로만 응답하세요:
{
  "weeklyGoal": "이번 주 주요 목표 (1-2문장, 최대 300자)",
  "activities": [
    {
      "title": "활동 이름 (최대 100자)",
      "domain": "COMMUNICATION|SOCIAL|MOTOR|COGNITIVE|EMOTIONAL|DAILY_LIVING",
      "durationMin": 숫자 (5~120),
      "description": "활동 설명 (최대 500자)",
      "materials": ["필요한 재료 (선택사항)"],
      "steps": ["1단계", "2단계", "3단계"],
      "successCriteria": "성공 기준 (최대 300자)",
      "difficultyLevel": "EASY|MEDIUM|HARD",
      "rationale": "왜 이 활동인지, 근거 기록 한 문장 (최대 80자)",
      "methods": ["IMITATE", "WAIT"],
      "caution": "주의할 점 (없으면 null, 최대 100자)",
      "forTrial": false
    }
  ],
  "notes": "부모를 위한 추가 참고사항 (선택사항, 최대 500자)"
}`;

    const userMessage: AIMessage = {
      role: 'user',
      content: userContent,
    };

    return [systemMessage, userMessage];
  }

  private formatActivityResults(results: ActivityResultSnapshot[]): string {
    const byDomain = new Map<string, Record<string, number>>();
    for (const r of results) {
      const domain = r.domain ? (ACTIVITY_DOMAIN_LABELS[r.domain] ?? r.domain) : '기타';
      const counts = byDomain.get(domain) ?? {};
      counts[r.result] = (counts[r.result] ?? 0) + 1;
      byDomain.set(domain, counts);
    }

    const domainLines = [...byDomain.entries()].map(([domain, counts]) => {
      const parts = Object.keys(ACTIVITY_RESULT_LABELS)
        .filter((key) => counts[key])
        .map((key) => `${ACTIVITY_RESULT_LABELS[key]} ${counts[key]}`);
      return `- ${domain}: ${parts.join(', ')}`;
    });

    const recentLines = results.slice(0, MAX_ACTIVITY_RESULT_LINES).map((r) => {
      const domain = r.domain ? (ACTIVITY_DOMAIN_LABELS[r.domain] ?? r.domain) : '기타';
      const note = r.notes ? ` / 부모 메모: ${r.notes.slice(0, 100)}` : '';
      return `- ${r.date.slice(5)} [${domain}] ${r.title}: ${ACTIVITY_RESULT_LABELS[r.result] ?? r.result}${note}`;
    });

    return `최근 2주 가정 활동 결과 (부모 기록, 총 ${results.length}건):
영역별 결과:
${domainLines.join('\n')}
최근 기록:
${recentLines.join('\n')}
위 결과를 바탕으로 오늘 활동을 조정해주세요:
- 성공이 반복된 활동은 같은 목표를 한 단계 어렵게 하거나 다음 단계로 넘어가세요
- 부분 성공·어려움이 있었던 활동은 단계를 더 잘게 쪼개거나 도움을 늘려 쉽게 다시 시도하세요
- 건너뛴 활동이 반복되면 시간을 줄이거나 아이가 좋아하는 놀이 방식으로 바꾸세요
- 부모 메모의 내용(아이 반응, 어려웠던 점)을 구체적으로 반영하세요
`;
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
    switch (direction.toLowerCase()) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  }
}
