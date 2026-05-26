import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service.js';
import { NotificationTriggerService } from './notification-trigger.service.js';
import { NotificationsController } from './notifications.controller.js';
import { PushService } from './push.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationTriggerService, PushService],
  exports: [NotificationsService, NotificationTriggerService, PushService],
})
export class NotificationsModule {}
