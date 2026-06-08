import { Module } from '@nestjs/common';
import { QuestionnairesController } from './questionnaires.controller.js';
import { QuestionnairesService } from './questionnaires.service.js';
import { QuestionnaireImportService } from './questionnaire-import.service.js';
import { QuestionnaireFilterService } from './questionnaire-filter.service.js';
import { QuestionnaireGenerateService } from './questionnaire-generate.service.js';
import { ImageImportService } from './image-import.service.js';
import { AiModule } from '../ai/ai.module.js';
import { AiConfigModule } from '../ai-config/ai-config.module.js';

@Module({
  imports: [AiModule, AiConfigModule],
  controllers: [QuestionnairesController],
  providers: [
    QuestionnairesService,
    QuestionnaireImportService,
    QuestionnaireFilterService,
    QuestionnaireGenerateService,
    ImageImportService,
  ],
  exports: [QuestionnairesService, QuestionnaireImportService],
})
export class QuestionnairesModule {}
