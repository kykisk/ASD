import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller.js';
import { SchedulesService } from './schedules.service.js';
import { ConflictDetectionService } from './conflict-detection.service.js';
import { ScheduleSuggestionService } from './schedule-suggestion.service.js';
import { AiModule } from '../ai/ai.module.js';
import { AssessmentsModule } from '../assessments/assessments.module.js';

@Module({
  imports: [AiModule, AssessmentsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, ConflictDetectionService, ScheduleSuggestionService],
  exports: [SchedulesService, ConflictDetectionService],
})
export class SchedulesModule {}
