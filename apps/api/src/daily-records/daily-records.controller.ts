import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CreateDailyRecordDto } from '@auticare/dto';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DailyRecordsService } from './daily-records.service.js';

@Controller()
export class DailyRecordsController {
  constructor(private readonly service: DailyRecordsService) {}

  @Post('children/:childId/daily-records')
  async create(
    @Param('childId') childId: string,
    @Body() dto: CreateDailyRecordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(childId, user.id, dto);
  }

  /** date(YYYY-MM-DD, KST) 기록 요약. 없으면 오늘 */
  @Get('children/:childId/daily-records')
  async findByDate(
    @Param('childId') childId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.findByDate(childId, user.id, date);
  }
}
