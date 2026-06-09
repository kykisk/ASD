import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface SectionScore {
  name: string;
  score: number | null;
  unit?: string;
  percentile?: number | null;
}

export interface ClinicalReport {
  id: string;
  childId: string;
  assessmentTool: string;
  assessmentDate: string | null;
  evaluatorType: string | null;
  institution: string | null;
  sectionScores: SectionScore[];
  totalScore: number | null;
  totalScoreUnit: string | null;
  clinicalFindings: string | null;
  source: 'MANUAL' | 'IMAGE_IMPORT';
  createdAt: string;
}

export interface ClinicalReportExtraction {
  assessmentTool: string;
  assessmentDate: string | null;
  evaluatorType: string | null;
  institution: string | null;
  sectionScores: SectionScore[];
  totalScore: number | null;
  totalScoreUnit: string | null;
  clinicalFindings: string | null;
}

export interface CreateClinicalReportInput {
  assessmentTool: string;
  assessmentDate?: string | null;
  evaluatorType?: string | null;
  institution?: string | null;
  sectionScores?: SectionScore[];
  totalScore?: number | null;
  totalScoreUnit?: string | null;
  clinicalFindings?: string | null;
  source: 'MANUAL' | 'IMAGE_IMPORT';
}

export function useClinicalReports(childId: string | null) {
  return useQuery({
    queryKey: ['clinical-reports', childId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ClinicalReport[] }>(
        `/children/${childId}/clinical-reports`,
      );
      return data.data;
    },
    enabled: !!childId,
  });
}

export function useCreateClinicalReport(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClinicalReportInput) => {
      const { data } = await api.post<{ success: true; data: ClinicalReport }>(
        `/children/${childId}/clinical-reports`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinical-reports', childId],
      });
    },
  });
}

export function useDeleteClinicalReport(childId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      await api.delete(`/clinical-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinical-reports', childId],
      });
    },
  });
}

export function useExtractFromImage(childId: string | null) {
  return useMutation({
    mutationFn: async (images: Array<{ base64: string; mimeType: string }>) => {
      const { data } = await api.post<{
        success: true;
        data: { extraction: ClinicalReportExtraction };
      }>(`/children/${childId}/clinical-reports/from-image`, { images });
      return data.data;
    },
  });
}
