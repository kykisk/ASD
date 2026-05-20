import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface AssessmentItem {
  questionId: string;
  score: number;
  notes?: string;
  mediaUrls?: string[];
}

export interface Assessment {
  id: string;
  childId: string;
  questionnaireId: string;
  questionnaireName: string;
  items: AssessmentItem[];
  overallScore: number;
  overallNotes?: string;
  createdAt: string;
}

export interface DomainScore {
  domain: string;
  domainName: string;
  averageScore: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercentage: number;
  recentScores: number[];
}

export interface AggregatedAssessment {
  childId: string;
  domainScores: DomainScore[];
  totalAssessments: number;
  lastAssessmentDate: string | null;
}

interface CreateAssessmentInput {
  questionnaireId: string;
  items: AssessmentItem[];
  overallScore: number;
  overallNotes?: string;
}

export function useAssessments(childId: string | null) {
  return useQuery({
    queryKey: ['assessments', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Assessment[] }>(
        `/children/${childId}/assessments`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useAssessmentAggregated(childId: string | null) {
  return useQuery({
    queryKey: ['assessments', childId, 'aggregated'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: AggregatedAssessment }>(
        `/children/${childId}/assessments/aggregated`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      input,
    }: {
      childId: string;
      input: CreateAssessmentInput;
    }) => {
      const { data } = await api.post<{ success: true; data: Assessment }>(
        `/children/${childId}/assessments`,
        input,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['assessments', variables.childId],
      });
    },
  });
}

export function usePresignedUpload() {
  return useMutation({
    mutationFn: async ({
      childId,
      fileName,
      contentType,
    }: {
      childId: string;
      fileName: string;
      contentType: string;
    }) => {
      const { data } = await api.post<{
        success: true;
        data: { uploadUrl: string; fileUrl: string };
      }>(`/children/${childId}/media/presigned-url`, {
        fileName,
        contentType,
      });
      return data.data;
    },
  });
}
