import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AIProviderFactory } from '@auticare/ai-provider';
import type { AIProvider, AIRequestOptions, AIResponse } from '@auticare/ai-provider';
import type { AIProviderName } from '@auticare/ai-provider';
import { PrismaService } from '@auticare/prisma-client';
import { AiConfigService } from '../ai-config/ai-config.service.js';
import { AiFeatureConfigService } from '../ai-config/ai-feature-config.service.js';
import { AICostTrackingService, kstDate } from './ai-cost-tracking.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { z } from 'zod';
import type { DecryptedAiConfig } from '@auticare/dto';

const MAX_STRUCTURED_RETRIES = 3;

/** 가족 AI 사용 범위(티어)별 하루 호출 수 */
const FAMILY_DAILY_LIMITS: Record<string, number> = {
  BASIC: 5,
  STANDARD: 20,
  UNLIMITED: Infinity,
};

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly redis: Redis;

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly aiFeatureConfigService: AiFeatureConfigService,
    private readonly costTracker: AICostTrackingService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', undefined),
      db: this.configService.get('REDIS_DB', 0),
    });
  }

  async getConfigForFeature(feature: string): Promise<DecryptedAiConfig> {
    const configId = await this.aiFeatureConfigService.getConfigIdForFeature(feature);
    if (configId) {
      return this.aiConfigService.getDecryptedConfig(configId);
    }
    return this.aiConfigService.getDecryptedDefaultConfig();
  }

  async getProvider(preferredProvider?: string): Promise<AIProvider> {
    const configs = await this.aiConfigService.findAll();
    const activeConfigs = configs.filter((c) => c.isActive);

    if (activeConfigs.length === 0) {
      throw new ApiException(503, 'AI_001', '활성화된 AI 프로바이더가 없습니다');
    }

    let targetConfig: { id: string; provider: string } | undefined;
    if (preferredProvider) {
      targetConfig = activeConfigs.find((c) => c.provider === preferredProvider);
    }
    if (!targetConfig) {
      targetConfig = activeConfigs.find((c) => c.isDefault) ?? activeConfigs[0];
    }

    const decrypted = await this.aiConfigService.getDecryptedConfig(targetConfig.id);

    return AIProviderFactory.create(decrypted.provider as AIProviderName, {
      apiKey: decrypted.apiKey ?? undefined,
      region: decrypted.region ?? undefined,
      accessKeyId: decrypted.accessKeyId ?? undefined,
      secretKey: decrypted.secretKey ?? undefined,
      modelId: decrypted.modelId ?? undefined,
      maxTokens: decrypted.maxTokens,
      temperature: decrypted.temperature,
    });
  }

  async generate(
    options: AIRequestOptions,
    preferredProvider?: string,
    familyId?: string,
    feature?: string,
  ): Promise<AIResponse> {
    if (familyId) {
      await this.checkAiAccess(familyId);
    }

    if (feature) {
      const configId = await this.aiFeatureConfigService.getConfigIdForFeature(feature);
      if (configId) {
        try {
          const decrypted = await this.aiConfigService.getDecryptedConfig(configId);

          const withinBudget = await this.costTracker.checkBudgetLimit(
            decrypted.provider,
            decrypted.dailyBudgetLimit,
          );
          // 비활성화한 설정은 기능별로 지정돼 있어도 쓰지 않음
          if (decrypted.isActive && withinBudget) {
            const provider = await AIProviderFactory.create(decrypted.provider as AIProviderName, {
              apiKey: decrypted.apiKey ?? undefined,
              region: decrypted.region ?? undefined,
              accessKeyId: decrypted.accessKeyId ?? undefined,
              secretKey: decrypted.secretKey ?? undefined,
              modelId: decrypted.modelId ?? undefined,
              maxTokens: decrypted.maxTokens,
              temperature: decrypted.temperature,
            });

            const response = await provider.generate(options);

            await this.costTracker.trackCall({
              provider: decrypted.provider,
              model: response.model,
              inputTokens: response.inputTokens,
              outputTokens: response.outputTokens,
              latencyMs: response.latencyMs,
              operation: 'generate',
              feature,
            });

            return response;
          }
        } catch (err) {
          this.logger.warn(
            `Feature-specific config for ${feature} failed, falling back to default chain: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    const configs = await this.aiConfigService.findAll();
    const activeConfigs = configs.filter((c) => c.isActive);

    if (activeConfigs.length === 0) {
      await this.costTracker.trackFailure(feature, '활성화된 AI 프로바이더가 없습니다');
      throw new ApiException(503, 'AI_001', '활성화된 AI 프로바이더가 없습니다');
    }

    const orderedConfigs = this.buildFallbackChain(activeConfigs, preferredProvider);
    const errors: Array<{ provider: string; error: string }> = [];

    for (const config of orderedConfigs) {
      try {
        const decrypted = await this.aiConfigService.getDecryptedConfig(config.id);

        const withinBudget = await this.costTracker.checkBudgetLimit(
          config.provider,
          decrypted.dailyBudgetLimit,
        );
        if (!withinBudget) {
          errors.push({ provider: config.provider, error: '일일 예산 한도 초과' });
          this.logger.warn(
            `Provider ${config.provider} (${config.id}) budget exceeded, falling back`,
          );
          continue;
        }

        const provider = await AIProviderFactory.create(decrypted.provider as AIProviderName, {
          apiKey: decrypted.apiKey ?? undefined,
          region: decrypted.region ?? undefined,
          accessKeyId: decrypted.accessKeyId ?? undefined,
          secretKey: decrypted.secretKey ?? undefined,
          modelId: decrypted.modelId ?? undefined,
          maxTokens: decrypted.maxTokens,
          temperature: decrypted.temperature,
        });

        const response = await provider.generate(options);

        await this.costTracker.trackCall({
          provider: config.provider,
          model: response.model,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
          operation: 'generate',
          feature,
        });

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push({ provider: config.provider, error: errorMessage });
        this.logger.warn(
          `Provider ${config.provider} (${config.id}) failed: ${errorMessage}, trying next`,
        );
      }
    }

    const summary = errors.map((e) => `${e.provider}(${e.error})`).join(', ');
    await this.costTracker.trackFailure(feature, summary);
    throw new ApiException(503, 'AI_002', `모든 AI 프로바이더 실패: ${summary}`);
  }

  async generateStructured<T>(
    options: AIRequestOptions,
    schema: z.ZodSchema<T>,
    preferredProvider?: string,
    familyId?: string,
    feature?: string,
  ): Promise<T> {
    if (familyId) {
      await this.checkAiAccess(familyId);
    }

    let lastError: string | undefined;

    for (let attempt = 0; attempt < MAX_STRUCTURED_RETRIES; attempt++) {
      const messages = [...options.messages];

      if (attempt > 0 && lastError) {
        messages.push({
          role: 'user',
          content: `이전 응답이 스키마 검증에 실패했습니다. 오류: ${lastError}\n\n올바른 JSON 형식으로 다시 응답해주세요.`,
        });
      }

      const response = await this.generate(
        { ...options, messages },
        preferredProvider,
        undefined,
        feature,
      );
      const jsonStr = this.extractJson(response.content);

      try {
        const parsed = JSON.parse(jsonStr);
        const result = schema.parse(parsed);
        return result as T;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Structured output validation failed (attempt ${attempt + 1}/${MAX_STRUCTURED_RETRIES}): ${lastError}`,
        );
      }
    }

    throw new ApiException(
      422,
      'AI_003',
      `AI 응답 스키마 검증 실패 (${MAX_STRUCTURED_RETRIES}회 재시도 후): ${lastError}`,
    );
  }

  async getAvailableProviders(): Promise<string[]> {
    const configs = await this.aiConfigService.findAll();
    return configs.filter((c) => c.isActive).map((c) => c.provider);
  }

  /**
   * 지금 이 가족이 AI 를 쓸 수 있는지 (가족 사용 범위 · 활성 연결 · 하루 호출 한도).
   * 화면에서 기본 입력 방식을 고를 때 씀. 사용 횟수는 세지 않음
   */
  async availability(familyId: string): Promise<{ available: boolean; reason?: string }> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { aiTier: true },
    });
    if (family?.aiTier === 'DISABLED') {
      return { available: false, reason: 'AI 기능이 꺼져 있어요' };
    }
    const familyLimit = family ? FAMILY_DAILY_LIMITS[family.aiTier] : Infinity;
    if (familyLimit !== Infinity) {
      const used = parseInt(
        (await this.redis.get(`auticare:ai-family:${familyId}:${kstDate()}`)) || '0',
      );
      if (used >= familyLimit) {
        return { available: false, reason: '오늘 쓸 수 있는 AI 횟수를 다 썼어요' };
      }
    }

    const active = (await this.aiConfigService.findAll()).filter((c) => c.isActive);
    if (active.length === 0) {
      return { available: false, reason: 'AI 연결이 아직 준비되지 않았어요' };
    }
    for (const config of active) {
      if (await this.costTracker.checkBudgetLimit(config.provider, config.dailyBudgetLimit)) {
        return { available: true };
      }
    }
    return { available: false, reason: '오늘 쓸 수 있는 AI 횟수를 다 썼어요' };
  }

  private async checkAiAccess(familyId: string): Promise<void> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { aiTier: true },
    });
    if (!family) return;

    if (family.aiTier === 'DISABLED') {
      throw new ApiException(403, 'AI_001', 'AI 기능이 비활성화되어 있습니다');
    }

    const dailyLimit = FAMILY_DAILY_LIMITS[family.aiTier];
    if (dailyLimit === Infinity) return;

    const key = `auticare:ai-family:${familyId}:${kstDate()}`;
    const count = parseInt((await this.redis.get(key)) || '0');
    if (count >= dailyLimit) {
      throw new ApiException(
        429,
        'AI_002',
        '오늘의 AI 사용량이 소진됐어요. 내일 다시 시도해주세요',
      );
    }

    await this.redis.incr(key);
    await this.redis.expire(key, 86400);
  }

  private buildFallbackChain(
    activeConfigs: Array<{ id: string; provider: string; isDefault: boolean }>,
    preferredProvider?: string,
  ): Array<{ id: string; provider: string; isDefault: boolean }> {
    const ordered: Array<{ id: string; provider: string; isDefault: boolean }> = [];
    const added = new Set<string>();

    if (preferredProvider) {
      const preferred = activeConfigs.find((c) => c.provider === preferredProvider);
      if (preferred) {
        ordered.push(preferred);
        added.add(preferred.id);
      }
    }

    const defaultConfig = activeConfigs.find((c) => c.isDefault);
    if (defaultConfig && !added.has(defaultConfig.id)) {
      ordered.push(defaultConfig);
      added.add(defaultConfig.id);
    }

    for (const config of activeConfigs) {
      if (!added.has(config.id)) {
        ordered.push(config);
        added.add(config.id);
      }
    }

    return ordered;
  }

  private extractJson(content: string): string {
    const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    const startsFence = content.match(/^```(?:json)?\s*\n?([\s\S]*)/);
    if (startsFence) {
      return startsFence[1].trim();
    }
    return content.trim();
  }
}
