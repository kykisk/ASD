import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { GrowthService } from './growth.service.js';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { SchedulesModule } from '../schedules/schedules.module.js';

@Module({
  imports: [AssessmentsModule, SchedulesModule],
  controllers: [DashboardController],
  providers: [DashboardService, GrowthService],
  exports: [DashboardService, GrowthService],
})
export class DashboardModule {}
