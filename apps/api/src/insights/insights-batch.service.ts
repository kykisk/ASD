import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InsightsService } from './insights.service.js';
import * as cron from 'node-cron';

@Injectable()
export class InsightsBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InsightsBatchService.name);
  private task: cron.ScheduledTask | null = null;

  constructor(private insightsService: InsightsService) {}

  onModuleInit() {
    this.task = cron.schedule('0 21 * * 0', () => {
      this.runWeeklyBatch().catch((err) => {
        this.logger.error('Weekly insight batch generation failed:', err);
      });
    });
  }

  onModuleDestroy() {
    this.task?.stop();
    this.task = null;
  }

  async runWeeklyBatch(): Promise<void> {
    this.logger.log('Starting weekly insight batch generation');
    await this.insightsService.generateWeeklyBatch();
    this.logger.log('Weekly insight batch generation completed');
  }
}
