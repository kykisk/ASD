import { Module } from '@nestjs/common';
import { SessionFeedbacksModule } from '../session-feedbacks/session-feedbacks.module.js';
import { DailyRecordsController } from './daily-records.controller.js';
import { DailyRecordsService } from './daily-records.service.js';

@Module({
  imports: [SessionFeedbacksModule],
  controllers: [DailyRecordsController],
  providers: [DailyRecordsService],
})
export class DailyRecordsModule {}
