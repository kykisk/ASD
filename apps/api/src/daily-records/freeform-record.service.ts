import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '@auticare/prisma-client';
import {
  BEHAVIOR_TAG_OPTIONS,
  DAILY_RECORD_DOMAINS,
  DAILY_SESSION_TYPE_KEYS,
  type AnalyzeFreeformInput,
  type ConfirmFreeformInput,
} from '@auticare/dto';
import { AIService } from '../ai/ai.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import { SessionFeedbacksService } from '../session-feedbacks/session-feedbacks.service.js';
import { FeedbackDomainExtractionService } from '../session-feedbacks/feedback-domain-extraction.service.js';
import {
  DailyRecordsService,
  kstToday,
  type DailyRecordSummary,
  type PersistRecord,
} from './daily-records.service.js';

export const DAILY_RECORD_PARSE_FEATURE = 'DAILY_RECORD_PARSE';

type Domain = (typeof DAILY_RECORD_DOMAINS)[number];

/** AI 는 길이 제약을 자주 무시하므로 넘치면 자름 (AGENTS.md 22.6) */
const cappedString = (max: number) =>
  z.string().transform((s) => (s.length > max ? s.slice(0, max) : s));

const nullableScore = z
  .number()
  .nullable()
  .optional()
  .transform((n) => (typeof n === 'number' && n >= 1 && n <= 5 ? Math.round(n) : null));

const parsedSchema = z.object({
  scores: z
    .record(
      z.string(),
      z.object({ score: nullableScore, reason: cappedString(80).optional().default('') }),
    )
    .optional()
    .default({}),
  note: cappedString(1000).nullable().optional(),
  sessions: z
    .array(
      z.object({
        sessionType: z.string(),
        therapistFeedback: cappedString(1000).nullable().optional(),
      }),
    )
    .optional()
    .default([]),
  behaviors: z
    .array(
      z.object({
        tags: z.array(z.string()).optional().default([]),
        content: cappedString(1000),
        severity: nullableScore,
      }),
    )
    .optional()
    .default([]),
  questions: z
    .array(
      z.object({
        kind: z.string(),
        index: z.number().int().nullable().optional(),
        domain: z.string().nullable().optional(),
        question: cappedString(120),
      }),
    )
    .optional()
    .default([]),
});

export interface FreeformDraft {
  scores: Partial<Record<Domain, { score: number; reason: string }>>;
  note: string | null;
  sessions: Array<{ sessionType: string; therapistFeedback: string | null }>;
  behaviors: Array<{ tags: string[]; content: string; severity: number | null }>;
}

export type QuestionKind = 'BEHAVIOR_SEVERITY' | 'SESSION_HOMEWORK' | 'SCORE' | 'NOTE';

export interface FreeformQuestion {
  kind: QuestionKind;
  /** BEHAVIOR_SEVERITY · SESSION_HOMEWORK: 몇 번째 힘든 행동 · 수업인지 */
  index?: number;
  /** SCORE: 어느 영역 */
  domain?: Domain;
  question: string;
  /** 화면 입력 방식: scale = 1~5, text = 짧은 글 */
  answer: 'scale' | 'text';
}

export type AnalyzeResult =
  | { entryId: string; status: 'DRAFT'; draft: FreeformDraft; questions: FreeformQuestion[] }
  | { entryId: string; status: 'FAILED'; reason: string; record: DailyRecordSummary };

const MAX_QUESTIONS = 3;
const NOTE_MAX = 1000;

const DOMAIN_GUIDE = `- DAILY_LIVING(일상생활): 식사, 옷 입기, 화장실, 잠, 씻기
- COMMUNICATION(의사소통): 말 · 요청 · 대답 · 이해 · 몸짓 표현
- COGNITIVE(인지): 집중, 따라하기, 문제 해결, 놀이 이해
- SOCIAL(사회성): 눈맞춤, 또래 · 가족과 주고받기, 차례 지키기
- MOTOR(운동): 걷기 · 뛰기 · 계단(대근육), 손 쓰기 · 블록 · 그리기(소근육)`;

const SESSION_GUIDE = `SPEECH(언어치료), SPECIAL_PE(특수체육), SENSORY(감각통합), ABA, OCCUPATIONAL(작업치료), PLAY(놀이치료), OTHER(그 밖의 수업)`;

/**
 * 쭉 적기: 부모가 자유롭게 쓴 하루 이야기를 AI 가 오늘 하루 기록 모양(영역 점수 · 메모 · 수업 · 힘든 행동)으로
 * 정리하고, 빠진 것만 짧게 되묻는다. 부모가 확인한 뒤에만 저장한다.
 * AI 를 쓸 수 없으면 원문을 일상 메모로 바로 저장해 기록이 사라지지 않게 한다.
 */
@Injectable()
export class FreeformRecordService {
  private readonly logger = new Logger(FreeformRecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly dailyRecords: DailyRecordsService,
    private readonly sessionFeedbacks: SessionFeedbacksService,
    private readonly domainExtraction: FeedbackDomainExtractionService,
  ) {}

  async availability(childId: string, userId: string) {
    const familyId = await this.dailyRecords.verifyAccess(childId, userId);
    return this.ai.availability(familyId);
  }

  async analyze(
    childId: string,
    userId: string,
    input: AnalyzeFreeformInput,
  ): Promise<AnalyzeResult> {
    const familyId = await this.dailyRecords.verifyAccess(childId, userId);
    const date = input.date ?? kstToday();
    const entry = await this.prisma.dailyRecordEntry.create({
      data: {
        childId,
        familyId,
        userId,
        date,
        mode: 'FREEFORM',
        status: 'DRAFT',
        rawText: input.text,
      },
    });

    try {
      const already = await this.dailyRecords.latestDailyAssessment(childId, date);
      const alreadyScored = (already?.scores ?? []).map((s) => `${s.domain} ${s.score}`);
      const parsed = await this.ai.generateStructured(
        {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(input.text, alreadyScored) },
          ],
          maxTokens: 2000,
        },
        parsedSchema,
        undefined,
        familyId,
        DAILY_RECORD_PARSE_FEATURE,
      );
      const draft = normalizeDraft(parsed);
      const questions = normalizeQuestions(parsed.questions, draft);

      if (isEmpty(draft)) {
        // 정리할 거리가 없으면 원문을 메모로 (예: 아주 짧은 글)
        draft.note = input.text.slice(0, NOTE_MAX);
      }

      await this.prisma.dailyRecordEntry.update({
        where: { id: entry.id },
        data: {
          draft: draft as unknown as object,
          questions: questions as unknown as object,
          questionCount: questions.length,
        },
      });
      return { entryId: entry.id, status: 'DRAFT', draft, questions };
    } catch (err) {
      // 가족 사용 범위 · 횟수 문제는 그대로 알려주고, 나머지(연결 · 응답 오류)는 쉬운 말로
      const reason =
        err instanceof ApiException && (err.statusCode === 403 || err.statusCode === 429)
          ? err.userMessage
          : '지금은 AI가 정리하지 못했어요';
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Freeform analyze failed (${entry.id}): ${detail}`);
      // 원문은 일상 메모로 저장 (점수는 나중에 '다시 분석' 작업이 채움)
      const feedback = await this.sessionFeedbacks.create(
        childId,
        familyId,
        userId,
        {
          sessionDate: `${date}T00:00:00.000Z`,
          sessionType: 'DAILY',
          rating: 3,
          content: input.text.slice(0, NOTE_MAX),
          feedbackType: 'DAILY_LOG',
        },
        { extractDomains: false },
      );
      await this.prisma.dailyRecordEntry.update({
        where: { id: entry.id },
        data: {
          status: 'FAILED',
          error: detail.slice(0, 300),
          feedbackId: feedback.id,
          savedAt: new Date(),
        },
      });
      return {
        entryId: entry.id,
        status: 'FAILED',
        reason,
        record: await this.dailyRecords.findByDate(childId, userId, date),
      };
    }
  }

  async confirm(
    childId: string,
    userId: string,
    entryId: string,
    input: ConfirmFreeformInput,
  ): Promise<DailyRecordSummary> {
    const familyId = await this.dailyRecords.verifyAccess(childId, userId);
    const entry = await this.prisma.dailyRecordEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.childId !== childId || entry.mode !== 'FREEFORM') {
      throw new ApiException(404, 'DAILY_RECORD_404', '기록을 찾을 수 없습니다');
    }
    if (entry.status !== 'DRAFT') {
      throw new ApiException(409, 'DAILY_RECORD_409', '이미 저장한 기록입니다');
    }

    const draft = (entry.draft ?? null) as FreeformDraft | null;
    const questions = (entry.questions ?? []) as unknown as FreeformQuestion[];
    const record: PersistRecord = {
      scores: { ...input.scores },
      note: input.note,
      sessions: input.sessions.map((s) => ({ ...s })),
      behaviors: input.behaviors.map((b) => ({ ...b })),
    };
    const edited = draft ? !sameRecord(draft, record) : false;
    const answered = applyAnswers(record, questions, input.answers);

    const hasContent =
      Object.values(record.scores).some((v) => v !== undefined) ||
      !!record.note ||
      record.sessions.length > 0 ||
      record.behaviors.length > 0;
    if (!hasContent) {
      throw new ApiException(400, 'VALIDATION_001', '기록할 내용이 없습니다');
    }

    await this.dailyRecords.persist(childId, familyId, userId, entry.date, record, {
      mergeScores: true,
    });
    await this.prisma.dailyRecordEntry.update({
      where: { id: entryId },
      data: { status: 'SAVED', edited, answeredCount: answered, savedAt: new Date() },
    });
    return this.dailyRecords.findByDate(childId, userId, entry.date);
  }

  /**
   * 자동 작업 '정리 안 된 기록 다시 분석': AI 실패로 원문만 저장된 기록에서 영역 점수를 다시 뽑는다.
   * (수업 · 힘든 행동 카드는 부모 확인 없이 만들지 않음)
   */
  async retryFailed(): Promise<{
    total: number;
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const entries = await this.prisma.dailyRecordEntry.findMany({
      where: { status: 'FAILED', feedbackId: { not: null } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    let processed = 0;
    const errors: string[] = [];
    for (const entry of entries) {
      try {
        await this.domainExtraction.extractNow(entry.feedbackId as string);
        await this.prisma.dailyRecordEntry.update({
          where: { id: entry.id },
          data: { status: 'RECOVERED' },
        });
        processed++;
      } catch (err) {
        errors.push(
          `${entry.id}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300),
        );
      }
    }
    return { total: entries.length, processed, failed: errors.length, errors };
  }
}

const SYSTEM_PROMPT = `당신은 자폐 아동 가정치료 앱의 기록 도우미입니다.
부모가 자유롭게 쓴 하루 이야기를 정해진 항목으로 정리합니다.
- 글에 있는 내용만 씁니다. 추측해서 점수나 사건을 만들지 않습니다.
- 부모를 탓하거나 걱정을 키우는 말을 쓰지 않습니다. 담담하고 따뜻하게 씁니다.
- 마크다운 없이 JSON 하나만 출력합니다.`;

function buildPrompt(text: string, alreadyScored: string[]): string {
  return `부모가 쓴 오늘 이야기:
"""
${text}
"""

${alreadyScored.length ? `오늘 이미 기록된 영역 점수: ${alreadyScored.join(', ')} (이 영역은 글에 새 내용이 있을 때만 점수를 주고, 질문하지 마세요)\n` : ''}
정리 규칙
1. scores: 아래 5개 영역 중 글에 근거가 있는 영역만. score 1~5 (1 많이 힘들었어요, 3 보통, 5 아주 좋았어요), reason 은 근거 한 줄(40자 이내, 부모 말투를 살려서). 근거가 없으면 그 영역은 빼세요. 센터 수업에서 해낸 일도 근거예요(예: 공 던지기 10번 → MOTOR, 선생님께 '물 주세요' → COMMUNICATION). 피곤함 · 기분처럼 영역과 상관없는 일은 점수로 만들지 마세요.
${DOMAIN_GUIDE}
2. sessions: 센터 · 치료 수업 이야기가 있으면. sessionType 은 ${SESSION_GUIDE} 중 하나. therapistFeedback 은 선생님 말씀이나 수업 내용 요약(100자 이내), 없으면 null.
3. behaviors: 울음 · 떼쓰기 · 공격 · 자해 · 뛰쳐나감 같은 힘든 행동이 있으면. tags 는 ${BEHAVIOR_TAG_OPTIONS.join(', ')} 중에서, content 는 무슨 일이었는지(100자 이내), severity 는 글에서 정도를 알 수 있을 때만 1~5(1 금방 진정, 5 아주 힘들었음), 모르면 null.
4. note: scores 의 근거 · sessions · behaviors 에 이미 쓴 내용은 빼고, 남은 일상 이야기만 짧게(200자 이내). 남은 게 없으면 null.
5. questions: 꼭 필요한 것만 최대 ${MAX_QUESTIONS}개. 아래 종류만 쓰세요.
   - BEHAVIOR_SEVERITY (index = behaviors 의 번호): 힘든 행동의 severity 가 null 일 때
   - SESSION_HOMEWORK (index = sessions 의 번호): 수업이 있었는데 집에서 할 것(숙제)이 글에 없을 때
   - SCORE (domain = 영역 키): 글에 그 영역 이야기가 조금 있지만 점수를 정하기 애매할 때
   question 은 부모에게 묻는 짧고 다정한 한 문장(40자 이내).

JSON 형식:
{"scores":{"COMMUNICATION":{"score":4,"reason":"..."}},"note":null,"sessions":[{"sessionType":"SPEECH","therapistFeedback":"..."}],"behaviors":[{"tags":["멜트다운"],"content":"...","severity":null}],"questions":[{"kind":"BEHAVIOR_SEVERITY","index":0,"question":"..."}]}`;
}

function normalizeDraft(parsed: z.infer<typeof parsedSchema>): FreeformDraft {
  const scores: FreeformDraft['scores'] = {};
  for (const d of DAILY_RECORD_DOMAINS) {
    const s = parsed.scores[d];
    if (s?.score) scores[d] = { score: s.score, reason: s.reason ?? '' };
  }
  const sessionKeys = DAILY_SESSION_TYPE_KEYS as readonly string[];
  const tagOptions = BEHAVIOR_TAG_OPTIONS as readonly string[];
  return {
    scores,
    note: parsed.note?.trim() || null,
    sessions: parsed.sessions.slice(0, 3).map((s) => ({
      sessionType: sessionKeys.includes(s.sessionType) ? s.sessionType : 'OTHER',
      therapistFeedback: s.therapistFeedback?.trim() || null,
    })),
    behaviors: parsed.behaviors
      .filter((b) => b.content.trim())
      .slice(0, 3)
      .map((b) => ({
        tags: [...new Set(b.tags.filter((t) => tagOptions.includes(t)))],
        content: b.content.trim(),
        severity: b.severity,
      })),
  };
}

/** AI 질문 중 실제로 답을 반영할 수 있는 것만, 최대 3개 */
function normalizeQuestions(
  raw: z.infer<typeof parsedSchema>['questions'],
  draft: FreeformDraft,
): FreeformQuestion[] {
  const out: FreeformQuestion[] = [];
  for (const q of raw) {
    if (out.length >= MAX_QUESTIONS || !q.question.trim()) continue;
    const question = q.question.trim();
    const index = q.index ?? 0;
    if (q.kind === 'BEHAVIOR_SEVERITY' && draft.behaviors[index]) {
      out.push({ kind: 'BEHAVIOR_SEVERITY', index, question, answer: 'scale' });
    } else if (q.kind === 'SESSION_HOMEWORK' && draft.sessions[index]) {
      out.push({ kind: 'SESSION_HOMEWORK', index, question, answer: 'text' });
    } else if (
      q.kind === 'SCORE' &&
      q.domain &&
      (DAILY_RECORD_DOMAINS as readonly string[]).includes(q.domain)
    ) {
      out.push({ kind: 'SCORE', domain: q.domain as Domain, question, answer: 'scale' });
    }
  }
  // 정도를 모르는 힘든 행동은 AI 가 빠뜨려도 꼭 물어봄
  draft.behaviors.forEach((b, index) => {
    const asked = out.some((q) => q.kind === 'BEHAVIOR_SEVERITY' && q.index === index);
    if (b.severity === null && !asked && out.length < MAX_QUESTIONS) {
      out.unshift({
        kind: 'BEHAVIOR_SEVERITY',
        index,
        question: '힘들었던 순간은 어느 정도였어요?',
        answer: 'scale',
      });
    }
  });
  return out.slice(0, MAX_QUESTIONS);
}

function isEmpty(d: FreeformDraft): boolean {
  return (
    Object.keys(d.scores).length === 0 &&
    !d.note &&
    d.sessions.length === 0 &&
    d.behaviors.length === 0
  );
}

/** 부모가 AI 정리 결과를 그대로 두었는지 (품질 통계용) */
function sameRecord(draft: FreeformDraft, record: PersistRecord): boolean {
  const normalize = (r: {
    scores: Record<string, number | undefined>;
    note?: string | null;
    sessions: Array<{ sessionType: string; therapistFeedback?: string | null }>;
    behaviors: Array<{ tags: string[]; content: string; severity?: number | null }>;
  }) =>
    JSON.stringify({
      scores: DAILY_RECORD_DOMAINS.map((d) => r.scores[d] ?? null),
      note: r.note || null,
      sessions: r.sessions.map((s) => [s.sessionType, s.therapistFeedback || null]),
      behaviors: r.behaviors.map((b) => [[...b.tags].sort(), b.content, b.severity ?? null]),
    });
  const draftScores = Object.fromEntries(
    Object.entries(draft.scores).map(([k, v]) => [k, v?.score]),
  ) as Record<string, number | undefined>;
  return normalize({ ...draft, scores: draftScores }) === normalize(record);
}

/** 추가 질문 답을 기록에 반영하고, 답한 질문 수를 돌려줌 */
function applyAnswers(
  record: PersistRecord,
  questions: FreeformQuestion[],
  answers: ConfirmFreeformInput['answers'],
): number {
  let answered = 0;
  for (const { index, value } of answers) {
    const q = questions[index];
    if (!q) continue;
    if (q.kind === 'BEHAVIOR_SEVERITY' && typeof value === 'number') {
      const behavior = record.behaviors[q.index ?? 0];
      if (behavior) {
        behavior.severity = value;
        answered++;
      }
    } else if (q.kind === 'SESSION_HOMEWORK' && typeof value === 'string') {
      const session = record.sessions[q.index ?? 0];
      if (session) {
        const homework = `집에서: ${value}`;
        session.therapistFeedback = session.therapistFeedback
          ? `${session.therapistFeedback} / ${homework}`.slice(0, NOTE_MAX)
          : homework;
        answered++;
      }
    } else if (q.kind === 'SCORE' && q.domain && typeof value === 'number') {
      record.scores[q.domain] = value;
      answered++;
    } else if (q.kind === 'NOTE' && typeof value === 'string') {
      record.note = record.note ? `${record.note}\n${value}`.slice(0, NOTE_MAX) : value;
      answered++;
    }
  }
  return answered;
}
