import { Controller, Get, Post, Patch, Delete, Param, Query } from '@nestjs/common';
import { UserRole } from '@auticare/prisma-client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CurriculumService } from './curriculum.service.js';
import { CurriculumBatchService } from './curriculum-batch.service.js';

@Controller()
export class CurriculumController {
  constructor(
    private curriculumService: CurriculumService,
    private batchService: CurriculumBatchService,
  ) {}

  @Post('children/:childId/curriculum/generate')
  async generate(@Param('childId') childId: string, @CurrentUser() user: { id: string }) {
    return this.curriculumService.generateForChild(childId, user.id);
  }

  @Get('children/:childId/curriculum/today')
  async getToday(@Param('childId') childId: string, @CurrentUser() user: { id: string }) {
    return this.curriculumService.getTodayCurriculum(childId, user.id);
  }

  @Get('children/:childId/curricula')
  async getHistory(
    @Param('childId') childId: string,
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.curriculumService.getCurriculumHistory(childId, user.id, parsedLimit);
  }

  @Get('curricula/:curriculumId')
  async getOne(@Param('curriculumId') curriculumId: string, @CurrentUser() user: { id: string }) {
    return this.curriculumService.getOneCurriculum(curriculumId, user.id);
  }

  @Patch('curricula/:curriculumId/confirm')
  async confirm(@Param('curriculumId') curriculumId: string, @CurrentUser() user: { id: string }) {
    return this.curriculumService.confirmCurriculum(curriculumId, user.id);
  }

  @Patch('curricula/:curriculumId/complete')
  async complete(@Param('curriculumId') curriculumId: string, @CurrentUser() user: { id: string }) {
    return this.curriculumService.completeCurriculum(curriculumId, user.id);
  }

  @Post('curricula/:curriculumId/regenerate')
  async regenerate(
    @Param('curriculumId') curriculumId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.curriculumService.regenerateCurriculum(curriculumId, user.id);
  }

  @Delete('curricula/:curriculumId')
  async deleteCurriculum(
    @Param('curriculumId') curriculumId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.curriculumService.deleteCurriculum(curriculumId, user.id);
    return null;
  }

  @Post('admin/curriculum/batch')
  @Roles(UserRole.SYSTEM_ADMIN)
  async triggerBatch(@CurrentUser() user: { id: string }) {
    return this.batchService.runNightlyGeneration();
  }
}
