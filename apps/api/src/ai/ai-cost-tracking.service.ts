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
  private readonly TTL_SECONDS = 30 * 24 * 60 * 60;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', undefined),
      db: this.configService.get('REDIS_DB', 0),
    });
  }

  async trackCall(params: TrackCallParams): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
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

    await pipeline.exec();
  }

  async getDailyStats(date?: string): Promise<DailyStats> {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const pattern = `${this.prefix}${targetDate}:*`;

    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, foundKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    const byProvider: Record<string, ProviderStats> = {};
    const total = { calls: 0, inputTokens: 0, outputTokens: 0 };

    for (const key of keys) {
      const suffix = key.replace(`${this.prefix}${targetDate}:`, '');
      if (suffix === 'total') continue;

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
    const date = new Date().toISOString().split('T')[0];
    const providerKey = `${this.prefix}${date}:${provider}`;

    const calls = await this.redis.hget(providerKey, 'calls');
    const currentCalls = parseInt(calls || '0', 10);

    return currentCalls < dailyLimit;
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
