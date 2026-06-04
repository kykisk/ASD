import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ResearchService } from './research.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

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
}
