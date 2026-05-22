import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export type Domain =
  | 'COMMUNICATION'
  | 'SOCIAL'
  | 'MOTOR'
  | 'COGNITIVE'
  | 'EMOTIONAL'
  | 'DAILY_LIVING'
  | 'OTHER';

export interface QuestionnaireItem {
  id?: string;
  domain: Domain;
  text: string;
  description?: string | null;
  weight: number;
  orderIndex?: number;
}

export interface Questionnaire {
  id: string;
  familyId: string;
  name: string;
  description?: string | null;
  domains: Domain[];
  items: QuestionnaireItem[];
  createdAt: string;
  updatedAt?: string;
}

interface CreateQuestionnaireInput {
  name: string;
  description?: string;
  domains: Domain[];
  items: Omit<QuestionnaireItem, 'id' | 'orderIndex'>[];
}

export function useQuestionnaires(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ['questionnaires', familyId],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Questionnaire[] }>(
        `/families/${familyId}/questionnaires`,
      );
      return data.data;
    },
    enabled: !!familyId,
  });
}

export function useCreateQuestionnaire(familyId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuestionnaireInput) => {
      const { data } = await api.post<{ success: true; data: Questionnaire }>(
        `/families/${familyId}/questionnaires`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['questionnaires', familyId],
      });
    },
  });
}

export function useImportQuestionnaire(
  familyId: string | null | undefined,
  format: 'csv' | 'excel',
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      const { data } = await api.post<{ success: true; data: Questionnaire }>(
         `/families/${familyId}/questionnaires/import/${format}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['questionnaires', familyId],
      });
    },
  });
}

export function useDeleteQuestionnaire(familyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionnaireId: string) => {
      await api.delete(`/questionnaires/${questionnaireId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires', familyId] });
    },
  });
}
