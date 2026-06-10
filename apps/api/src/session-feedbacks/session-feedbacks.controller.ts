import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import {
  SessionFeedbacksService,
  CreateSessionFeedbackInput,
  UpdateSessionFeedbackInput,
  QuerySessionFeedbackInput,
} from './session-feedbacks.service.js';
import { FeedbackDigestService } from './feedback-digest.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

interface JwtPayload {
  id: string;
  role: string;
  familyId?: string | null;
}

@Controller()
export class SessionFeedbacksController {
  constructor(
    private readonly service: SessionFeedbacksService,
    private readonly digestService: FeedbackDigestService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  @Post('children/:childId/session-feedbacks')
  async create(
    @Param('childId') childId: string,
    @Body() input: CreateSessionFeedbackInput,
    @CurrentUser() user: JwtPayload,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) {
      throw new (await import('../common/exceptions/api.exception.js')).ApiException(
        400,
        'FAMILY_001',
        '가족 정보를 찾을 수 없습니다',
      );
    }
    return this.service.create(childId, familyId, user.id, input);
  }

  @Get('children/:childId/session-feedbacks')
  async findByChild(
    @Param('childId') childId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sessionType') sessionType?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: QuerySessionFeedbackInput = {
      from,
      to,
      sessionType,
      scheduleId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.service.findByChild(childId, query);
  }

  @Get('children/:childId/session-feedbacks/stats')
  async getStats(@Param('childId') childId: string) {
    return this.service.getStats(childId);
  }

  @Get('children/:childId/session-feedbacks/autocomplete')
  async getAutocomplete(@Param('childId') childId: string) {
    return this.service.getAutocomplete(childId);
  }

  @Patch('session-feedbacks/:id')
  async update(
    @Param('id') id: string,
    @Body() input: UpdateSessionFeedbackInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, user.id, input);
  }

  @Delete('session-feedbacks/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.service.remove(id, user.id);
    return { message: '피드백이 삭제되었습니다' };
  }

  @Get('children/:childId/feedback-digests')
  async getDigests(@Param('childId') childId: string, @Query('limit') limit?: string) {
    return this.digestService.findByChild(childId, limit ? parseInt(limit, 10) : 8);
  }

  @Post('children/:childId/feedback-digests/generate')
  async generateDigest(@Param('childId') childId: string) {
    return this.digestService.generateForChild(childId);
  }
}
