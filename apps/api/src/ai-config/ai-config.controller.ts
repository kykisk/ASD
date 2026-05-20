import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { UserRole } from '@auticare/prisma-client';
import type { AiProvider } from '@auticare/prisma-client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AiConfigService } from './ai-config.service.js';
import { UpsertAiConfigDto } from '@auticare/dto';
import { ApiException } from '../common/exceptions/api.exception.js';

const VALID_PROVIDERS = ['CLAUDE_BEDROCK', 'CLAUDE_DIRECT', 'GEMINI', 'OPENAI'];

@Controller('v1/admin/ai-config')
@Roles(UserRole.SYSTEM_ADMIN)
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get()
  async findAll() {
    return this.aiConfigService.findAll();
  }

  @Put(':provider')
  async upsert(
    @Param('provider') provider: string,
    @Body() dto: UpsertAiConfigDto,
  ) {
    this.validateProvider(provider);
    return this.aiConfigService.upsert({ ...dto, provider: provider as UpsertAiConfigDto['provider'] });
  }

  @Get(':provider/test')
  async testConnection(@Param('provider') provider: string) {
    this.validateProvider(provider);
    return this.aiConfigService.testConnection(provider as AiProvider);
  }

  @Delete(':provider')
  async remove(@Param('provider') provider: string) {
    this.validateProvider(provider);
    await this.aiConfigService.remove(provider as AiProvider);
    return { message: 'AI 설정이 삭제되었습니다' };
  }

  private validateProvider(provider: string): void {
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new ApiException(
        400,
        'INVALID_PROVIDER',
        `유효하지 않은 AI 제공자입니다: ${provider}`,
      );
    }
  }
}
