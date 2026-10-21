import { Module } from '@nestjs/common';
import { SessionFeedbacksModule } from '../session-feedbacks/session-feedbacks.module.js';
import { InsightsModule } from '../insights/insights.module.js';
import { DailyRecordsController } from './daily-records.controller.js';
import { DailyRecordsService } from './daily-records.service.js';

@Module({
  imports: [SessionFeedbacksModule, InsightsModule],
  controllers: [DailyRecordsController],
  providers: [DailyRecordsService],
})
export class DailyRecordsModule {}
