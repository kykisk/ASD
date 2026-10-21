import { Module } from '@nestjs/common';
import { ClinicalReportsController } from './clinical-reports.controller.js';
import { ClinicalReportsService } from './clinical-reports.service.js';
import { AiModule } from '../ai/ai.module.js';
import { AiConfigModule } from '../ai-config/ai-config.module.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  imports: [AiConfigModule, AiModule],
  controllers: [ClinicalReportsController],
  providers: [ClinicalReportsService, FamilyResolverService],
  exports: [ClinicalReportsService],
})
export class ClinicalReportsModule {}
