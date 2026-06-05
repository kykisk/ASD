import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { ResearchService } from './research.service.js';

@Injectable()
export class ResearchBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResearchBatchService.name);
  private task: cron.ScheduledTask | null = null;

  constructor(private readonly researchService: ResearchService) {}

  onModuleInit() {
    this.task = cron.schedule('0 8 * * 1', () => {
      this.runWeeklyBatch().catch((err) => {
        this.logger.error('Weekly research collection failed:', err);
      });
    });
  }

  onModuleDestroy() {
    this.task?.stop();
    this.task = null;
  }

  async runWeeklyBatch() {
    this.logger.log('Starting weekly research collection...');
    const result = await this.researchService.runWeeklyCollection();
    this.logger.log(`Weekly research collection completed: ${result.totalArticles} articles`);

    this.logger.log('Starting weekly archive...');
    const archived = await this.researchService.archiveOldArticlesForAllFamilies();
    this.logger.log(`Weekly archive completed: ${archived} articles archived`);

    return { ...result, archived };
  }
}
