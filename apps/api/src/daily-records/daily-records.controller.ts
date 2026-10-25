import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AnalyzeFreeformDto, ConfirmFreeformDto, CreateDailyRecordDto } from '@auticare/dto';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DailyRecordsService } from './daily-records.service.js';
import { FreeformRecordService } from './freeform-record.service.js';

@Controller()
export class DailyRecordsController {
  constructor(
    private readonly service: DailyRecordsService,
    private readonly freeform: FreeformRecordService,
  ) {}

  /** 쭉 적기를 쓸 수 있는지 (AI 꺼짐 · 한도 초과면 화면이 자세히 입력으로 열림) */
  @Get('children/:childId/daily-records/freeform/availability')
  async freeformAvailability(
    @Param('childId') childId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.freeform.availability(childId, user.id);
  }

  /** 쭉 적기: AI 정리 초안 + 추가 질문. AI 실패면 원문을 일상 메모로 저장하고 FAILED */
  @Post('children/:childId/daily-records/freeform/analyze')
  async analyzeFreeform(
    @Param('childId') childId: string,
    @Body() dto: AnalyzeFreeformDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.freeform.analyze(childId, user.id, dto);
  }

  /** 쭉 적기: 부모가 확인한 정리 결과 + 질문 답으로 저장 (같은 날 기록에 합침) */
  @Post('children/:childId/daily-records/freeform/:entryId/confirm')
  async confirmFreeform(
    @Param('childId') childId: string,
    @Param('entryId') entryId: string,
    @Body() dto: ConfirmFreeformDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.freeform.confirm(childId, user.id, entryId, dto);
  }

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
