import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface ConcernListItem {
  id: string;
  title: string;
  status: 'ACTIVE' | 'RESOLVED';
  matchTags: string[];
  recordCount30d: number;
  activeTrial: { id: string; title: string; day: number; ended: boolean } | null;
  hasPerspectives: boolean;
}

export interface Perspectives {
  summary: string;
  centerView: { source: string; text: string; approach: string } | null;
  patternInsight: string | null;
  safetyAlert: boolean;
  perspectives: Array<{
    approach: string;
    why: string;
    atHome: string;
    caution: string | null;
    evidence: string;
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

export interface Trial {
  id: string;
  title: string;
  how: string;
  approach: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'DONE' | 'STOPPED';
  rating: 'GOOD' | 'SO_SO' | 'NOT_GOOD' | null;
  note: string | null;
  day: number;
  needsRating: boolean;
  comparison: { beforePerWeek: number; duringPerWeek: number; duringDays: number };
}

export interface ConcernDetail {
  concern: {
    id: string;
    title: string;
    status: 'ACTIVE' | 'RESOLVED';
    matchTags: string[];
    keywords: string[];
    createdAt: string;
  };
  perspectives: Perspectives | null;
  perspectivesAt: string | null;
  safety: boolean;
  pattern: {
    total: number;
    weeks: Array<{ start: string; end: string; count: number }>;
    byAntecedent: Array<{ label: string; count: number }>;
    byResponse: Array<{ label: string; count: number; quick: number }>;
    withContext: number;
    recent: Array<{
      date: string;
      content: string;
      antecedent: string | null;
      parentResponse: string | null;
      settled: string | null;
    }>;
  };
  trials: Trial[];
  teacherOpinions: Array<{ id: string; sessionType: string; content: string; date: string }>;
}

export function useConcerns(childId: string | null) {
  return useQuery<{
    concerns: ConcernListItem[];
    suggestions: Array<{ tag: string; count: number }>;
  }>({
    queryKey: ['concerns', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/concerns`);
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useConcern(id: string | undefined) {
  return useQuery<ConcernDetail>({
    queryKey: ['concern', id],
    queryFn: async () => {
      const { data } = await api.get(`/concerns/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

/** 상세를 돌려주는 작업들: 결과로 바로 화면 갱신 */
function useConcernMutation<TVars>(request: (vars: TVars) => Promise<ConcernDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (detail) => {
      queryClient.setQueryData(['concern', detail.concern.id], detail);
      queryClient.invalidateQueries({ queryKey: ['concerns'] });
    },
  });
}

export function useCreateConcern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      title,
      matchTags,
    }: {
      childId: string;
      title: string;
      matchTags: string[];
    }) => {
      const { data } = await api.post(`/children/${childId}/concerns`, { title, matchTags });
      return data.data as { id: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['concerns'] }),
  });
}

export function useGeneratePerspectives() {
  return useConcernMutation(async (id: string) => {
    const { data } = await api.post(`/concerns/${id}/perspectives`, {}, { timeout: 120_000 });
    return data.data as ConcernDetail;
  });
}

export function useStartTrial() {
  return useConcernMutation(
    async ({
      id,
      title,
      how,
      approach,
    }: {
      id: string;
      title: string;
      how: string;
      approach: string;
    }) => {
      const { data } = await api.post(`/concerns/${id}/trials`, { title, how, approach });
      return data.data as ConcernDetail;
    },
  );
}

export function useUpdateTrial() {
  return useConcernMutation(
    async ({
      trialId,
      status,
      rating,
    }: {
      trialId: string;
      status: 'DONE' | 'STOPPED';
      rating?: 'GOOD' | 'SO_SO' | 'NOT_GOOD';
    }) => {
      const { data } = await api.patch(`/trials/${trialId}`, { status, rating });
      return data.data as ConcernDetail;
    },
  );
}

export function useAddTeacherOpinion() {
  return useConcernMutation(
    async ({ id, sessionType, content }: { id: string; sessionType: string; content: string }) => {
      const { data } = await api.post(`/concerns/${id}/teacher-opinions`, { sessionType, content });
      return data.data as ConcernDetail;
    },
  );
}

export function useUpdateConcern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'RESOLVED' }) => {
      await api.patch(`/concerns/${id}`, { status });
    },
    onSuccess: (_d, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['concerns'] });
      queryClient.invalidateQueries({ queryKey: ['concern', id] });
    },
  });
}

export function useDeleteConcern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/concerns/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['concerns'] }),
  });
}
