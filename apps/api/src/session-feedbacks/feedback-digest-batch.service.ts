import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { FeedbackDigestService } from './feedback-digest.service.js';
import * as cron from 'node-cron';

@Injectable()
export class FeedbackDigestBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeedbackDigestBatchService.name);
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly digestService: FeedbackDigestService,
  ) {}

  onModuleInit() {
    this.task = cron.schedule('0 21 * * 0', () => {
      this.runWeeklyBatch().catch((err) => {
        this.logger.error(
          `FeedbackDigest batch error: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log('FeedbackDigest weekly batch scheduled (Sun 21:00)');
  }

  onModuleDestroy() {
    this.task?.stop();
  }

  async runWeeklyBatch(): Promise<void> {
    this.logger.log('FeedbackDigest weekly batch started');

    const children = await this.prisma.child.findMany({
      where: { family: { members: { some: { user: { isActive: true } } } } },
      select: { id: true },
    });

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const child of children) {
      const result = await this.digestService.generateBatchForChild(child.id);
      if (result === 'generated') generated++;
      else if (result === 'skipped') skipped++;
      else errors++;
    }

    this.logger.log(
      `FeedbackDigest batch done — generated: ${generated}, skipped: ${skipped}, errors: ${errors}`,
    );
  }
}
