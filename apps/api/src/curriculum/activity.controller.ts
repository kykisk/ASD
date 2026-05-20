import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ActivityService } from './activity.service.js';
import { LogActivityDto } from '@auticare/dto';

@Controller()
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Post('activities')
  async logActivity(
    @CurrentUser() user: { id: string },
    @Body() dto: LogActivityDto,
  ) {
    return this.activityService.logActivity(user.id, dto);
  }

  @Get('curricula/:curriculumId/activities')
  async getActivityLogs(
    @Param('curriculumId') curriculumId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activityService.getActivityLogs(curriculumId, user.id);
  }

  @Delete('activities/:logId')
  async deleteActivityLog(
    @Param('logId') logId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.activityService.deleteActivityLog(logId, user.id);
    return { message: '활동 로그가 삭제되었습니다' };
  }
}
