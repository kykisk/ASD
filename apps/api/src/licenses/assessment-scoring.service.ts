import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { LicensedTool } from '@auticare/prisma-client';

export interface ScoringResult {
  tool: LicensedTool;
  totalScore: number;
  maxPossibleScore: number;
  subscaleScores: Record<string, number>;
  severity: string;
  interpretation: string;
  details: Record<string, unknown>;
}

@Injectable()
export class AssessmentScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async score(assessmentId: string): Promise<ScoringResult> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        scores: true,
        questionnaire: true,
      },
    });

    if (!assessment) throw new NotFoundException('평가를 찾을 수 없습니다');

    const tool = (assessment.questionnaire as { licensedTool?: LicensedTool }).licensedTool;
    if (!tool) throw new NotFoundException('라이선스 도구 정보를 찾을 수 없습니다');

    const scores = assessment.scores as Array<{ domain: string; score: number }>;

    let result: ScoringResult;
    switch (tool) {
      case LicensedTool.M_CHAT_R_F:
        result = this.scoreMChat(scores);
        break;
      case LicensedTool.CARS_2:
        result = this.scoreCars2(scores);
        break;
      case LicensedTool.ABC:
        result = this.scoreAbc(scores);
        break;
      default:
        result = this.scoreGeneric(tool, scores);
    }

    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { totalScore: result.totalScore },
    });

    return result;
  }

  private scoreMChat(scores: Array<{ domain: string; score: number }>): ScoringResult {
    const fails = scores.filter((s) => s.score >= 3).length;
    const total = scores.length;

    let severity: string;
    let interpretation: string;
    if (fails <= 2) {
      severity = 'LOW_RISK';
      interpretation = '낮은 위험 (0-2점): 자폐 위험이 낮습니다. 정기 발달 검진을 계속 받으세요.';
    } else if (fails <= 7) {
      severity = 'MEDIUM_RISK';
      interpretation = '중간 위험 (3-7점): 추가 평가가 필요합니다. 전문가 상담을 권장합니다.';
    } else {
      severity = 'HIGH_RISK';
      interpretation = '높은 위험 (8점 이상): 즉각적인 전문가 평가가 필요합니다.';
    }

    const subscaleScores: Record<string, number> = {
      SOCIAL: 0,
      COMMUNICATION: 0,
      COGNITIVE: 0,
      MOTOR: 0,
    };
    scores.forEach((s) => {
      const domain = s.domain as keyof typeof subscaleScores;
      if (domain in subscaleScores && s.score >= 3) subscaleScores[domain]++;
    });

    return {
      tool: LicensedTool.M_CHAT_R_F,
      totalScore: fails,
      maxPossibleScore: total,
      subscaleScores,
      severity,
      interpretation,
      details: { totalItems: total, failedItems: fails, passedItems: total - fails },
    };
  }

  private scoreCars2(scores: Array<{ domain: string; score: number }>): ScoringResult {
    const mapped = scores.map((s) => Math.min(s.score, 4));
    const total = mapped.reduce((a, b) => a + b, 0);
    const maxPossible = scores.length * 4;

    let severity: string;
    let interpretation: string;
    if (total < 30) {
      severity = 'NON_AUTISTIC';
      interpretation = `비자폐 (${total}점): 자폐 스펙트럼 장애 해당 없음`;
    } else if (total < 37) {
      severity = 'MILD_MODERATE';
      interpretation = `경증-중등도 (${total}점): 경증-중등도 자폐 스펙트럼 장애 해당`;
    } else {
      severity = 'SEVERE';
      interpretation = `중증 (${total}점): 중증 자폐 스펙트럼 장애 해당`;
    }

    const subscaleScores: Record<string, number> = {};
    const domains = [...new Set(scores.map((s) => s.domain))];
    domains.forEach((domain) => {
      subscaleScores[domain] = scores
        .filter((s) => s.domain === domain)
        .reduce((sum, s) => sum + Math.min(s.score, 4), 0);
    });

    return {
      tool: LicensedTool.CARS_2,
      totalScore: total,
      maxPossibleScore: maxPossible,
      subscaleScores,
      severity,
      interpretation,
      details: { itemCount: scores.length, averageScore: +(total / scores.length).toFixed(2) },
    };
  }

  private scoreAbc(scores: Array<{ domain: string; score: number }>): ScoringResult {
    const mapped = scores.map((s) => Math.min(s.score - 1, 3));
    const total = mapped.reduce((a, b) => a + b, 0);
    const maxPossible = scores.length * 3;

    const SUBSCALE_LABELS: Record<string, string> = {
      EMOTIONAL: '과민성',
      SOCIAL: '위축/무관심',
      MOTOR: '상동행동',
      COGNITIVE: '과잉행동',
      COMMUNICATION: '부적절한 언어',
    };

    const subscaleScores: Record<string, number> = {};
    scores.forEach((s, idx) => {
      const label = SUBSCALE_LABELS[s.domain] ?? s.domain;
      subscaleScores[label] = (subscaleScores[label] ?? 0) + mapped[idx];
    });

    const maxBySubscale = scores.reduce(
      (acc, s) => {
        const label = SUBSCALE_LABELS[s.domain] ?? s.domain;
        acc[label] = (acc[label] ?? 0) + 3;
        return acc;
      },
      {} as Record<string, number>,
    );

    const clinicallySignificant = Object.entries(subscaleScores)
      .filter(([label, score]) => score > (maxBySubscale[label] ?? 0) * 0.5)
      .map(([label]) => label);

    return {
      tool: LicensedTool.ABC,
      totalScore: total,
      maxPossibleScore: maxPossible,
      subscaleScores,
      severity: clinicallySignificant.length > 0 ? 'SIGNIFICANT' : 'WITHIN_RANGE',
      interpretation:
        clinicallySignificant.length > 0
          ? `임상적으로 유의미한 하위척도: ${clinicallySignificant.join(', ')}`
          : '전체 하위척도가 정상 범위 내에 있습니다',
      details: { subscaleMaxScores: maxBySubscale, significantSubscales: clinicallySignificant },
    };
  }

  private scoreGeneric(
    tool: LicensedTool,
    scores: Array<{ domain: string; score: number }>,
  ): ScoringResult {
    const total = scores.reduce((a, s) => a + s.score, 0);
    return {
      tool,
      totalScore: total,
      maxPossibleScore: scores.length * 5,
      subscaleScores: {},
      severity: 'UNSCORED',
      interpretation: '해당 도구의 채점 알고리즘이 준비 중입니다',
      details: {},
    };
  }
}
