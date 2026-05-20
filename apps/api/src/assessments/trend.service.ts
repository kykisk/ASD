import { Injectable } from '@nestjs/common';

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

export interface TrendResult {
  direction: TrendDirection;
  changePercent: number | null;
  currentAvg: number;
  previousAvg: number;
  label: string;
}

export interface ScoreEntry {
  score: number;
  domain?: string;
}

@Injectable()
export class TrendService {
  private readonly THRESHOLD = 5;

  calculateTrend(currentScores: number[], previousScores: number[]): TrendResult {
    if (currentScores.length === 0 && previousScores.length === 0) {
      return this.stableResult(0, 0, null);
    }

    if (previousScores.length === 0) {
      const currentAvg = this.average(currentScores);
      return this.stableResult(currentAvg, 0, null);
    }

    const currentAvg = this.average(currentScores);
    const previousAvg = this.average(previousScores);

    if (previousAvg === 0) {
      return this.stableResult(currentAvg, previousAvg, null);
    }

    const changePercent = ((currentAvg - previousAvg) / previousAvg) * 100;

    if (changePercent > this.THRESHOLD) {
      return {
        direction: 'UP',
        changePercent: Math.round(changePercent * 10) / 10,
        currentAvg: Math.round(currentAvg * 100) / 100,
        previousAvg: Math.round(previousAvg * 100) / 100,
        label: '상승중',
      };
    }

    if (changePercent < -this.THRESHOLD) {
      return {
        direction: 'DOWN',
        changePercent: Math.round(changePercent * 10) / 10,
        currentAvg: Math.round(currentAvg * 100) / 100,
        previousAvg: Math.round(previousAvg * 100) / 100,
        label: '하락중',
      };
    }

    return {
      direction: 'STABLE',
      changePercent: Math.round(changePercent * 10) / 10,
      currentAvg: Math.round(currentAvg * 100) / 100,
      previousAvg: Math.round(previousAvg * 100) / 100,
      label: '유지중',
    };
  }

  calculateTrendFromAssessments(
    assessments: { scores: ScoreEntry[] }[],
    periodSize: number = 4,
    domain?: string,
  ): TrendResult {
    if (assessments.length < 2) {
      const currentAvg = assessments.length === 1
        ? this.averageFromAssessment(assessments[0].scores, domain)
        : 0;
      return this.stableResult(currentAvg, 0, null);
    }

    const currentPeriod = assessments.slice(0, periodSize);
    const previousPeriod = assessments.slice(periodSize, periodSize * 2);

    if (previousPeriod.length === 0) {
      const currentAvg = this.averageFromAssessments(currentPeriod, domain);
      return this.stableResult(currentAvg, 0, null);
    }

    const currentScores = this.extractScores(currentPeriod, domain);
    const previousScores = this.extractScores(previousPeriod, domain);

    return this.calculateTrend(currentScores, previousScores);
  }

  private extractScores(assessments: { scores: ScoreEntry[] }[], domain?: string): number[] {
    return assessments.flatMap((a) =>
      a.scores
        .filter((s) => !domain || s.domain === domain)
        .map((s) => s.score),
    );
  }

  private averageFromAssessment(scores: ScoreEntry[], domain?: string): number {
    const filtered = domain ? scores.filter((s) => s.domain === domain) : scores;
    return this.average(filtered.map((s) => s.score));
  }

  private averageFromAssessments(assessments: { scores: ScoreEntry[] }[], domain?: string): number {
    const scores = this.extractScores(assessments, domain);
    return this.average(scores);
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private stableResult(currentAvg: number, previousAvg: number, changePercent: number | null): TrendResult {
    return {
      direction: 'STABLE',
      changePercent,
      currentAvg: Math.round(currentAvg * 100) / 100,
      previousAvg: Math.round(previousAvg * 100) / 100,
      label: '유지중',
    };
  }
}
