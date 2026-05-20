import { Injectable } from '@nestjs/common';
import { TrendService } from './trend.service.js';
import type { TrendResult } from './trend.service.js';

export interface DomainScore {
  domain: string;
  label: string;
  currentScore: number;
  maxScore: number;
  percentage: number;
  trend: TrendResult;
  itemCount: number;
}

export interface AggregatedResult {
  overallScore: number;
  domains: DomainScore[];
  assessmentCount: number;
  lastAssessedAt: Date | null;
}

export interface ScoreWithWeight {
  domain: string;
  score: number;
  weight: number;
}

export interface AssessmentWithScores {
  id: string;
  createdAt: Date;
  scores: { domain: string; score: number; itemId: string }[];
}

const DOMAIN_LABELS: Record<string, string> = {
  COMMUNICATION: '의사소통',
  SOCIAL: '사회성',
  MOTOR: '운동',
  COGNITIVE: '인지',
  EMOTIONAL: '정서',
  DAILY_LIVING: '일상생활',
  OTHER: '기타',
};

@Injectable()
export class DomainAggregationService {
  constructor(private trendService: TrendService) {}

  aggregate(
    assessments: AssessmentWithScores[],
    itemWeights: Map<string, number>,
    periodSize: number = 4,
  ): AggregatedResult {
    if (assessments.length === 0) {
      return {
        overallScore: 0,
        domains: [],
        assessmentCount: 0,
        lastAssessedAt: null,
      };
    }

    const latestAssessment = assessments[0];
    const allDomains = this.extractDomains(assessments);

    const domains: DomainScore[] = allDomains.map((domain) => {
      const currentScore = this.calculateWeightedAverage(latestAssessment.scores, domain, itemWeights);
      const trend = this.trendService.calculateTrendFromAssessments(
        assessments.map((a) => ({ scores: a.scores.map((s) => ({ score: s.score, domain: s.domain })) })),
        periodSize,
        domain,
      );

      const itemCount = latestAssessment.scores.filter((s) => s.domain === domain).length;

      return {
        domain,
        label: DOMAIN_LABELS[domain] || domain,
        currentScore: Math.round(currentScore * 100) / 100,
        maxScore: 5,
        percentage: Math.round((currentScore / 5) * 100 * 100) / 100,
        trend,
        itemCount,
      };
    });

    const overallScore = this.calculateOverallWeightedAverage(latestAssessment.scores, itemWeights);

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      domains,
      assessmentCount: assessments.length,
      lastAssessedAt: latestAssessment.createdAt,
    };
  }

  private calculateWeightedAverage(
    scores: { domain: string; score: number; itemId: string }[],
    domain: string,
    itemWeights: Map<string, number>,
  ): number {
    const domainScores = scores.filter((s) => s.domain === domain);
    if (domainScores.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const s of domainScores) {
      const weight = itemWeights.get(s.itemId) ?? 1.0;
      weightedSum += s.score * weight;
      totalWeight += weight;
    }

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }

  private calculateOverallWeightedAverage(
    scores: { domain: string; score: number; itemId: string }[],
    itemWeights: Map<string, number>,
  ): number {
    if (scores.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const s of scores) {
      const weight = itemWeights.get(s.itemId) ?? 1.0;
      weightedSum += s.score * weight;
      totalWeight += weight;
    }

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }

  private extractDomains(assessments: AssessmentWithScores[]): string[] {
    const domains = new Set<string>();
    for (const a of assessments) {
      for (const s of a.scores) {
        domains.add(s.domain);
      }
    }
    return Array.from(domains).sort();
  }
}
