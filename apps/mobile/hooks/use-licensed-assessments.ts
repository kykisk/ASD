import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface LicensedQuestionnaireItem {
  id: string;
  domain: string;
  text: string;
  description?: string;
  orderIndex: number;
}

export interface LicensedQuestionnaire {
  id: string;
  name: string;
  licensedTool: string;
  items: LicensedQuestionnaireItem[];
}

export interface ScoringResult {
  tool: string;
  totalScore: number;
  maxPossibleScore: number;
  severity: string;
  interpretation: string;
  clinicalDescription: string;
  recommendations: string[];
  subscaleScores: Record<string, number>;
  subscaleInterpretations: Record<string, string>;
}

export function useFamilyLicense(familyId: string | null, tool: string | null) {
  return useQuery<{ tool: string; hasLicense: boolean }>({
    queryKey: ['licenses', familyId, tool],
    queryFn: async () => {
      const { data } = await api.get(`/families/${familyId}/licenses/${tool}`);
      return data.data as { tool: string; hasLicense: boolean };
    },
    enabled: !!familyId && !!tool,
  });
}

export function useToolConsentDocument(tool: string | null) {
  return useQuery<{ title: string; version: string; content: string }>({
    queryKey: ['consent', 'tool', tool, 'document'],
    queryFn: async () => {
      const { data } = await api.get(`/consent/tool/${tool}/document`);
      return data.data as { title: string; version: string; content: string };
    },
    enabled: !!tool,
  });
}

export function useToolConsentCheck(tool: string | null) {
  return useQuery<{ tool: string; consented: boolean }>({
    queryKey: ['consent', 'tool', tool, 'check'],
    queryFn: async () => {
      const { data } = await api.get(`/consent/tool/${tool}/check`);
      return data.data as { tool: string; consented: boolean };
    },
    enabled: !!tool,
  });
}

export function useRecordToolConsent() {
  return useMutation({
    mutationFn: async (tool: string) => {
      const { data } = await api.post(`/consent/tool/${tool}`, {});
      return data.data;
    },
  });
}

export function useToolQuestionnaire(familyId: string | null, tool: string | null) {
  return useQuery<LicensedQuestionnaire | undefined>({
    queryKey: ['questionnaires', 'licensed', familyId, tool],
    queryFn: async () => {
      const { data } = await api.get(`/families/${familyId}/questionnaires`);
      const questionnaires = data.data as Array<{
        id: string;
        name: string;
        type: string;
        licensedTool?: string;
        items: LicensedQuestionnaireItem[];
      }>;
      const match = questionnaires.find((q) => q.type === 'LICENSED' && q.licensedTool === tool);
      if (!match) return undefined;
      return {
        id: match.id,
        name: match.name,
        licensedTool: match.licensedTool ?? tool!,
        items: match.items,
      };
    },
    enabled: !!familyId && !!tool,
  });
}

export function useScoreAssessment() {
  return useMutation<ScoringResult, Error, string>({
    mutationFn: async (assessmentId: string) => {
      const { data } = await api.post(`/assessments/${assessmentId}/score`);
      return data.data as ScoringResult;
    },
  });
}
