import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';

/** API 응답 { success, data } 에서 data 꺼내기 */
async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await adminApi.get(url, { params });
  return data.data as T;
}

// ─── 운영 현황 ─────────────────────────────────────────

export interface BatchRun {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: unknown;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Overview {
  generatedAt: string;
  lastNight: BatchRun | null;
  ai: { todayCalls: number; dailyLimit: number | null; failures24h: number; monthCostUsd: number };
  todos: Array<{ kind: string; title: string; detail: string; link: string }>;
  stats: { families: number; children: number; activeFamiliesThisWeek: number; newUsers7d: number };
  families: Array<{ id: string; name: string; recordDays7: number }>;
}

export function useOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => get<Overview>('/admin/overview'),
    refetchInterval: 60_000,
  });
}

// ─── AI 사용량 ─────────────────────────────────────────

export interface AiUsage {
  days: Array<{ date: string; byModel: Record<string, number> }>;
  today: {
    calls: number;
    features: Array<{ feature: string; calls: number; failures: number; avgLatencyMs: number }>;
  };
  month: { estimatedCostUsd: number; inputTokens: number; outputTokens: number };
  recentFailures: Array<{ at: string; feature: string; error: string }>;
}

export function useAiUsage(days = 7) {
  return useQuery({
    queryKey: ['admin-ai-usage', days],
    queryFn: () => get<AiUsage>('/admin/ai/usage', { days }),
    refetchInterval: 60_000,
  });
}

export interface DailyRecordQuality {
  days: number;
  freeformRecords: number;
  detailedRecords: number;
  freeformShare: number | null;
  editedRate: number | null;
  answerRate: number | null;
  abandoned: number;
  failed: number;
}

export function useDailyRecordQuality(days = 7) {
  return useQuery({
    queryKey: ['admin-daily-record-quality', days],
    queryFn: () => get<DailyRecordQuality>('/admin/ai/daily-record-quality', { days }),
    refetchInterval: 60_000,
  });
}

// ─── 자동 작업 ─────────────────────────────────────────

export interface JobInfo {
  type: string;
  name: string;
  description: string;
  schedule: string;
  nextRunAt: string | null;
  lastRun: BatchRun | null;
}

export function useJobs() {
  return useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => get<JobInfo[]>('/admin/jobs'),
    // 실행 중인 작업이 있으면 진행률을 자주 갱신
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.lastRun?.status === 'RUNNING') ? 3_000 : 30_000,
  });
}

export function useJobRuns(type: string | null) {
  return useQuery({
    queryKey: ['admin-job-runs', type],
    queryFn: () => get<BatchRun[]>(`/admin/jobs/${type}/runs`, { limit: 10 }),
    enabled: !!type,
    refetchInterval: 10_000,
  });
}

export function useRunJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: string) => {
      await adminApi.post(`/admin/jobs/${type}/run`);
    },
    onSuccess: () => {
      // 작업이 RUNNING 기록을 남길 시간을 조금 준 뒤 갱신
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['admin-job-runs'] });
      }, 800);
    },
  });
}

// ─── 계정 도구 ─────────────────────────────────────────

export function useIssueTempPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await adminApi.post(`/admin/users/${userId}/temp-password`);
      return data.data as { email: string; tempPassword: string };
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, confirmEmail }: { userId: string; confirmEmail: string }) => {
      const { data } = await adminApi.delete(`/admin/users/${userId}`, { data: { confirmEmail } });
      return data.data as { email: string; deletedFamilies: number; deletedChildren: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-families'] });
    },
  });
}

// ─── 감사 로그 ─────────────────────────────────────────

export interface AuditLogRow {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
}

export function useAuditLogs(params: {
  page: number;
  limit: number;
  action?: string;
  resource?: string;
}) {
  return useQuery({
    queryKey: ['admin-audit-logs', params],
    queryFn: () =>
      get<{ data: AuditLogRow[]; meta: { page: number; limit: number; total: number } }>(
        '/admin/audit-logs',
        params,
      ),
  });
}

// ─── 질문지 ───────────────────────────────────────────

export interface AdminQuestionnaire {
  id: string;
  name: string;
  type: string;
  licensedTool: string | null;
  familyName: string;
  isActive: boolean;
  itemCount: number;
  assessmentCount: number;
  createdAt: string;
}

export function useAdminQuestionnaires() {
  return useQuery({
    queryKey: ['admin-questionnaires'],
    queryFn: () => get<AdminQuestionnaire[]>('/admin/questionnaires'),
  });
}

export function useQuestionnaireItems(id: string | null) {
  return useQuery({
    queryKey: ['admin-questionnaire-items', id],
    queryFn: () =>
      get<Array<{ id: string; domain: string; text: string; orderIndex: number }>>(
        `/admin/questionnaires/${id}/items`,
      ),
    enabled: !!id,
  });
}

export function useSetQuestionnaireActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await adminApi.patch(`/admin/questionnaires/${id}/active`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-questionnaires'] }),
  });
}

// ─── 논문 ─────────────────────────────────────────────

export interface AdminArticle {
  id: string;
  pubmedId: string;
  title: string;
  journal: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  hasSummary: boolean;
  koreanSummary: string | null;
  matchedFamilies: number;
}

export function useResearchArticles(missingSummaryOnly: boolean) {
  return useQuery({
    queryKey: ['admin-research-articles', missingSummaryOnly],
    queryFn: () =>
      get<{ missingSummaries: number; data: AdminArticle[] }>('/admin/research/articles', {
        missingSummaryOnly: missingSummaryOnly ? 'true' : undefined,
        limit: 200,
      }),
  });
}
