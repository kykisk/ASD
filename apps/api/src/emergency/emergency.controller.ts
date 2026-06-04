import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EmergencyService } from './emergency.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller()
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

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
    @CurrentUser() user: { id: string; familyId: string },
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
    return this.emergencyService.logEvent(user.id, childId, user.familyId, body);
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
