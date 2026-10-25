import { Module } from '@nestjs/common';
import { SessionFeedbacksModule } from '../session-feedbacks/session-feedbacks.module.js';
import { InsightsModule } from '../insights/insights.module.js';
import { AiModule } from '../ai/ai.module.js';
import { DailyRecordsController } from './daily-records.controller.js';
import { DailyRecordsService } from './daily-records.service.js';
import { FreeformRecordService } from './freeform-record.service.js';
import { DailyRecordRetryBatchService } from './daily-record-retry-batch.service.js';

@Module({
  imports: [SessionFeedbacksModule, InsightsModule, AiModule],
  controllers: [DailyRecordsController],
  providers: [DailyRecordsService, FreeformRecordService, DailyRecordRetryBatchService],
  exports: [DailyRecordRetryBatchService],
})
export class DailyRecordsModule {}
