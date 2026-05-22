import { Injectable, Logger } from '@nestjs/common';
import { AIProviderFactory } from '@auticare/ai-provider';
import type { AIProvider, AIRequestOptions, AIResponse } from '@auticare/ai-provider';
import type { AIProviderName } from '@auticare/ai-provider';
import { AiConfigService } from '../ai-config/ai-config.service.js';
import { AICostTrackingService } from './ai-cost-tracking.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { z } from 'zod';

const MAX_STRUCTURED_RETRIES = 3;

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly costTracker: AICostTrackingService,
  ) {}

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
  ): Promise<AIResponse> {
    const configs = await this.aiConfigService.findAll();
    const activeConfigs = configs.filter((c) => c.isActive);

    if (activeConfigs.length === 0) {
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
          this.logger.warn(`Provider ${config.provider} (${config.id}) budget exceeded, falling back`);
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

    throw new ApiException(
      503,
      'AI_002',
      `모든 AI 프로바이더 실패: ${errors.map((e) => `${e.provider}(${e.error})`).join(', ')}`,
    );
  }

  async generateStructured<T>(
    options: AIRequestOptions,
    schema: z.ZodSchema<T>,
    preferredProvider?: string,
  ): Promise<T> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < MAX_STRUCTURED_RETRIES; attempt++) {
      const messages = [...options.messages];

      if (attempt > 0 && lastError) {
        messages.push({
          role: 'user',
          content: `이전 응답이 스키마 검증에 실패했습니다. 오류: ${lastError}\n\n올바른 JSON 형식으로 다시 응답해주세요.`,
        });
      }

      const response = await this.generate({ ...options, messages }, preferredProvider);
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
    return content.trim();
  }
}
