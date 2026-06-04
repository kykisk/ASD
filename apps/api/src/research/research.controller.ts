import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ResearchService } from './research.service.js';
import { ResearchBatchService } from './research-batch.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@auticare/prisma-client';

@Controller()
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly researchBatchService: ResearchBatchService,
  ) {}

  @Get('research/feed')
  async getResearchFeed(
    @CurrentUser() user: { id: string; familyId: string },
    @Query('childId') childId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.researchService.getResearchFeed(
      user.familyId,
      childId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('research/:articleId/bookmark')
  async bookmarkArticle(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('articleId') articleId: string,
  ) {
    return this.researchService.bookmarkArticle(user.familyId, articleId);
  }

  @Post('research/:articleId/read')
  async markAsRead(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('articleId') articleId: string,
  ) {
    return this.researchService.markAsRead(user.familyId, articleId);
  }

  @Get('research/bookmarks')
  async getBookmarks(@CurrentUser() user: { id: string; familyId: string }) {
    return this.researchService.getBookmarks(user.familyId);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('admin/research/batch')
  async triggerBatch() {
    return this.researchBatchService.runWeeklyBatch();
  }
}
