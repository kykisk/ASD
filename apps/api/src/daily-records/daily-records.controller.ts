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

  /** 기록 모아보기: from~to(YYYY-MM-DD) 날짜별 묶음. 기본 최근 7일 */
  @Get('children/:childId/daily-records/timeline')
  async timeline(
    @Param('childId') childId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.timeline(childId, user.id, from, to);
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
