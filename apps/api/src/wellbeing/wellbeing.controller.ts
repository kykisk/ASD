import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WellbeingService } from './wellbeing.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Controller()
export class WellbeingController {
  constructor(
    private readonly wellbeingService: WellbeingService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  @Post('wellbeing/children/:childId')
  async createCheckin(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('childId') childId: string,
    @Body() body: { mood: number; stressLevel: number; notes?: string },
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { error: 'No family found' };
    return this.wellbeingService.createCheckin(user.id, childId, familyId, body);
  }

  @Get('wellbeing/children/:childId')
  async getHistory(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Query('limit') limit?: string,
  ) {
    return this.wellbeingService.getHistory(
      user.id,
      childId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('wellbeing/children/:childId/stats')
  async getStats(@CurrentUser() user: { id: string }, @Param('childId') childId: string) {
    return this.wellbeingService.getStats(user.id, childId);
  }
}
