import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { CurriculumService } from './curriculum.service.js';
import type { Curriculum } from '@prisma/client';
import * as cron from 'node-cron';

export interface BatchJobResult {
  batchJobId: string;
  totalChildren: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ childId: string; error: string }>;
}

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000];

@Injectable()
export class CurriculumBatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CurriculumBatchService.name);
  private task: cron.ScheduledTask | null = null;

  constructor(
    private prisma: PrismaService,
    private curriculumService: CurriculumService,
  ) {}

  onModuleInit() {
    this.task = cron.schedule('0 18 * * *', () => {
      this.runNightlyGeneration().catch((err) => {
        this.logger.error('Nightly curriculum generation failed:', err);
      });
    });
  }

  onModuleDestroy() {
    this.task?.stop();
    this.task = null;
  }

  async runNightlyGeneration(): Promise<BatchJobResult> {
    const batchJob = await this.prisma.batchJob.create({
      data: {
        type: 'CURRICULUM_GENERATION',
        status: 'RUNNING',
        startedAt: new Date(),
        targetDate: new Date(),
      },
    });

    const activeMembers = await this.prisma.familyMember.findMany({
      where: { user: { isActive: true } },
      select: { userId: true, familyId: true },
    });

    const familyIds = [...new Set(activeMembers.map((m) => m.familyId))];

    const children = await this.prisma.child.findMany({
      where: { familyId: { in: familyIds } },
      select: { id: true, familyId: true },
    });

    const familyUserMap = new Map<string, string>();
    for (const member of activeMembers) {
      if (!familyUserMap.has(member.familyId)) {
        familyUserMap.set(member.familyId, member.userId);
      }
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ childId: string; error: string }> = [];

    for (const child of children) {
      const userId = familyUserMap.get(child.familyId);
      if (!userId) continue;

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await this.curriculumService.generateForChild(child.id, userId);
          success = true;
          break;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (attempt < 2) {
            await this.delay(RETRY_DELAYS_MS[attempt]);
          } else {
            errors.push({ childId: child.id, error: errorMessage });
            this.logger.warn(`Failed to generate curriculum for child ${child.id}: ${errorMessage}`);
          }
        }
      }

      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    await this.prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: 'COMPLETED',
        totalItems: children.length,
        processedItems: successCount,
        failedItems: failureCount,
        errors: errors.length > 0 ? (errors as unknown as Record<string, unknown>[]) : undefined,
        completedAt: new Date(),
      },
    });

    return {
      batchJobId: batchJob.id,
      totalChildren: children.length,
      successCount,
      failureCount,
      errors,
    };
  }

  async triggerManualGeneration(childId: string, userId: string): Promise<Curriculum> {
    return this.curriculumService.generateForChild(childId, userId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
