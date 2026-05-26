import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type {
  Assessment,
  AggregatedAssessment,
  CreateAssessmentInput,
  Questionnaire,
} from '../types/api.types.js';

export function useAssessments(childId: string | null) {
  return useQuery<Assessment[]>({
    queryKey: ['assessments', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/assessments`);
      return data.data as Assessment[];
    },
    enabled: !!childId,
  });
}

export function useAggregatedAssessment(childId: string | null) {
  return useQuery<AggregatedAssessment>({
    queryKey: ['assessments', 'aggregated', childId],
    queryFn: async () => {
      const { data } = await api.get(`/children/${childId}/assessments/aggregated`);
      return data.data as AggregatedAssessment;
    },
    enabled: !!childId,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, input }: { childId: string; input: CreateAssessmentInput }) => {
      const { data } = await api.post(`/children/${childId}/assessments`, input);
      return data.data as Assessment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['assessments', 'aggregated', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.childId] });
      queryClient.invalidateQueries({ queryKey: ['growth', variables.childId] });
    },
  });
}

export function useQuestionnaires() {
  return useQuery<Questionnaire[]>({
    queryKey: ['questionnaires'],
    queryFn: async () => {
      const { data } = await api.get('/questionnaires');
      return data.data as Questionnaire[];
    },
  });
}

export function useQuestionnaireDetail(id: string | null) {
  return useQuery<Questionnaire>({
    queryKey: ['questionnaires', id],
    queryFn: async () => {
      const { data } = await api.get(`/questionnaires/${id}`);
      return data.data as Questionnaire;
    },
    enabled: !!id,
  });
}
