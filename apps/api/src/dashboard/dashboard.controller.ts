import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { GrowthService } from './growth.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('v1')
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private growthService: GrowthService,
  ) {}

  @Get('children/:childId/dashboard')
  async getDashboard(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
  ) {
    return this.dashboardService.getDashboardData(childId, user.id);
  }

  @Get('children/:childId/growth')
  async getGrowth(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.growthService.getGrowthData(childId, user.id, daysNum);
  }
}
