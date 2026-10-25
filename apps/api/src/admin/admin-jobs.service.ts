import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import { CurriculumBatchService } from '../curriculum/curriculum-batch.service.js';
import { ResearchBatchService } from '../research/research-batch.service.js';
import { ResearchService } from '../research/research.service.js';
import { InsightsBatchService } from '../insights/insights-batch.service.js';
import { FeedbackDigestBatchService } from '../session-feedbacks/feedback-digest-batch.service.js';
import { DailyRecordRetryBatchService } from '../daily-records/daily-record-retry-batch.service.js';

interface JobDefinition {
  type: string;
  name: string;
  description: string;
  /** 사람이 읽는 실행 시각 (모두 KST) */
  schedule: string;
  /** 다음 실행 계산용: 분, 시(KST), 요일(0=일, null=매일). 수동 전용이면 null */
  at: { minute: number; hour: number; weekday: number | null } | null;
}

const JOBS: JobDefinition[] = [
  {
    type: 'DAILY_RECORD_RETRY',
    name: '정리 안 된 기록 다시 분석',
    description: 'AI 정리에 실패해 원문만 저장된 오늘 하루 기록에서 영역 점수를 다시 뽑아요',
    schedule: '매일 03:30',
    at: { minute: 30, hour: 3, weekday: null },
  },
  {
    type: 'CURRICULUM_GENERATION',
    name: '오늘 커리큘럼 만들기',
    description: '아이마다 그날 집에서 할 활동을 만들어요',
    schedule: '매일 04:00',
    at: { minute: 0, hour: 4, weekday: null },
  },
  {
    type: 'RESEARCH_COLLECTION',
    name: '논문 수집',
    description: 'PubMed 새 논문을 모아 한국어로 요약하고 오래된 논문을 정리해요',
    schedule: '매주 월 08:00',
    at: { minute: 0, hour: 8, weekday: 1 },
  },
  {
    type: 'WEEKLY_INSIGHT',
    name: '이번 주 요약',
    description: '가족마다 이번 주 변화를 AI가 정리해요',
    schedule: '매주 일 21:00',
    at: { minute: 0, hour: 21, weekday: 0 },
  },
  {
    type: 'FEEDBACK_DIGEST',
    name: '주간 기록 요약',
    description: '수업 · 일상 기록을 한 주 단위로 요약해요 (3건 이상일 때)',
    schedule: '매주 일 21:00',
    at: { minute: 0, hour: 21, weekday: 0 },
  },
  {
    type: 'RESEARCH_RESUMMARY',
    name: '논문 요약 재처리',
    description: '한국어 요약이 없는 논문만 다시 요약해요',
    schedule: '필요할 때만',
    at: null,
  },
];

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 다음 실행 시각 (UTC Date). KST 기준 분·시·요일로 계산 */
export function nextRun(at: JobDefinition['at'], now = new Date()): Date | null {
  if (!at) return null;
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  for (let addDays = 0; addDays <= 7; addDays++) {
    const candidate = new Date(
      Date.UTC(
        kstNow.getUTCFullYear(),
        kstNow.getUTCMonth(),
        kstNow.getUTCDate() + addDays,
        at.hour,
        at.minute,
      ) - KST_OFFSET_MS,
    );
    const kstCandidate = new Date(candidate.getTime() + KST_OFFSET_MS);
    if (candidate > now && (at.weekday === null || kstCandidate.getUTCDay() === at.weekday)) {
      return candidate;
    }
  }
  return null;
}

@Injectable()
export class AdminJobsService {
  private readonly logger = new Logger(AdminJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly curriculumBatch: CurriculumBatchService,
    private readonly researchBatch: ResearchBatchService,
    private readonly researchService: ResearchService,
    private readonly insightsBatch: InsightsBatchService,
    private readonly digestBatch: FeedbackDigestBatchService,
    private readonly recordRetry: DailyRecordRetryBatchService,
  ) {}

  async list() {
    return Promise.all(
      JOBS.map(async (job) => {
        const lastRun = await this.prisma.batchJob.findFirst({
          where: { type: job.type },
          orderBy: { createdAt: 'desc' },
        });
        return {
          type: job.type,
          name: job.name,
          description: job.description,
          schedule: job.schedule,
          nextRunAt: nextRun(job.at)?.toISOString() ?? null,
          lastRun,
        };
      }),
    );
  }

  async runs(type: string, limit = 10) {
    return this.prisma.batchJob.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  }

  /** 지금 실행: 오래 걸리는 작업이라 바로 돌려주고 결과는 실행 기록에서 확인 */
  async run(type: string): Promise<{ started: true }> {
    const runners: Record<string, () => Promise<unknown>> = {
      DAILY_RECORD_RETRY: () => this.recordRetry.run(),
      CURRICULUM_GENERATION: () => this.curriculumBatch.runNightlyGeneration(),
      RESEARCH_COLLECTION: () => this.researchBatch.runWeeklyBatch(),
      WEEKLY_INSIGHT: () => this.insightsBatch.runWeeklyBatch(),
      FEEDBACK_DIGEST: () => this.digestBatch.runWeeklyBatch(),
      RESEARCH_RESUMMARY: () => this.researchService.reSummarizeArticles(),
    };
    const runner = runners[type];
    if (!runner) throw new ApiException(404, 'ADMIN_404', '알 수 없는 작업입니다');

    runner().catch((err) =>
      this.logger.error(
        `Manual run of ${type} failed: ${err instanceof Error ? err.message : err}`,
      ),
    );
    return { started: true };
  }
}
