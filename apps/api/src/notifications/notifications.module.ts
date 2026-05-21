import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationTriggerService } from './notification-trigger.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationTriggerService],
  exports: [NotificationsService, NotificationTriggerService],
})
export class NotificationsModule {}
