import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { ReportService } from './report.service.js';
import { ReportController } from './report.controller.js';

@Module({
  imports: [AssessmentsModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportsModule {}
