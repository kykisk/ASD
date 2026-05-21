import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { InsightsService } from './insights.service.js';
import { InsightsController } from './insights.controller.js';
import { InsightsBatchService } from './insights-batch.service.js';

@Module({
  imports: [AiModule, AssessmentsModule],
  controllers: [InsightsController],
  providers: [InsightsService, InsightsBatchService],
  exports: [InsightsService],
})
export class InsightsModule {}
