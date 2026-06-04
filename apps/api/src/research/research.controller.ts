import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ResearchService } from './research.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Controller()
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  @Get('research/feed')
  async getResearchFeed(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Query('childId') childId?: string,
    @Query('limit') limit?: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return [];
    return this.researchService.getResearchFeed(
      familyId,
      childId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('research/:articleId/bookmark')
  async bookmarkArticle(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('articleId') articleId: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { bookmarked: false };
    return this.researchService.bookmarkArticle(familyId, articleId);
  }

  @Post('research/:articleId/read')
  async markAsRead(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('articleId') articleId: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { read: false };
    return this.researchService.markAsRead(familyId, articleId);
  }

  @Get('research/bookmarks')
  async getBookmarks(@CurrentUser() user: { id: string; familyId: string | null }) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return [];
    return this.researchService.getBookmarks(familyId);
  }
}
