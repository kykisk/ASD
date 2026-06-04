import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmergencyController } from './emergency.controller.js';
import { EmergencyService } from './emergency.service.js';

@Module({
  imports: [AiModule, NotificationsModule],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
