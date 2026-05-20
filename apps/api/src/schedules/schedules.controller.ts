import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { ConflictDetectionService } from './conflict-detection.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateScheduleDto, UpdateScheduleDto, QueryScheduleDto } from '@auticare/dto';

@Controller('v1')
export class SchedulesController {
  constructor(
    private schedulesService: SchedulesService,
    private conflictDetectionService: ConflictDetectionService,
  ) {}

  @Post('children/:childId/schedules')
  async create(
    @CurrentUser() user: { id: string; familyId: string },
    @Param('childId') childId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(childId, user.familyId, user.id, dto);
  }

  @Get('children/:childId/schedules')
  async findByChild(
    @CurrentUser() user: { id: string },
    @Param('childId') childId: string,
    @Query() query: QueryScheduleDto,
  ) {
    return this.schedulesService.findByChild(childId, user.id, query);
  }

  @Get('schedules/:id')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.schedulesService.findOne(id, user.id);
  }

  @Patch('schedules/:id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, user.id, dto);
  }

  @Delete('schedules/:id')
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.schedulesService.remove(id, user.id);
  }

  @Post('schedules/check-conflicts')
  async checkConflicts(
    @Body() body: { childId: string; startTime: string; endTime: string; excludeId?: string },
  ) {
    return this.conflictDetectionService.detectConflicts(
      body.childId,
      new Date(body.startTime),
      new Date(body.endTime),
      body.excludeId,
    );
  }
}
