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
  clinicalDescription: string;
  recommendations: string[];
  subscaleInterpretations: Record<string, string>;
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
    let clinicalDescription: string;
    let recommendations: string[];

    if (fails <= 2) {
      severity = 'LOW_RISK';
      interpretation = `낮은 위험 (${fails}점): 자폐 위험이 낮습니다.`;
      clinicalDescription =
        'M-CHAT-R/F 점수가 낮은 위험 범주에 해당합니다. 대부분의 항목에서 정상 발달 패턴을 보입니다.';
      recommendations = [
        '18~24개월 정기 발달 검진을 계속 받으세요',
        '언어 발달, 사회적 상호작용을 지속적으로 관찰하세요',
        '이상 징후 발견 시 소아과 전문의와 상담하세요',
      ];
    } else if (fails <= 7) {
      severity = 'MEDIUM_RISK';
      interpretation = `중간 위험 (${fails}점): 추가 추적 관찰이 필요합니다.`;
      clinicalDescription =
        '일부 자폐 위험 지표가 확인됩니다. 이 점수대는 추가 평가를 통해 자폐 여부를 명확히 해야 합니다.';
      recommendations = [
        '소아 발달 전문의 또는 소아청소년 정신건강의학과 상담 예약',
        '2~4주 이내에 M-CHAT Follow-Up 인터뷰 진행',
        '아이의 의사소통, 사회성 발달 일지 기록 시작',
        '언어 치료 전문가의 초기 평가 고려',
      ];
    } else {
      severity = 'HIGH_RISK';
      interpretation = `높은 위험 (${fails}점): 즉각적인 전문가 평가가 필요합니다.`;
      clinicalDescription =
        '다수의 자폐 위험 지표가 확인됩니다. 이 점수대는 전문가의 포괄적인 발달 평가가 권고됩니다.';
      recommendations = [
        '가능한 빠른 시일 내 소아 발달 전문의 방문',
        '종합 발달 평가(ADOS-2, ADI-R 등) 의뢰',
        '조기 개입 서비스 연결 (언어치료, 작업치료, ABA)',
        '지역 자폐 지원 센터 및 가족 지원 서비스 연계',
      ];
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

    const subscaleInterpretations: Record<string, string> = {
      SOCIAL:
        subscaleScores.SOCIAL > 3
          ? '사회적 상호작용 영역에서 다수의 위험 지표가 확인됩니다'
          : '사회적 상호작용 영역은 양호합니다',
      COMMUNICATION:
        subscaleScores.COMMUNICATION > 3
          ? '의사소통 영역에서 다수의 위험 지표가 확인됩니다'
          : '의사소통 영역은 양호합니다',
      COGNITIVE:
        subscaleScores.COGNITIVE > 2
          ? '인지 발달 영역에서 일부 위험 지표가 확인됩니다'
          : '인지 발달 영역은 양호합니다',
      MOTOR:
        subscaleScores.MOTOR > 1
          ? '운동 발달 영역에서 주의가 필요합니다'
          : '운동 발달 영역은 양호합니다',
    };

    return {
      tool: LicensedTool.M_CHAT_R_F,
      totalScore: fails,
      maxPossibleScore: total,
      subscaleScores,
      severity,
      interpretation,
      clinicalDescription,
      recommendations,
      subscaleInterpretations,
      details: { totalItems: total, failedItems: fails, passedItems: total - fails },
    };
  }

  private scoreCars2(scores: Array<{ domain: string; score: number }>): ScoringResult {
    const mapped = scores.map((s) => Math.min(s.score, 4));
    const total = mapped.reduce((a, b) => a + b, 0);
    const maxPossible = scores.length * 4;

    let severity: string;
    let interpretation: string;
    let clinicalDescription: string;
    let recommendations: string[];

    if (total < 30) {
      severity = 'NON_AUTISTIC';
      interpretation = `비자폐 (${total}점): 자폐 스펙트럼 장애 해당 없음`;
      clinicalDescription =
        '현재 평가 결과는 자폐 스펙트럼 장애의 진단 기준에 해당하지 않습니다. 각 영역이 정상 범위 내에 있습니다.';
      recommendations = [
        '정기적인 발달 모니터링 계속 진행',
        '현재 치료 목표 유지 및 진행 상황 추적',
        '6-12개월 후 재평가 고려',
      ];
    } else if (total < 37) {
      severity = 'MILD_MODERATE';
      interpretation = `경증-중등도 (${total}점): 경증-중등도 자폐 스펙트럼 장애 해당`;
      clinicalDescription =
        '경증에서 중등도 수준의 자폐 스펙트럼 특성이 관찰됩니다. 구조화된 치료 개입이 권고됩니다.';
      recommendations = [
        '언어치료 및 사회성 훈련 집중 실시',
        '구조화된 ABA(응용행동분석) 프로그램 참여',
        '특수교육 지원 연계',
        '가정 내 일관된 루틴 및 행동 지원 전략 수립',
        '3-6개월 후 재평가',
      ];
    } else {
      severity = 'SEVERE';
      interpretation = `중증 (${total}점): 중증 자폐 스펙트럼 장애 해당`;
      clinicalDescription =
        '중증 수준의 자폐 스펙트럼 특성이 전반적인 영역에서 관찰됩니다. 집중적인 다학제 치료 개입이 필요합니다.';
      recommendations = [
        '집중적 ABA 치료 (주 20-40시간) 즉시 시작',
        '언어치료, 작업치료, 감각통합치료 병행',
        '특수학교 또는 통합교육 특수학급 배치 검토',
        '가족 지원 서비스 및 부모 교육 프로그램 참여',
        '정기적 의학적 추적 관찰 (신경과, 정신건강의학과)',
      ];
    }

    const subscaleScores: Record<string, number> = {};
    const domains = [...new Set(scores.map((s) => s.domain))];
    domains.forEach((domain) => {
      subscaleScores[domain] = scores
        .filter((s) => s.domain === domain)
        .reduce((sum, s) => sum + Math.min(s.score, 4), 0);
    });

    const DOMAIN_LABELS: Record<string, string> = {
      SOCIAL: '사회적 상호작용',
      COMMUNICATION: '의사소통',
      MOTOR: '운동 기능',
      COGNITIVE: '인지 기능',
      EMOTIONAL: '정서 조절',
    };
    const subscaleInterpretations: Record<string, string> = {};
    domains.forEach((domain) => {
      const label = DOMAIN_LABELS[domain] ?? domain;
      const score = subscaleScores[domain];
      const itemCount = scores.filter((s) => s.domain === domain).length;
      const avg = score / itemCount;
      subscaleInterpretations[label] =
        avg >= 3
          ? `${label} 영역에서 유의미한 어려움이 관찰됩니다 (평균 ${avg.toFixed(1)}/4점)`
          : `${label} 영역은 상대적으로 양호합니다 (평균 ${avg.toFixed(1)}/4점)`;
    });

    return {
      tool: LicensedTool.CARS_2,
      totalScore: total,
      maxPossibleScore: maxPossible,
      subscaleScores,
      severity,
      interpretation,
      clinicalDescription,
      recommendations,
      subscaleInterpretations,
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

    const subscaleInterpretations: Record<string, string> = {};
    Object.entries(subscaleScores).forEach(([label, score]) => {
      const max = maxBySubscale[label] ?? 0;
      const pct = max > 0 ? Math.round((score / max) * 100) : 0;
      subscaleInterpretations[label] =
        pct > 50
          ? `${label}: 임상적으로 유의미한 수준 (${score}/${max}점, ${pct}%)`
          : `${label}: 정상 범위 (${score}/${max}점, ${pct}%)`;
    });

    const recommendations =
      clinicallySignificant.length > 0
        ? [
            `유의미한 하위척도(${clinicallySignificant.join(', ')})에 대한 집중 개입 계획 수립`,
            '행동지원 계획(BSP) 작성 및 실행',
            '관련 치료사(작업치료사, 행동치료사)와 협력',
            '가정-학교-치료기관 간 일관된 행동 지원 전략 공유',
          ]
        : ['현재 행동 지원 전략을 유지하세요', '월 1회 정기 모니터링 권고'];

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
      clinicalDescription:
        clinicallySignificant.length > 0
          ? `${clinicallySignificant.join(', ')} 영역에서 임상적으로 유의미한 이상행동이 관찰됩니다. 해당 영역에 대한 구체적인 개입 계획이 필요합니다.`
          : '전반적인 행동 수준이 정상 범위 내에 있습니다. 현재 지원 수준을 유지하세요.',
      recommendations,
      subscaleInterpretations,
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
      clinicalDescription: '',
      recommendations: [],
      subscaleInterpretations: {},
      details: {},
    };
  }
}
