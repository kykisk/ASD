import { Module } from '@nestjs/common';
import { ClinicalReportsController } from './clinical-reports.controller.js';
import { ClinicalReportsService } from './clinical-reports.service.js';
import { AiConfigModule } from '../ai-config/ai-config.module.js';
import { FamilyResolverService } from '../common/services/family-resolver.service.js';

@Module({
  imports: [AiConfigModule],
  controllers: [ClinicalReportsController],
  providers: [ClinicalReportsService, FamilyResolverService],
  exports: [ClinicalReportsService],
})
export class ClinicalReportsModule {}
