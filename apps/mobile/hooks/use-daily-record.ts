import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export const DAILY_RECORD_DOMAINS = [
  { key: 'DAILY_LIVING', label: '일상생활' },
  { key: 'COMMUNICATION', label: '의사소통' },
  { key: 'COGNITIVE', label: '인지' },
  { key: 'SOCIAL', label: '사회성' },
  { key: 'MOTOR', label: '운동' },
] as const;

export type DailyRecordDomain = (typeof DAILY_RECORD_DOMAINS)[number]['key'];

export interface DailyRecordSummary {
  date: string;
  scores: Partial<Record<DailyRecordDomain, number>> | null;
  note: string | null;
  feedbacks: Array<{ id: string; feedbackType: string; sessionType: string; content: string }>;
}

export interface CreateDailyRecordInput {
  date?: string;
  scores: Partial<Record<DailyRecordDomain, number>>;
  note?: string;
  session?: { sessionType: string; therapistFeedback?: string };
  behavior?: { severity: number; tags: string[]; content: string } & BehaviorContext;
}

/** 힘든 행동: 바로 전 상황 · 부모 반응 · 진정까지 (모두 선택) */
export interface BehaviorContext {
  antecedent?: string | null;
  parentResponse?: string | null;
  settled?: 'QUICK' | 'SOME' | 'LONG' | null;
}

export function useDailyRecord(childId: string | null) {
  return useQuery<DailyRecordSummary>({
    queryKey: ['daily-record', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/daily-records`);
      return data.data as DailyRecordSummary;
    },
    enabled: !!childId,
  });
}

export function useCreateDailyRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: CreateDailyRecordInput }) => {
      const { data } = await api.post(`/children/${childId}/daily-records`, input);
      return data.data as DailyRecordSummary;
    },
    onSuccess: (summary, variables) => {
      queryClient.setQueryData(['daily-record', variables.childId], summary);
      queryClient.invalidateQueries({ queryKey: ['insight', 'weekly', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['daily-timeline', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['assessments', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['growth', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['session-feedbacks', variables.childId] });
    },
  });
}

export interface DailyTimelineDay {
  date: string;
  scores: Partial<Record<DailyRecordDomain, number>> | null;
  note: string | null;
  feedbacks: Array<{
    id: string;
    feedbackType: string;
    sessionType: string;
    content: string;
    severity: number | null;
    behaviorTags: string[];
  }>;
  activities: { done: number; total: number } | null;
  /** 쭉 적기로 남긴 원문 */
  freeform: Array<{ id: string; rawText: string; status: string }>;
}

/** 기록 모아보기: 최근 days 일 날짜별 묶음 (최신순) */
export function useDailyTimeline(childId: string | null, days: number) {
  return useQuery<DailyTimelineDay[]>({
    queryKey: ['daily-timeline', childId, days],
    queryFn: async () => {
      const from = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const { data } = await api.get(`/children/${childId}/daily-records/timeline?from=${from}`);
      return data.data as DailyTimelineDay[];
    },
    enabled: !!childId,
  });
}

// ─── 쭉 적기 (AI 정리) ───────────────────────────────────

export interface FreeformDraft {
  scores: Partial<Record<DailyRecordDomain, { score: number; reason: string }>>;
  note: string | null;
  sessions: Array<{ sessionType: string; therapistFeedback: string | null }>;
  behaviors: Array<{ tags: string[]; content: string; severity: number | null } & BehaviorContext>;
}

export interface FreeformQuestion {
  kind: 'BEHAVIOR_SEVERITY' | 'SESSION_HOMEWORK' | 'SCORE' | 'NOTE';
  index?: number;
  domain?: DailyRecordDomain;
  question: string;
  answer: 'scale' | 'text';
}

export type AnalyzeResult =
  | { entryId: string; status: 'DRAFT'; draft: FreeformDraft; questions: FreeformQuestion[] }
  | { entryId: string; status: 'FAILED'; reason: string; record: DailyRecordSummary };

export interface ConfirmFreeformInput {
  scores: Partial<Record<DailyRecordDomain, number>>;
  note?: string;
  sessions: Array<{ sessionType: string; therapistFeedback?: string }>;
  behaviors: Array<{ tags: string[]; content: string; severity: number | null } & BehaviorContext>;
  answers: Array<{ index: number; value: number | string }>;
}

/** 쭉 적기를 지금 쓸 수 있는지 (AI 꺼짐 · 한도 초과면 자세히 입력으로) */
export function useFreeformAvailability(childId: string | null) {
  return useQuery<{ available: boolean; reason?: string }>({
    queryKey: ['freeform-availability', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/daily-records/freeform/availability`);
      return data.data;
    },
    enabled: !!childId,
    staleTime: 60_000,
  });
}

function invalidateRecord(queryClient: ReturnType<typeof useQueryClient>, childId: string) {
  queryClient.invalidateQueries({ queryKey: ['daily-record', childId] });
  queryClient.invalidateQueries({ queryKey: ['insight', 'weekly', childId] });
  queryClient.invalidateQueries({ queryKey: ['daily-timeline', childId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', childId] });
  queryClient.invalidateQueries({ queryKey: ['assessments', childId] });
  queryClient.invalidateQueries({ queryKey: ['growth', childId] });
  queryClient.invalidateQueries({ queryKey: ['session-feedbacks', childId] });
}

export function useAnalyzeFreeform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, text }: { childId: string; text: string }) => {
      const { data } = await api.post(`/children/${childId}/daily-records/freeform/analyze`, {
        text,
      });
      return data.data as AnalyzeResult;
    },
    // AI 가 실패하면 원문이 일상 메모로 이미 저장됨
    onSuccess: (result, { childId }) => {
      if (result.status === 'FAILED') invalidateRecord(queryClient, childId);
      queryClient.invalidateQueries({ queryKey: ['freeform-availability', childId] });
    },
  });
}

export function useConfirmFreeform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      entryId,
      input,
    }: {
      childId: string;
      entryId: string;
      input: ConfirmFreeformInput;
    }) => {
      const { data } = await api.post(
        `/children/${childId}/daily-records/freeform/${entryId}/confirm`,
        input,
      );
      return data.data as DailyRecordSummary;
    },
    onSuccess: (summary, { childId }) => {
      queryClient.setQueryData(['daily-record', childId], summary);
      invalidateRecord(queryClient, childId);
    },
  });
}
