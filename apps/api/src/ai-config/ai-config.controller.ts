import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { UserRole } from '@auticare/prisma-client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AiConfigService } from './ai-config.service.js';
import { AiFeatureConfigService } from './ai-feature-config.service.js';
import { CreateAiConfigDto, UpdateAiConfigDto } from '@auticare/dto';

@Controller('admin/ai-config')
@Roles(UserRole.SYSTEM_ADMIN)
export class AiConfigController {
  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly aiFeatureConfigService: AiFeatureConfigService,
  ) {}

  @Get()
  async findAll() {
    return this.aiConfigService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateAiConfigDto) {
    return this.aiConfigService.create(dto);
  }

  @Get('feature-config')
  async getFeatureConfig() {
    return this.aiFeatureConfigService.getAll();
  }

  @Put('feature-config')
  async saveFeatureConfig(
    @Body() body: { mappings: Array<{ feature: string; configId: string | null }> },
  ) {
    await this.aiFeatureConfigService.saveAll(body.mappings);
    return { success: true };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.aiConfigService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAiConfigDto) {
    return this.aiConfigService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.aiConfigService.remove(id);
    return { message: 'AI 설정이 삭제되었습니다' };
  }

  @Post(':id/default')
  async setDefault(@Param('id') id: string) {
    return this.aiConfigService.setDefault(id);
  }

  @Get(':id/test')
  async testConnection(@Param('id') id: string) {
    return this.aiConfigService.testConnectionById(id);
  }
}
