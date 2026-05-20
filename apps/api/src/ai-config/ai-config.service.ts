import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { EncryptionService } from '@auticare/encryption';
import type { EncryptedPayload } from '@auticare/encryption';
import type { AiProvider } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import type {
  UpsertAiConfigInput,
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
      orderBy: { provider: 'asc' },
    });

    return Promise.all(
      configs.map(async (config) => this.toResponse(config)),
    );
  }

  async findOne(provider: AiProvider): Promise<AiConfigResponse> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      throw new ApiException(
        404,
        'AI_CONFIG_NOT_FOUND',
        `AI 설정을 찾을 수 없습니다: ${provider}`,
      );
    }

    return this.toResponse(config);
  }

  async upsert(dto: UpsertAiConfigInput): Promise<AiConfigResponse> {
    const existing = await this.prisma.aiConfig.findUnique({
      where: { provider: dto.provider as AiProvider },
    });

    const encryptedFields = await this.encryptCredentials(dto, existing);

    const data = {
      isActive: dto.isActive ?? false,
      isDefault: dto.isDefault ?? false,
      modelId: dto.modelId ?? null,
      maxTokens: dto.maxTokens ?? 4096,
      temperature: dto.temperature ?? 0.7,
      dailyBudgetLimit: dto.dailyBudgetLimit ?? 100,
      ...encryptedFields,
    };

    const config = await this.prisma.aiConfig.upsert({
      where: { provider: dto.provider as AiProvider },
      create: {
        provider: dto.provider as AiProvider,
        ...data,
      },
      update: data,
    });

    return this.toResponse(config);
  }

  async remove(provider: AiProvider): Promise<void> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      throw new ApiException(
        404,
        'AI_CONFIG_NOT_FOUND',
        `AI 설정을 찾을 수 없습니다: ${provider}`,
      );
    }

    await this.prisma.aiConfig.delete({ where: { provider } });
  }

  async testConnection(
    provider: AiProvider,
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      return { success: false, latencyMs: 0, error: 'Configuration not found' };
    }

    const start = Date.now();

    const hasCredentials =
      config.encApiKey !== null || config.encAccessKeyId !== null;

    if (!hasCredentials) {
      await this.prisma.aiConfig.update({
        where: { provider },
        data: { lastTestedAt: new Date(), lastTestSuccess: false },
      });
      return { success: false, latencyMs: 0, error: 'No credentials configured' };
    }

    const latencyMs = Date.now() - start;

    await this.prisma.aiConfig.update({
      where: { provider },
      data: { lastTestedAt: new Date(), lastTestSuccess: true },
    });

    return { success: true, latencyMs };
  }

  async getDecryptedConfig(provider: AiProvider): Promise<DecryptedAiConfig> {
    const config = await this.prisma.aiConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      throw new ApiException(
        404,
        'AI_CONFIG_NOT_FOUND',
        `AI 설정을 찾을 수 없습니다: ${provider}`,
      );
    }

    let apiKey: string | null = null;
    let region: string | null = null;
    let accessKeyId: string | null = null;
    let secretKey: string | null = null;

    if (config.encApiKey && config.encIv && config.encAuthTag && config.encSalt) {
      apiKey = await this.encryption.decryptString({
        ciphertext: config.encApiKey,
        iv: config.encIv,
        authTag: config.encAuthTag,
        salt: config.encSalt,
      });
    }

    if (config.encRegion && config.encIv && config.encAuthTag && config.encSalt) {
      region = await this.encryption.decryptString({
        ciphertext: config.encRegion,
        iv: config.encIv,
        authTag: config.encAuthTag,
        salt: config.encSalt,
      });
    }

    if (config.encAccessKeyId && config.encIv && config.encAuthTag && config.encSalt) {
      accessKeyId = await this.encryption.decryptString({
        ciphertext: config.encAccessKeyId,
        iv: config.encIv,
        authTag: config.encAuthTag,
        salt: config.encSalt,
      });
    }

    if (config.encSecretKey && config.encIv && config.encAuthTag && config.encSalt) {
      secretKey = await this.encryption.decryptString({
        ciphertext: config.encSecretKey,
        iv: config.encIv,
        authTag: config.encAuthTag,
        salt: config.encSalt,
      });
    }

    return {
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

  private async encryptCredentials(
    dto: UpsertAiConfigInput,
    existing: { encApiKey: string | null; encRegion: string | null; encAccessKeyId: string | null; encSecretKey: string | null; encIv: string | null; encAuthTag: string | null; encSalt: string | null } | null,
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

    let encApiKey: string | null = existing?.encApiKey ?? null;
    let encRegion: string | null = existing?.encRegion ?? null;
    let encAccessKeyId: string | null = existing?.encAccessKeyId ?? null;
    let encSecretKey: string | null = existing?.encSecretKey ?? null;
    let encIv: string | null = existing?.encIv ?? null;
    let encAuthTag: string | null = existing?.encAuthTag ?? null;
    let encSalt: string | null = existing?.encSalt ?? null;

    const payload: Record<string, string> = {};
    if (dto.apiKey !== undefined) payload['apiKey'] = dto.apiKey;
    if (dto.region !== undefined) payload['region'] = dto.region;
    if (dto.accessKeyId !== undefined) payload['accessKeyId'] = dto.accessKeyId;
    if (dto.secretKey !== undefined) payload['secretKey'] = dto.secretKey;

    if (Object.keys(payload).length > 0) {
      const encrypted = await this.encryption.encryptString(
        JSON.stringify(payload),
      );
      encApiKey = encrypted.ciphertext;
      encIv = encrypted.iv;
      encAuthTag = encrypted.authTag;
      encSalt = encrypted.salt;
      encRegion = null;
      encAccessKeyId = null;
      encSecretKey = null;
    }

    return {
      encApiKey,
      encRegion,
      encAccessKeyId,
      encSecretKey,
      encIv,
      encAuthTag,
      encSalt,
    };
  }

  private async maskCredential(encryptedCiphertext: string | null, iv: string | null, authTag: string | null, salt: string | null): Promise<string | null> {
    if (!encryptedCiphertext || !iv || !authTag || !salt) return null;

    try {
      const decrypted = await this.encryption.decryptString({
        ciphertext: encryptedCiphertext,
        iv,
        authTag,
        salt,
      });

      try {
        const parsed = JSON.parse(decrypted) as Record<string, string>;
        if (parsed['apiKey']) {
          const key = parsed['apiKey'];
          return key.length > 4
            ? `****${key.slice(-4)}`
            : '****';
        }
        return '****[configured]';
      } catch {
        return decrypted.length > 4
          ? `****${decrypted.slice(-4)}`
          : '****';
      }
    } catch {
      return '****[error]';
    }
  }

  private async toResponse(config: {
    id: string;
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
    let maskedRegion: string | null = null;
    let maskedAccessKeyId: string | null = null;
    let maskedSecretKey: string | null = null;

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
          if (parsed['region']) {
            const r = parsed['region'];
            maskedRegion = r.length > 4 ? `****${r.slice(-4)}` : '****';
          }
          if (parsed['accessKeyId']) {
            const a = parsed['accessKeyId'];
            maskedAccessKeyId = a.length > 4 ? `****${a.slice(-4)}` : '****';
          }
          if (parsed['secretKey']) {
            const s = parsed['secretKey'];
            maskedSecretKey = s.length > 4 ? `****${s.slice(-4)}` : '****';
          }
        } catch {
          maskedApiKey = decrypted.length > 4
            ? `****${decrypted.slice(-4)}`
            : '****';
        }
      } catch {
        maskedApiKey = '****[error]';
      }
    }

    return {
      id: config.id,
      provider: config.provider,
      isActive: config.isActive,
      isDefault: config.isDefault,
      maskedApiKey,
      maskedRegion,
      maskedAccessKeyId,
      maskedSecretKey,
      modelId: config.modelId,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      dailyBudgetLimit: config.dailyBudgetLimit,
      lastTestedAt: config.lastTestedAt,
      lastTestSuccess: config.lastTestSuccess,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
