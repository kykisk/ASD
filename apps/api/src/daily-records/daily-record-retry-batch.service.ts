import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import * as cron from 'node-cron';
import { recordBatchJob } from '../common/batch/record-batch-job.js';
import { FreeformRecordService } from './freeform-record.service.js';

/** 매일 03:30 (KST): AI 정리에 실패해 원문만 저장된 기록을 다시 분석. 04:00 커리큘럼 생성 전에 끝남 */
@Injectable()
export class DailyRecordRetryBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyRecordRetryBatchService.name);
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly freeform: FreeformRecordService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.task = cron.schedule(
      '30 3 * * *',
      () => {
        this.run().catch((err) => this.logger.error('Daily record retry failed:', err));
      },
      { timezone: 'Asia/Seoul' },
    );
  }

  onModuleDestroy() {
    this.task?.stop();
    this.task = null;
  }

  async run(): Promise<void> {
    await recordBatchJob(this.prisma, 'DAILY_RECORD_RETRY', () => this.freeform.retryFailed());
  }
}
