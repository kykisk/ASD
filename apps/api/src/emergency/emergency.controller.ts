import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EmergencyService } from './emergency.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Controller()
export class EmergencyController {
  constructor(
    private readonly emergencyService: EmergencyService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  @Public()
  @Get('emergency/guides')
  getAllGuides() {
    return this.emergencyService.getAllGuides();
  }

  @Public()
  @Get('emergency/guides/:type')
  getGuide(@Param('type') type: string) {
    return this.emergencyService.getGuide(type);
  }

  @Post('emergency/children/:childId/events')
  async logEvent(
    @CurrentUser() user: { id: string; familyId: string | null },
    @Param('childId') childId: string,
    @Body()
    body: {
      type: string;
      severity: string;
      trigger?: string;
      durationMin?: number;
      interventions?: string[];
      outcome?: string;
      notes?: string;
    },
  ) {
    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) return { error: 'No family found' };
    return this.emergencyService.logEvent(user.id, childId, familyId, body);
  }

  @Get('emergency/children/:childId/events')
  async getHistory(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Query('limit') limit?: string,
  ) {
    return this.emergencyService.getHistory(
      childId,
      user.id,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('emergency/children/:childId/stats')
  async getStats(@CurrentUser() user: { id: string }, @Param('childId') childId: string) {
    return this.emergencyService.getStats(childId, user.id);
  }
}
