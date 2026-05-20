import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisTokenService implements OnModuleDestroy {
  private redis: Redis;
  private prefix: string;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', undefined),
      db: this.configService.get('REDIS_DB', 0),
    });
    this.prefix = this.configService.get('REDIS_KEY_PREFIX', 'auticare:');
  }

  async blacklistToken(tokenHash: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`${this.prefix}blacklist:${tokenHash}`, ttlSeconds, '1');
  }

  async isBlacklisted(tokenHash: string): Promise<boolean> {
    const result = await this.redis.get(`${this.prefix}blacklist:${tokenHash}`);
    return result !== null;
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
