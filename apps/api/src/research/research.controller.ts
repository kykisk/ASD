import { Controller, Get, Post, Delete, Patch, Param, Query } from '@nestjs/common';
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
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { items: [], total: 0, offset: 0, limit: 20, hasMore: false };
    return this.researchService.getResearchFeed(
      familyId,
      childId,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : 0,
      search,
    );
  }

  @Get('research/archived')
  async getArchived(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Query('limit') limit?: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return [];
    return this.researchService.getArchivedArticles(
      familyId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch('research/matches/:matchId/unarchive')
  async unarchive(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('matchId') matchId: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { success: false };
    await this.researchService.unarchiveArticle(matchId, familyId);
    return { success: true };
  }

  @Delete('research/archived')
  async deleteArchived(@CurrentUser() user: { id: string; familyId: string | null }) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { deleted: 0 };
    const count = await this.researchService.deleteArchivedArticles(familyId);
    return { deleted: count };
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

  @Get('research/digests')
  async getDigestHistory(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Query('childId') childId: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId || !childId) return [];
    return this.researchService.getDigestHistory(familyId, childId);
  }

  @Post('research/ai-digest')
  async generateAiDigest(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Query('childId') childId: string,
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId || !childId) {
      return {
        digest: '아이를 선택해주세요.',
        topArticles: [],
        generatedAt: new Date().toISOString(),
      };
    }
    return this.researchService.generateAiDigest(familyId, childId);
  }

  @Delete('research/digests/:id')
  async deleteDigest(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; familyId: string | null },
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return;
    await this.researchService.deleteDigest(id, familyId);
  }
}
