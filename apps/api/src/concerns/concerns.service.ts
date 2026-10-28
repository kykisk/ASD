import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '@auticare/prisma-client';
import {
  ANTECEDENT_OPTIONS,
  type CreateConcernInput,
  type StartTrialInput,
  type TeacherOpinionInput,
  type UpdateConcernInput,
  type UpdateTrialInput,
} from '@auticare/dto';
import { AIService } from '../ai/ai.service.js';
import { ApiException } from '../common/exceptions/api.exception.js';
import { ResearchService } from '../research/research.service.js';
import { SessionFeedbacksService } from '../session-feedbacks/session-feedbacks.service.js';

export const CONCERN_PERSPECTIVES_FEATURE = 'CONCERN_PERSPECTIVES';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const PATTERN_WEEKS = 6;
/** 다치는 행동 태그: 관점 비교보다 전문가 상담 안내를 먼저 */
const SAFETY_TAGS = ['자해', '공격'];

const KST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const kstDate = (d: Date) => KST_DATE.format(d);
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const cappedString = (max: number) =>
  z.string().transform((s) => (s.length > max ? s.slice(0, max) : s));

const APPROACHES = ['BEHAVIORAL', 'DEVELOPMENTAL', 'SENSORY', 'NEURODIVERSITY'] as const;

const perspectivesSchema = z.object({
  keywords: z.array(z.string()).optional().default([]),
  summary: cappedString(200).optional().default(''),
  centerView: z
    .object({ source: cappedString(40), text: cappedString(200), approach: z.string() })
    .nullable()
    .optional(),
  patternInsight: cappedString(300).nullable().optional(),
  safetyAlert: z.boolean().optional().default(false),
  perspectives: z
    .array(
      z.object({
        approach: z.string(),
        why: cappedString(200),
        atHome: cappedString(300),
        caution: cappedString(150).nullable().optional(),
        evidence: z.string(),
        strategies: z
          .array(z.object({ title: cappedString(40), how: cappedString(400) }))
          .optional()
          .default([]),
      }),
    )
    .min(1),
  pubmedTerms: z.array(z.string()).optional().default([]),
});

export interface Perspectives {
  summary: string;
  centerView: { source: string; text: string; approach: string } | null;
  patternInsight: string | null;
  safetyAlert: boolean;
  perspectives: Array<{
    approach: (typeof APPROACHES)[number];
    why: string;
    atHome: string;
    caution: string | null;
    evidence: 'STRONG' | 'MODERATE' | 'EMERGING' | 'VIEWPOINT';
    strategies: Array<{ title: string; how: string }>;
  }>;
  papers: Array<{
    id: string;
    pubmedId: string;
    title: string;
    journal: string;
    year: number;
    koreanSummary: string | null;
  }>;
}

interface BehaviorRecord {
  id: string;
  date: string;
  content: string;
  behaviorTags: string[];
  severity: number | null;
  antecedent: string | null;
  parentResponse: string | null;
  settled: string | null;
}

/**
 * 맞는 방법 찾기: 반복되는 행동 하나(고민)에 대해
 * 여러 관점 · 우리 아이 기록 패턴 · 2주 시도 결과 · 선생님 의견을 모은다.
 * 정답을 주지 않고 부모와 선생님이 비교해 고르도록 돕는다.
 */
@Injectable()
export class ConcernsService {
  private readonly logger = new Logger(ConcernsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly research: ResearchService,
    private readonly sessionFeedbacks: SessionFeedbacksService,
  ) {}

  // ─── 목록 · 만들기 ─────────────────────────────────────

  async list(childId: string, userId: string) {
    await this.verifyChild(childId, userId);
    const [concerns, behaviors] = await Promise.all([
      this.prisma.concern.findMany({
        where: { childId },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: { trials: { where: { status: 'ACTIVE' } } },
      }),
      this.behaviorRecords(childId, 30),
    ]);
    const today = kstDate(new Date());

    const covered = new Set(concerns.flatMap((c) => c.matchTags));
    const tagCounts = new Map<string, number>();
    for (const b of behaviors) {
      for (const t of b.behaviorTags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }

    return {
      concerns: concerns.map((c) => {
        const trial = c.trials[0];
        return {
          id: c.id,
          title: c.title,
          status: c.status,
          matchTags: c.matchTags,
          recordCount30d: behaviors.filter((b) => matches(b, c)).length,
          activeTrial: trial
            ? {
                id: trial.id,
                title: trial.title,
                day: Math.min(TRIAL_DAYS, dayNumber(trial.startDate, today)),
                ended: trial.endDate < today,
              }
            : null,
          hasPerspectives: !!c.perspectives,
        };
      }),
      /** 30일 동안 2번 이상 기록됐는데 아직 고민으로 등록 안 된 힘든 행동 */
      suggestions: [...tagCounts.entries()]
        .filter(([tag, n]) => n >= 2 && !covered.has(tag) && tag !== '기타')
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count })),
    };
  }

  async create(childId: string, userId: string, input: CreateConcernInput) {
    const familyId = await this.verifyChild(childId, userId);
    return this.prisma.concern.create({
      data: {
        childId,
        familyId,
        userId,
        title: input.title,
        matchTags: input.matchTags,
        keywords: titleKeywords(input.title),
      },
    });
  }

  async update(concernId: string, userId: string, input: UpdateConcernInput) {
    await this.getConcern(concernId, userId);
    return this.prisma.concern.update({
      where: { id: concernId },
      data: {
        ...(input.title ? { title: input.title, keywords: titleKeywords(input.title) } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.matchTags ? { matchTags: input.matchTags } : {}),
      },
    });
  }

  async remove(concernId: string, userId: string) {
    await this.getConcern(concernId, userId);
    await this.prisma.concern.delete({ where: { id: concernId } });
    return { deleted: true };
  }

  // ─── 한 고민 자세히 ────────────────────────────────────

  async detail(concernId: string, userId: string) {
    const concern = await this.getConcern(concernId, userId);
    const [behaviors, trials, opinions] = await Promise.all([
      this.behaviorRecords(concern.childId, PATTERN_WEEKS * 7 + TRIAL_DAYS * 4),
      this.prisma.strategyTrial.findMany({
        where: { concernId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sessionFeedback.findMany({
        where: { concernId, isTeacherOpinion: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, sessionType: true, content: true, createdAt: true },
      }),
    ]);
    const matched = behaviors.filter((b) => matches(b, concern));
    const today = kstDate(new Date());

    return {
      concern: {
        id: concern.id,
        title: concern.title,
        status: concern.status,
        matchTags: concern.matchTags,
        keywords: concern.keywords,
        createdAt: concern.createdAt,
      },
      perspectives: (concern.perspectives as unknown as Perspectives | null) ?? null,
      perspectivesAt: concern.perspectivesAt,
      safety: matched.some((b) => b.behaviorTags.some((t) => SAFETY_TAGS.includes(t))),
      pattern: buildPattern(matched, today),
      trials: trials.map((t) => ({
        id: t.id,
        title: t.title,
        how: t.how,
        approach: t.approach,
        startDate: t.startDate,
        endDate: t.endDate,
        status: t.status,
        rating: t.rating,
        note: t.note,
        day: Math.min(TRIAL_DAYS, dayNumber(t.startDate, today)),
        needsRating: t.status === 'ACTIVE' && t.endDate < today,
        comparison: compareTrial(matched, t.startDate, t.endDate, today),
      })),
      teacherOpinions: opinions.map((o) => ({
        id: o.id,
        sessionType: o.sessionType,
        content: o.content,
        date: kstDate(o.createdAt),
      })),
    };
  }

  /** AI 가 여러 관점 · 방법 · 관련 논문을 정리 (다시 누르면 새로) */
  async generatePerspectives(concernId: string, userId: string) {
    const concern = await this.getConcern(concernId, userId);
    const child = await this.prisma.child.findUnique({
      where: { id: concern.childId },
      select: { familyId: true, centerInfo: true, diagnosisName: true },
    });
    const behaviors = (await this.behaviorRecords(concern.childId, 60)).filter((b) =>
      matches(b, concern),
    );
    const [sessionNotes, opinions] = await Promise.all([
      this.prisma.sessionFeedback.findMany({
        where: {
          childId: concern.childId,
          feedbackType: 'SESSION',
          isTeacherOpinion: false,
          sessionDate: { gte: new Date(Date.now() - 60 * DAY_MS) },
        },
        orderBy: { sessionDate: 'desc' },
        take: 15,
        select: { sessionType: true, content: true, homeWork: true, sessionDate: true },
      }),
      this.prisma.sessionFeedback.findMany({
        where: { concernId, isTeacherOpinion: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { sessionType: true, content: true },
      }),
    ]);
    const pattern = buildPattern(behaviors, kstDate(new Date()));

    const parsed = await this.ai.generateStructured(
      {
        messages: [
          { role: 'system', content: PERSPECTIVES_SYSTEM },
          {
            role: 'user',
            content: buildPerspectivesPrompt({
              title: concern.title,
              diagnosis: child?.diagnosisName ?? null,
              centers: ((child?.centerInfo as Array<{ type?: string; name?: string }>) ?? [])
                .map((c) => c.type || c.name)
                .filter(Boolean) as string[],
              behaviors,
              pattern,
              sessionNotes: sessionNotes.map(
                (s) =>
                  `${kstDate(s.sessionDate)} ${s.sessionType}: ${s.content.slice(0, 120)}${s.homeWork ? ` (숙제: ${s.homeWork.slice(0, 60)})` : ''}`,
              ),
              opinions: opinions.map((o) => `${o.sessionType}: ${o.content.slice(0, 200)}`),
            }),
          },
        ],
        maxTokens: 4000,
      },
      perspectivesSchema,
      undefined,
      child?.familyId,
      CONCERN_PERSPECTIVES_FEATURE,
    );

    const query = pubmedQuery(parsed.pubmedTerms);
    const papers = query ? await this.research.collectForQuery(query, 3) : [];

    const perspectives: Perspectives = {
      summary: parsed.summary,
      centerView: parsed.centerView ?? null,
      patternInsight: behaviors.length >= 3 ? (parsed.patternInsight ?? null) : null,
      safetyAlert:
        parsed.safetyAlert ||
        behaviors.some((b) => b.behaviorTags.some((t) => SAFETY_TAGS.includes(t))),
      perspectives: parsed.perspectives
        .filter((p) => (APPROACHES as readonly string[]).includes(p.approach))
        .slice(0, 4)
        .map((p) => ({
          approach: p.approach as Perspectives['perspectives'][number]['approach'],
          why: p.why,
          atHome: p.atHome,
          caution: p.caution ?? null,
          evidence: (['STRONG', 'MODERATE', 'EMERGING', 'VIEWPOINT'].includes(p.evidence)
            ? p.evidence
            : 'EMERGING') as Perspectives['perspectives'][number]['evidence'],
          strategies: p.strategies.slice(0, 2),
        })),
      papers,
    };
    const keywords = [
      ...new Set(
        parsed.keywords.map((k) => k.trim()).filter((k) => k.length >= 2 && !GENERIC_WORDS.has(k)),
      ),
    ].slice(0, 5);

    await this.prisma.concern.update({
      where: { id: concernId },
      data: {
        perspectives: perspectives as unknown as object,
        perspectivesAt: new Date(),
        ...(keywords.length ? { keywords } : {}),
      },
    });
    return this.detail(concernId, userId);
  }

  // ─── 2주 시도 ──────────────────────────────────────────

  async startTrial(concernId: string, userId: string, input: StartTrialInput) {
    const concern = await this.getConcern(concernId, userId);
    const today = kstDate(new Date());
    // 한 고민에 한 번에 하나만
    await this.prisma.strategyTrial.updateMany({
      where: { concernId, status: 'ACTIVE' },
      data: { status: 'STOPPED' },
    });
    await this.prisma.strategyTrial.create({
      data: {
        concernId,
        childId: concern.childId,
        title: input.title,
        how: input.how,
        approach: input.approach,
        startDate: today,
        endDate: addDays(today, TRIAL_DAYS - 1),
      },
    });
    return this.detail(concernId, userId);
  }

  async updateTrial(trialId: string, userId: string, input: UpdateTrialInput) {
    const trial = await this.prisma.strategyTrial.findUnique({ where: { id: trialId } });
    if (!trial) throw new ApiException(404, 'CONCERN_404', '시도 기록을 찾을 수 없습니다');
    await this.getConcern(trial.concernId, userId);
    await this.prisma.strategyTrial.update({
      where: { id: trialId },
      data: { status: input.status, rating: input.rating ?? null, note: input.note ?? null },
    });
    return this.detail(trial.concernId, userId);
  }

  // ─── 선생님 ────────────────────────────────────────────

  async addTeacherOpinion(concernId: string, userId: string, input: TeacherOpinionInput) {
    const concern = await this.getConcern(concernId, userId);
    await this.sessionFeedbacks.create(
      concern.childId,
      concern.familyId,
      userId,
      {
        sessionDate: `${kstDate(new Date())}T00:00:00.000Z`,
        sessionType: input.sessionType,
        rating: 3,
        content: input.content,
        feedbackType: 'SESSION',
        concernId,
        isTeacherOpinion: true,
      },
      { extractDomains: false },
    );
    return this.detail(concernId, userId);
  }

  // ─── 내부 ──────────────────────────────────────────────

  private async getConcern(concernId: string, userId: string) {
    const concern = await this.prisma.concern.findUnique({ where: { id: concernId } });
    if (!concern) throw new ApiException(404, 'CONCERN_404', '고민을 찾을 수 없습니다');
    await this.verifyChild(concern.childId, userId);
    return concern;
  }

  private async verifyChild(childId: string, userId: string): Promise<string> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { familyId: true },
    });
    if (!child) throw new ApiException(404, 'CHILD_404', '아이를 찾을 수 없습니다');
    const member = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId: child.familyId } },
    });
    if (!member) throw new ApiException(403, 'FORBIDDEN', '가족 구성원이 아닙니다');
    return child.familyId;
  }

  private async behaviorRecords(childId: string, days: number): Promise<BehaviorRecord[]> {
    const rows = await this.prisma.sessionFeedback.findMany({
      where: {
        childId,
        feedbackType: 'BEHAVIORAL_ISSUE',
        sessionDate: { gte: new Date(Date.now() - days * DAY_MS) },
      },
      orderBy: { sessionDate: 'asc' },
      select: {
        id: true,
        sessionDate: true,
        content: true,
        behaviorTags: true,
        severity: true,
        antecedent: true,
        parentResponse: true,
        settled: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.sessionDate.toISOString().slice(0, 10),
      content: r.content,
      behaviorTags: r.behaviorTags,
      severity: r.severity,
      antecedent: r.antecedent,
      parentResponse: r.parentResponse,
      settled: r.settled,
    }));
  }
}

// ─── 순수 함수 (테스트 대상) ────────────────────────────

/** 힘든 행동 기록이 이 고민에 해당하는지: 태그가 겹치거나 내용에 키워드가 있으면 */
export function matches(
  b: Pick<BehaviorRecord, 'behaviorTags' | 'content'>,
  c: { matchTags: string[]; keywords: string[] },
): boolean {
  return (
    b.behaviorTags.some((t) => c.matchTags.includes(t)) ||
    c.keywords.some((k) => k.length >= 2 && b.content.includes(k))
  );
}

/**
 * 관련 논문 검색어: 행동 이름이 제목에 있는 자폐 중재 연구 (약물 연구 제외).
 * 넓게 찾으면 자폐 일반 리뷰만 나와서 제목으로 좁힘
 */
export function pubmedQuery(terms: string[]): string | null {
  const clean = terms
    .map((t) => t.replace(/["()\[\]]/g, '').trim())
    .filter((t) => /^[a-zA-Z][a-zA-Z\s-]{2,40}$/.test(t) && !/autis|asd/i.test(t))
    .slice(0, 5);
  if (clean.length === 0) return null;
  const titleTerms = clean.map((t) => (t.includes(' ') ? `"${t}"[ti]` : `${t}[ti]`)).join(' OR ');
  return `(${titleTerms}) AND (autism[tiab] OR autistic[tiab]) AND (intervention[tiab] OR treatment[tiab] OR parent[tiab]) NOT (drug[ti] OR pharmacological[ti])`;
}

/** 키워드로 쓰면 다른 기록까지 잡히는 흔한 말 */
const GENERIC_WORDS = new Set([
  '바닥',
  '손',
  '발',
  '울음',
  '행동',
  '소리',
  '아이',
  '집',
  '마트',
  '밖',
]);

const STOP_WORDS = new Set(['하기', '해요', '있어요', '자꾸', '계속', '너무', '아이가', '아이']);

/** 고민 제목에서 기록 연결용 키워드 (AI 관점 정리 후에는 AI 키워드로 바뀜) */
export function titleKeywords(title: string): string[] {
  return [
    ...new Set(
      title
        .split(/[\s,·/]+/)
        .map((w) => w.replace(/(을|를|이|가|은|는|으로|로|에서|에)$/, ''))
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w)),
    ),
  ].slice(0, 5);
}

/** 시작일을 1일째로 셈 */
export function dayNumber(startDate: string, today: string): number {
  return (
    Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS) +
    1
  );
}

/** 최근 6주 주별 횟수 · 바로 전 상황 · 반응별 금방 멈춘 비율 */
export function buildPattern(matched: BehaviorRecord[], today: string) {
  const weeks = Array.from({ length: PATTERN_WEEKS }, (_, i) => {
    const end = addDays(today, -7 * (PATTERN_WEEKS - 1 - i));
    const start = addDays(end, -6);
    return {
      start,
      end,
      count: matched.filter((b) => b.date >= start && b.date <= end).length,
    };
  });
  const since = weeks[0].start;
  const recent = matched.filter((b) => b.date >= since);

  const byAntecedent = new Map<string, number>();
  const byResponse = new Map<string, { count: number; quick: number }>();
  for (const b of recent) {
    if (b.antecedent && b.antecedent !== ANTECEDENT_OPTIONS[ANTECEDENT_OPTIONS.length - 1]) {
      byAntecedent.set(b.antecedent, (byAntecedent.get(b.antecedent) ?? 0) + 1);
    }
    if (b.parentResponse) {
      const r = byResponse.get(b.parentResponse) ?? { count: 0, quick: 0 };
      r.count++;
      if (b.settled === 'QUICK') r.quick++;
      byResponse.set(b.parentResponse, r);
    }
  }

  return {
    total: recent.length,
    weeks,
    byAntecedent: [...byAntecedent.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byResponse: [...byResponse.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.count - a.count),
    /** 언제 · 왜 를 적은 기록 수 (패턴을 보기에 충분한지) */
    withContext: recent.filter((b) => b.antecedent || b.parentResponse).length,
    recent: recent
      .slice(-5)
      .reverse()
      .map((b) => ({
        date: b.date,
        content: b.content.slice(0, 80),
        antecedent: b.antecedent,
        parentResponse: b.parentResponse,
        settled: b.settled,
      })),
  };
}

/** 시도 전 2주 vs 시도 중: 주당 횟수로 비교 */
export function compareTrial(
  matched: Array<Pick<BehaviorRecord, 'date'>>,
  startDate: string,
  endDate: string,
  today: string,
) {
  const beforeStart = addDays(startDate, -TRIAL_DAYS);
  const before = matched.filter((b) => b.date >= beforeStart && b.date < startDate).length;
  const last = today < endDate ? today : endDate;
  const days = Math.max(1, dayNumber(startDate, last));
  const during = matched.filter((b) => b.date >= startDate && b.date <= last).length;
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    beforePerWeek: round(before / 2),
    duringPerWeek: round((during / days) * 7),
    duringDays: days,
  };
}

const PERSPECTIVES_SYSTEM = `당신은 자폐 아동 부모를 돕는 안내자입니다. 하나의 정답을 주지 않고,
서로 다른 전문 관점이 같은 행동을 어떻게 보고 집에서 무엇을 권하는지 공정하게 정리합니다.
- 연구 근거 수준을 과장하지 않습니다 (STRONG: 여러 연구로 효과 확인, MODERATE: 연구가 있으나 제한적, EMERGING: 초기 연구, VIEWPOINT: 연구보다 관점 · 가치)
- 벌주기, 억지로 막기, 몸을 붙잡기, 무시해서 없애기 같은 방법은 권하지 않습니다
- 자해 · 공격처럼 다칠 수 있으면 safetyAlert 를 true 로 하고 전문가 상담을 먼저 권합니다
- 부모를 탓하지 않고 따뜻하게, 쉬운 말로 씁니다. 전문 용어는 괄호로 한 번만 덧붙입니다
- 마크다운 없이 JSON 하나만 출력합니다`;

function buildPerspectivesPrompt(p: {
  title: string;
  diagnosis: string | null;
  centers: string[];
  behaviors: BehaviorRecord[];
  pattern: ReturnType<typeof buildPattern>;
  sessionNotes: string[];
  opinions: string[];
}): string {
  const records = p.behaviors
    .slice(-15)
    .map(
      (b) =>
        `- ${b.date} ${b.behaviorTags.join('/')} "${b.content.slice(0, 80)}"${b.antecedent ? ` · 전: ${b.antecedent}` : ''}${b.parentResponse ? ` · 반응: ${b.parentResponse}` : ''}${b.settled ? ` · 진정: ${b.settled}` : ''}`,
    )
    .join('\n');
  return `부모의 고민: "${p.title}"
${p.diagnosis ? `진단: ${p.diagnosis}\n` : ''}${p.centers.length ? `다니는 수업: ${p.centers.join(', ')}\n` : ''}
이 고민과 관련된 최근 기록 (${p.behaviors.length}건):
${records || '(아직 없음)'}
${p.pattern.byAntecedent.length ? `바로 전 상황: ${p.pattern.byAntecedent.map((a) => `${a.label} ${a.count}번`).join(', ')}\n` : ''}${p.pattern.byResponse.length ? `부모 반응별 금방 멈춘 횟수: ${p.pattern.byResponse.map((r) => `${r.label} ${r.quick}/${r.count}`).join(', ')}\n` : ''}
센터 수업 피드백 (최근 60일):
${p.sessionNotes.join('\n') || '(없음)'}
${p.opinions.length ? `\n이 고민에 대해 선생님이 직접 주신 의견:\n${p.opinions.join('\n')}\n` : ''}
정리할 것
1. keywords: 기록 내용에서 이 행동만 골라낼 한국어 단어 2~4개 (예: 탁탁, 두드리). 장소 · 몸 부위 · 흔한 말(바닥, 손, 울음, 행동)은 다른 기록까지 잡히니 쓰지 마세요
2. summary: 이 행동을 한 문장으로 쉽게 설명 (100자 이내)
3. centerView: 위 센터 피드백 · 선생님 의견 중 이 행동에 대한 말이 있으면 {source: "수업 종류 · 날짜", text: 그 말 요약, approach: 아래 관점 중 어디에 가까운지}. 없으면 null
4. patternInsight: 기록이 3건 이상이면 언제 많이 나오고 어떤 반응에 금방 멈췄는지 보고 '가능성'으로 한두 문장 (단정하지 말 것). 아니면 null
5. perspectives: 아래 4가지 관점을 각각 (이 행동에 맞게 구체적으로)
   BEHAVIORAL(행동주의 · ABA), DEVELOPMENTAL(발달 · 놀이 중심 · ESDM · Floortime 등), SENSORY(감각통합 · 작업치료), NEURODIVERSITY(신경다양성 관점)
   각각 why(왜 한다고 보나, 100자), atHome(집에서 할 일, 150자), caution(주의할 점, 없으면 null), evidence(위 기준), strategies(2주 동안 해볼 구체적인 방법 1~2개: title 20자, how 단계까지 200자)
6. pubmedTerms: 이 행동을 부르는 영어 이름 2~5개 (논문 제목에 쓰이는 말, 예: ["stereotypy", "repetitive behaviors", "stimming"])

JSON 형식:
{"keywords":[],"summary":"","centerView":null,"patternInsight":null,"safetyAlert":false,"perspectives":[{"approach":"BEHAVIORAL","why":"","atHome":"","caution":null,"evidence":"STRONG","strategies":[{"title":"","how":""}]}],"pubmedTerms":[]}`;
}
