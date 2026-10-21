import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import { AIProviderFactory } from '@auticare/ai-provider';
import type { AIProviderName } from '@auticare/ai-provider';
import type { AiProvider } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import type {
  CreateAiConfigInput,
  UpdateAiConfigInput,
  AiConfigResponse,
  DecryptedAiConfig,
} from '@auticare/dto';

interface EncryptedFields {
  encApiKey: string | null;
  encRegion: string | null;
  encAccessKeyId: string | null;
  encSecretKey: string | null;
  encIv: string | null;
  encAuthTag: string | null;
  encSalt: string | null;
}

@Injectable()
export class AiConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findAll(): Promise<AiConfigResponse[]> {
    const configs = await this.prisma.aiConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return Promise.all(configs.map(async (config) => this.toResponse(config)));
  }

  async findOne(id: string): Promise<AiConfigResponse> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new ApiException(404, 'AI_CONFIG_NOT_FOUND', `AI 설정을 찾을 수 없습니다: ${id}`);
    }

    return this.toResponse(config);
  }

  async create(dto: CreateAiConfigInput): Promise<AiConfigResponse> {
    const encryptedFields = await this.encryptCredentials(dto, null);

    if (dto.isDefault) {
      await this.prisma.aiConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await this.prisma.aiConfig.create({
      data: {
        name: dto.name,
        provider: dto.provider as AiProvider,
        isActive: dto.isActive ?? false,
        isDefault: dto.isDefault ?? false,
        modelId: dto.modelId ?? null,
        maxTokens: dto.maxTokens ?? 4096,
        temperature: dto.temperature ?? 0.7,
        dailyBudgetLimit: dto.dailyBudgetLimit ?? 100,
        ...encryptedFields,
      },
    });

    return this.toResponse(config);
  }

  async update(id: string, dto: UpdateAiConfigInput): Promise<AiConfigResponse> {
    const existing = await this.prisma.aiConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiException(404, 'AI_CONFIG_NOT_FOUND', `AI 설정을 찾을 수 없습니다: ${id}`);
    }

    const encryptedFields = await this.encryptCredentials(dto, existing);

    if (dto.isDefault) {
      await this.prisma.aiConfig.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = { ...encryptedFields };
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.isDefault !== undefined) data['isDefault'] = dto.isDefault;
    if (dto.modelId !== undefined) data['modelId'] = dto.modelId;
    if (dto.maxTokens !== undefined) data['maxTokens'] = dto.maxTokens;
    if (dto.temperature !== undefined) data['temperature'] = dto.temperature;
    if (dto.dailyBudgetLimit !== undefined) data['dailyBudgetLimit'] = dto.dailyBudgetLimit;

    const config = await this.prisma.aiConfig.update({
      where: { id },
      data,
    });

    return this.toResponse(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new ApiException(404, 'AI_CONFIG_NOT_FOUND', `AI 설정을 찾을 수 없습니다: ${id}`);
    }

    await this.prisma.aiConfig.delete({ where: { id } });
  }

  async setDefault(id: string): Promise<AiConfigResponse> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new ApiException(404, 'AI_CONFIG_NOT_FOUND', `AI 설정을 찾을 수 없습니다: ${id}`);
    }

    await this.prisma.aiConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.aiConfig.update({
      where: { id },
      data: { isDefault: true },
    });

    return this.toResponse(updated);
  }

  /** 실제로 AI 를 짧게 한 번 불러서 키·모델이 동작하는지 확인 */
  async testConnectionById(
    id: string,
  ): Promise<{ success: boolean; latencyMs: number; model?: string; error?: string }> {
    const exists = await this.prisma.aiConfig.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return { success: false, latencyMs: 0, error: '설정을 찾을 수 없습니다' };
    }

    const start = Date.now();
    let result: { success: boolean; latencyMs: number; model?: string; error?: string };
    try {
      const config = await this.getDecryptedConfig(id);
      if (!config.apiKey && !config.accessKeyId) {
        throw new Error('저장된 키가 없습니다');
      }
      const provider = await AIProviderFactory.create(config.provider as AIProviderName, {
        apiKey: config.apiKey ?? undefined,
        region: config.region ?? undefined,
        accessKeyId: config.accessKeyId ?? undefined,
        secretKey: config.secretKey ?? undefined,
        modelId: config.modelId ?? undefined,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });
      const response = await provider.generate({
        messages: [{ role: 'user', content: '연결 확인입니다. "OK" 한 단어로만 답하세요.' }],
        maxTokens: 50,
      });
      result = { success: true, latencyMs: Date.now() - start, model: response.model };
    } catch (err) {
      result = {
        success: false,
        latencyMs: Date.now() - start,
        error: (err instanceof Error ? err.message : String(err)).slice(0, 300),
      };
    }

    await this.prisma.aiConfig.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestSuccess: result.success },
    });
    return result;
  }

  async getDecryptedConfig(id: string): Promise<DecryptedAiConfig> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new ApiException(404, 'AI_CONFIG_NOT_FOUND', `AI 설정을 찾을 수 없습니다: ${id}`);
    }

    let apiKey: string | null = null;
    let region: string | null = null;
    let accessKeyId: string | null = null;
    let secretKey: string | null = null;

    if (config.encApiKey && config.encIv && config.encAuthTag && config.encSalt) {
      try {
        const decrypted = await this.encryption.decryptString({
          ciphertext: config.encApiKey,
          iv: config.encIv,
          authTag: config.encAuthTag,
          salt: config.encSalt,
        });

        try {
          const parsed = JSON.parse(decrypted) as Record<string, string>;
          apiKey = parsed['apiKey'] ?? null;
          region = parsed['region'] ?? null;
          accessKeyId = parsed['accessKeyId'] ?? null;
          secretKey = parsed['secretKey'] ?? null;
        } catch {
          apiKey = decrypted;
        }
      } catch {
        // intentionally left empty: decryption failure leaves values as null
      }
    }

    return {
      id: config.id,
      name: config.name,
      provider: config.provider,
      isActive: config.isActive,
      isDefault: config.isDefault,
      apiKey,
      region,
      accessKeyId,
      secretKey,
      modelId: config.modelId,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      dailyBudgetLimit: config.dailyBudgetLimit,
    };
  }

  async getDecryptedDefaultConfig(): Promise<DecryptedAiConfig> {
    const defaultConfig = await this.prisma.aiConfig.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (defaultConfig) {
      return this.getDecryptedConfig(defaultConfig.id);
    }

    const anyActive = await this.prisma.aiConfig.findFirst({
      where: { isActive: true },
    });

    if (!anyActive) {
      throw new ApiException(503, 'AI_001', '활성화된 AI 프로바이더가 없습니다');
    }

    return this.getDecryptedConfig(anyActive.id);
  }

  private async decryptPayload(existing: {
    encApiKey: string | null;
    encIv: string | null;
    encAuthTag: string | null;
    encSalt: string | null;
  }): Promise<Record<string, string>> {
    if (!existing.encApiKey || !existing.encIv || !existing.encAuthTag || !existing.encSalt) {
      return {};
    }
    try {
      const decrypted = await this.encryption.decryptString({
        ciphertext: existing.encApiKey,
        iv: existing.encIv,
        authTag: existing.encAuthTag,
        salt: existing.encSalt,
      });
      try {
        return JSON.parse(decrypted) as Record<string, string>;
      } catch {
        return { apiKey: decrypted };
      }
    } catch {
      return {};
    }
  }

  private async encryptCredentials(
    dto: { apiKey?: string; region?: string; accessKeyId?: string; secretKey?: string },
    existing: {
      encApiKey: string | null;
      encRegion: string | null;
      encAccessKeyId: string | null;
      encSecretKey: string | null;
      encIv: string | null;
      encAuthTag: string | null;
      encSalt: string | null;
    } | null,
  ): Promise<EncryptedFields> {
    const hasNewCredentials =
      dto.apiKey !== undefined ||
      dto.region !== undefined ||
      dto.accessKeyId !== undefined ||
      dto.secretKey !== undefined;

    if (!hasNewCredentials && existing) {
      return {
        encApiKey: existing.encApiKey,
        encRegion: existing.encRegion,
        encAccessKeyId: existing.encAccessKeyId,
        encSecretKey: existing.encSecretKey,
        encIv: existing.encIv,
        encAuthTag: existing.encAuthTag,
        encSalt: existing.encSalt,
      };
    }

    if (!hasNewCredentials) {
      return {
        encApiKey: null,
        encRegion: null,
        encAccessKeyId: null,
        encSecretKey: null,
        encIv: null,
        encAuthTag: null,
        encSalt: null,
      };
    }

    // 일부 키만 바꿔도 나머지 저장된 키가 지워지지 않도록 기존 값에 덮어씀
    const payload: Record<string, string> = existing ? await this.decryptPayload(existing) : {};
    if (dto.apiKey !== undefined) payload['apiKey'] = dto.apiKey;
    if (dto.region !== undefined) payload['region'] = dto.region;
    if (dto.accessKeyId !== undefined) payload['accessKeyId'] = dto.accessKeyId;
    if (dto.secretKey !== undefined) payload['secretKey'] = dto.secretKey;

    const encrypted = await this.encryption.encryptString(JSON.stringify(payload));

    return {
      encApiKey: encrypted.ciphertext,
      encRegion: null,
      encAccessKeyId: null,
      encSecretKey: null,
      encIv: encrypted.iv,
      encAuthTag: encrypted.authTag,
      encSalt: encrypted.salt,
    };
  }

  private async toResponse(config: {
    id: string;
    name: string;
    provider: AiProvider;
    isActive: boolean;
    isDefault: boolean;
    encApiKey: string | null;
    encRegion: string | null;
    encAccessKeyId: string | null;
    encSecretKey: string | null;
    encIv: string | null;
    encAuthTag: string | null;
    encSalt: string | null;
    modelId: string | null;
    maxTokens: number;
    temperature: number;
    dailyBudgetLimit: number;
    lastTestedAt: Date | null;
    lastTestSuccess: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<AiConfigResponse> {
    let maskedApiKey: string | null = null;
    let maskedAccessKeyId: string | null = null;

    if (config.encApiKey && config.encIv && config.encAuthTag && config.encSalt) {
      try {
        const decrypted = await this.encryption.decryptString({
          ciphertext: config.encApiKey,
          iv: config.encIv,
          authTag: config.encAuthTag,
          salt: config.encSalt,
        });

        try {
          const parsed = JSON.parse(decrypted) as Record<string, string>;
          if (parsed['apiKey']) {
            const k = parsed['apiKey'];
            maskedApiKey = k.length > 4 ? `****${k.slice(-4)}` : '****';
          }
          if (parsed['accessKeyId']) {
            const a = parsed['accessKeyId'];
            maskedAccessKeyId = a.length > 4 ? `****${a.slice(-4)}` : '****';
          }
        } catch {
          maskedApiKey = decrypted.length > 4 ? `****${decrypted.slice(-4)}` : '****';
        }
      } catch {
        maskedApiKey = '****[error]';
      }
    }

    return {
      id: config.id,
      name: config.name,
      provider: config.provider,
      isActive: config.isActive,
      isDefault: config.isDefault,
      maskedApiKey,
      maskedAccessKeyId,
      modelId: config.modelId,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      dailyBudgetLimit: config.dailyBudgetLimit,
      lastTestedAt: config.lastTestedAt,
      lastTestSuccess: config.lastTestSuccess,
      createdAt: config.createdAt,
    };
  }
}
