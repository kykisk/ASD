import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import {
  CreateConcernDto,
  StartTrialDto,
  TeacherOpinionDto,
  UpdateConcernDto,
  UpdateTrialDto,
} from '@auticare/dto';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ConcernsService } from './concerns.service.js';

/** 맞는 방법 찾기 (우리 아이 고민) */
@Controller()
export class ConcernsController {
  constructor(private readonly service: ConcernsService) {}

  /** 고민 목록 + 자주 기록된 힘든 행동 제안 */
  @Get('children/:childId/concerns')
  async list(@Param('childId') childId: string, @CurrentUser() user: { id: string }) {
    return this.service.list(childId, user.id);
  }

  @Post('children/:childId/concerns')
  async create(
    @Param('childId') childId: string,
    @Body() dto: CreateConcernDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(childId, user.id, dto);
  }

  /** 관점 · 패턴 · 시도 · 선생님 의견 한 번에 */
  @Get('concerns/:id')
  async detail(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.detail(id, user.id);
  }

  @Patch('concerns/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConcernDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete('concerns/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.remove(id, user.id);
  }

  /** AI 가 여러 관점 · 방법 · 관련 논문을 정리 (10~30초) */
  @Post('concerns/:id/perspectives')
  async perspectives(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.generatePerspectives(id, user.id);
  }

  @Post('concerns/:id/trials')
  async startTrial(
    @Param('id') id: string,
    @Body() dto: StartTrialDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.startTrial(id, user.id, dto);
  }

  @Patch('trials/:id')
  async updateTrial(
    @Param('id') id: string,
    @Body() dto: UpdateTrialDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateTrial(id, user.id, dto);
  }

  /** '선생님께 보여드리기'에서 받은 의견 */
  @Post('concerns/:id/teacher-opinions')
  async teacherOpinion(
    @Param('id') id: string,
    @Body() dto: TeacherOpinionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.addTeacherOpinion(id, user.id, dto);
  }
}
