import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface TrackCallParams {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  childId?: string;
  operation: string;
  /** AiFeatureConfig 기능 키. 없으면 GENERAL */
  feature?: string;
}

export interface FeatureUsage {
  feature: string;
  calls: number;
  failures: number;
  avgLatencyMs: number;
}

export interface UsageSummary {
  /** 오래된 날 → 오늘 순 */
  days: Array<{ date: string; byModel: Record<string, number> }>;
  today: { calls: number; features: FeatureUsage[] };
  month: { estimatedCostUsd: number; inputTokens: number; outputTokens: number };
  recentFailures: Array<{ at: string; feature: string; error: string }>;
}

/** 100만 토큰당 USD (입력, 출력). 모르는 모델은 0 으로 계산 */
const MODEL_PRICES: Array<{ prefix: string; input: number; output: number }> = [
  { prefix: 'claude-haiku-5-5', input: 0.1, output: 0.5 },
  { prefix: 'claude-sonnet-5-5', input: 2, output: 10 },
  { prefix: 'claude-opus-5-5', input: 4, output: 20 },
  { prefix: 'claude-haiku-4-5', input: 1, output: 5 },
  { prefix: 'claude-sonnet-4', input: 3, output: 15 },
];

const KST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 하루 사용량은 한국 날짜 기준 (자정 KST 에 초기화) */
export function kstDate(at: Date = new Date()): string {
  return KST_DATE.format(at);
}

export interface ProviderStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
}

export interface DailyStats {
  byProvider: Record<string, ProviderStats>;
  total: { calls: number; inputTokens: number; outputTokens: number };
}

@Injectable()
export class AICostTrackingService implements OnModuleDestroy {
  private redis: Redis;
  private prefix = 'auticare:ai-cost:';
  // 이번 달 비용 합산을 위해 한 달보다 길게 보관
  private readonly TTL_SECONDS = 40 * 24 * 60 * 60;
  private readonly FAILURES_KEY = 'auticare:ai-failures';

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', undefined),
      db: this.configService.get('REDIS_DB', 0),
    });
  }

  async trackCall(params: TrackCallParams): Promise<void> {
    const date = kstDate();
    const providerKey = `${this.prefix}${date}:${params.provider}`;
    const totalKey = `${this.prefix}${date}:total`;

    const pipeline = this.redis.pipeline();

    pipeline.hincrby(providerKey, 'calls', 1);
    pipeline.hincrby(providerKey, 'inputTokens', params.inputTokens);
    pipeline.hincrby(providerKey, 'outputTokens', params.outputTokens);
    pipeline.hincrby(providerKey, 'totalMs', params.latencyMs);
    pipeline.expire(providerKey, this.TTL_SECONDS);

    pipeline.hincrby(totalKey, 'calls', 1);
    pipeline.hincrby(totalKey, 'inputTokens', params.inputTokens);
    pipeline.hincrby(totalKey, 'outputTokens', params.outputTokens);
    pipeline.expire(totalKey, this.TTL_SECONDS);

    const modelKey = `${this.prefix}${date}:model:${params.model}`;
    pipeline.hincrby(modelKey, 'calls', 1);
    pipeline.hincrby(modelKey, 'inputTokens', params.inputTokens);
    pipeline.hincrby(modelKey, 'outputTokens', params.outputTokens);
    pipeline.expire(modelKey, this.TTL_SECONDS);

    const featureKey = `${this.prefix}${date}:feature:${params.feature ?? 'GENERAL'}`;
    pipeline.hincrby(featureKey, 'calls', 1);
    pipeline.hincrby(featureKey, 'totalMs', params.latencyMs);
    pipeline.expire(featureKey, this.TTL_SECONDS);

    await pipeline.exec();
  }

  /** 모든 프로바이더가 실패해 기능 호출이 실패한 경우 */
  async trackFailure(feature: string | undefined, error: string): Promise<void> {
    const date = kstDate();
    const featureKey = `${this.prefix}${date}:feature:${feature ?? 'GENERAL'}`;
    const entry = JSON.stringify({
      at: new Date().toISOString(),
      feature: feature ?? 'GENERAL',
      error: error.slice(0, 300),
    });
    await this.redis
      .pipeline()
      .hincrby(featureKey, 'failures', 1)
      .expire(featureKey, this.TTL_SECONDS)
      .lpush(this.FAILURES_KEY, entry)
      .ltrim(this.FAILURES_KEY, 0, 49)
      .exec();
  }

  /** 관리자 AI 화면용: 최근 days 일 모델별 호출, 오늘 기능별 사용, 이번 달 추정 비용, 최근 실패 */
  async getUsageSummary(days = 7): Promise<UsageSummary> {
    const today = kstDate();
    const dayList: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dayList.push(kstDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
    }

    const result: UsageSummary = {
      days: [],
      today: { calls: 0, features: [] },
      month: { estimatedCostUsd: 0, inputTokens: 0, outputTokens: 0 },
      recentFailures: [],
    };

    for (const date of dayList) {
      const byModel: Record<string, number> = {};
      for (const key of await this.scanKeys(`${this.prefix}${date}:model:*`)) {
        const data = await this.redis.hgetall(key);
        byModel[key.slice(`${this.prefix}${date}:model:`.length)] = parseInt(
          data['calls'] || '0',
          10,
        );
      }
      result.days.push({ date, byModel });
    }

    for (const key of await this.scanKeys(`${this.prefix}${today}:feature:*`)) {
      const data = await this.redis.hgetall(key);
      const calls = parseInt(data['calls'] || '0', 10);
      const totalMs = parseInt(data['totalMs'] || '0', 10);
      result.today.features.push({
        feature: key.slice(`${this.prefix}${today}:feature:`.length),
        calls,
        failures: parseInt(data['failures'] || '0', 10),
        avgLatencyMs: calls > 0 ? Math.round(totalMs / calls) : 0,
      });
      result.today.calls += calls;
    }

    const monthPrefix = today.slice(0, 7);
    for (const key of await this.scanKeys(`${this.prefix}${monthPrefix}-*:model:*`)) {
      const model = key.slice(key.indexOf(':model:') + ':model:'.length);
      const data = await this.redis.hgetall(key);
      const input = parseInt(data['inputTokens'] || '0', 10);
      const output = parseInt(data['outputTokens'] || '0', 10);
      const price = MODEL_PRICES.find((p) => model.startsWith(p.prefix));
      result.month.inputTokens += input;
      result.month.outputTokens += output;
      if (price) {
        result.month.estimatedCostUsd += (input * price.input + output * price.output) / 1_000_000;
      }
    }
    result.month.estimatedCostUsd = Math.round(result.month.estimatedCostUsd * 100) / 100;

    const failures = await this.redis.lrange(this.FAILURES_KEY, 0, 19);
    result.recentFailures = failures.map((f) => JSON.parse(f));
    return result;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, found] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      keys.push(...found);
    } while (cursor !== '0');
    return keys;
  }

  async getDailyStats(date?: string): Promise<DailyStats> {
    const targetDate = date ?? kstDate();
    const pattern = `${this.prefix}${targetDate}:*`;

    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, foundKeys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    const byProvider: Record<string, ProviderStats> = {};
    const total = { calls: 0, inputTokens: 0, outputTokens: 0 };

    for (const key of keys) {
      const suffix = key.replace(`${this.prefix}${targetDate}:`, '');
      // 모델·기능별 키는 프로바이더 합계가 아님
      if (suffix === 'total' || suffix.includes(':')) continue;

      const data = await this.redis.hgetall(key);
      const calls = parseInt(data['calls'] || '0', 10);
      const inputTokens = parseInt(data['inputTokens'] || '0', 10);
      const outputTokens = parseInt(data['outputTokens'] || '0', 10);
      const totalMs = parseInt(data['totalMs'] || '0', 10);

      byProvider[suffix] = {
        calls,
        inputTokens,
        outputTokens,
        avgLatencyMs: calls > 0 ? Math.round(totalMs / calls) : 0,
      };

      total.calls += calls;
      total.inputTokens += inputTokens;
      total.outputTokens += outputTokens;
    }

    return { byProvider, total };
  }

  async checkBudgetLimit(provider: string, dailyLimit: number): Promise<boolean> {
    const date = kstDate();
    const providerKey = `${this.prefix}${date}:${provider}`;

    const calls = await this.redis.hget(providerKey, 'calls');
    const currentCalls = parseInt(calls || '0', 10);

    return currentCalls < dailyLimit;
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
