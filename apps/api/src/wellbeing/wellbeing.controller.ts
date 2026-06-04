import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WellbeingService } from './wellbeing.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class WellbeingController {
  constructor(private readonly wellbeingService: WellbeingService) {}

  @Post('wellbeing/children/:childId')
  async createCheckin(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('childId') childId: string,
    @Body() body: { mood: number; stressLevel: number; notes?: string },
  ) {
    return this.wellbeingService.createCheckin(user.id, childId, user.familyId, body);
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
