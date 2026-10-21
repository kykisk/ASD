import type { PrismaService } from '@auticare/prisma-client';

export interface BatchJobOutcome {
  total: number;
  processed: number;
  failed: number;
  errors?: string[];
}

/**
 * 자동 작업 실행을 BatchJob 으로 남김 (관리자 › 자동 작업에서 이력·결과 확인).
 * 작업이 던진 예외는 FAILED 로 기록한 뒤 다시 던진다.
 */
export async function recordBatchJob(
  prisma: PrismaService,
  type: string,
  run: () => Promise<BatchJobOutcome>,
): Promise<BatchJobOutcome> {
  const job = await prisma.batchJob.create({
    data: { type, status: 'RUNNING', startedAt: new Date(), targetDate: new Date() },
  });
  try {
    const outcome = await run();
    await prisma.batchJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        totalItems: outcome.total,
        processedItems: outcome.processed,
        failedItems: outcome.failed,
        errors:
          outcome.errors && outcome.errors.length > 0 ? outcome.errors.slice(0, 20) : undefined,
        completedAt: new Date(),
      },
    });
    return outcome;
  } catch (err) {
    await prisma.batchJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errors: [err instanceof Error ? err.message : String(err)],
        completedAt: new Date(),
      },
    });
    throw err;
  }
}
