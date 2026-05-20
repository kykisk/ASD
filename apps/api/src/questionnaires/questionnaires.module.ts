import { Module } from '@nestjs/common';
import { QuestionnairesController } from './questionnaires.controller.js';
import { QuestionnairesService } from './questionnaires.service.js';
import { QuestionnaireImportService } from './questionnaire-import.service.js';

@Module({
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService, QuestionnaireImportService],
  exports: [QuestionnairesService, QuestionnaireImportService],
})
export class QuestionnairesModule {}
