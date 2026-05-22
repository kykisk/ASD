import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CurriculumPromptService } from './curriculum-prompt.service.js';
import { CurriculumService } from './curriculum.service.js';
import { CurriculumBatchService } from './curriculum-batch.service.js';
import { CurriculumController } from './curriculum.controller.js';
import { ActivityService } from './activity.service.js';
import { ActivityController } from './activity.controller.js';

@Module({
  imports: [AiModule, AssessmentsModule, NotificationsModule],
  controllers: [CurriculumController, ActivityController],
  providers: [CurriculumPromptService, CurriculumService, CurriculumBatchService, ActivityService],
  exports: [CurriculumService, CurriculumBatchService, CurriculumPromptService, ActivityService],
})
export class CurriculumModule {}
