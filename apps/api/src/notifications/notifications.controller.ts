import { Controller, Get, Patch, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';
import { PushService } from './push.service.js';
import { RegisterDeviceTokenDto, UnregisterDeviceTokenDto } from './dto/device-token.dto.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private pushService: PushService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findForUser(user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: { id: string }) {
    await this.notificationsService.markAllRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.notificationsService.markRead(id, user.id);
    return { success: true };
  }

  @Post('device-token')
  async registerDeviceToken(
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    await this.pushService.registerToken(user.id, dto.token, dto.platform);
    return { success: true };
  }

  @Delete('device-token')
  async unregisterDeviceToken(
    @CurrentUser() user: { id: string },
    @Body() dto: UnregisterDeviceTokenDto,
  ) {
    await this.pushService.unregisterToken(user.id, dto.token);
    return { success: true };
  }
}
