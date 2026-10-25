import { Module } from '@nestjs/common';
import { PrismaModule } from '@auticare/prisma-client';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ResearchModule } from '../research/research.module.js';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { InsightsModule } from '../insights/insights.module.js';
import { SessionFeedbacksModule } from '../session-feedbacks/session-feedbacks.module.js';
import { AiModule } from '../ai/ai.module.js';
import { DailyRecordsModule } from '../daily-records/daily-records.module.js';
import { AdminJobsService } from './admin-jobs.service.js';
import { AdminOverviewService } from './admin-overview.service.js';
import { AdminAccountsService } from './admin-accounts.service.js';

@Module({
  imports: [
    PrismaModule,
    ResearchModule,
    CurriculumModule,
    InsightsModule,
    SessionFeedbacksModule,
    AiModule,
    DailyRecordsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJobsService, AdminOverviewService, AdminAccountsService],
})
export class AdminModule {}
