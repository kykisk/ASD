import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { InsightsService } from './insights.service.js';

@Controller()
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get('children/:childId/insights/weekly')
  async getWeeklyInsight(
    @Param('childId') childId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.insightsService.getWeeklyInsight(childId, user.id);
  }

  @Get('children/:childId/insights/history')
  async getInsightHistory(
    @Param('childId') childId: string,
    @Query('weeks') weeks: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    const numWeeks = weeks ? parseInt(weeks, 10) : 4;
    return this.insightsService.getInsightHistory(childId, user.id, numWeeks);
  }
}
