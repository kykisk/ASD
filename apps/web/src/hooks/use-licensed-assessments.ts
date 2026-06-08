import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

// --- Types ---

export interface LicenseCheck {
  tool: string;
  hasLicense: boolean;
}

export interface ToolConsentDocument {
  title: string;
  version: string;
  content: string;
}

export interface ToolConsentCheck {
  tool: string;
  consented: boolean;
}

export interface LicensedQuestionnaireItem {
  id: string;
  domain: string;
  text: string;
  orderIndex: number;
}

export interface LicensedQuestionnaire {
  id: string;
  name: string;
  items: LicensedQuestionnaireItem[];
}

export interface SubscaleScore {
  name: string;
  score: number;
  maxScore: number;
  interpretation?: string;
}

export interface ScoringResult {
  tool: string;
  totalScore: number;
  maxPossibleScore: number;
  severity: string;
  interpretation: string;
  clinicalDescription: string;
  recommendations: string[];
  subscaleScores: SubscaleScore[];
  subscaleInterpretations: Record<string, string>;
}

// --- Hooks ---

/** Check if family has license for a specific tool */
export function useFamilyLicense(familyId: string | null, tool: string) {
  return useQuery({
    queryKey: ['licenses', familyId, tool],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: LicenseCheck }>(
        `/families/${familyId}/licenses/${tool}`,
      );
      return data.data;
    },
    enabled: !!familyId && !!tool,
  });
}

/** Get consent document for a licensed tool */
export function useToolConsentDocument(tool: string | null) {
  return useQuery({
    queryKey: ['consent', 'tool', tool, 'document'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ToolConsentDocument }>(
        `/consent/tool/${tool}/document`,
      );
      return data.data;
    },
    enabled: !!tool,
  });
}

/** Check if user has already consented to a tool */
export function useToolConsentCheck(tool: string | null) {
  return useQuery({
    queryKey: ['consent', 'tool', tool, 'check'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: ToolConsentCheck }>(
        `/consent/tool/${tool}/check`,
      );
      return data.data;
    },
    enabled: !!tool,
  });
}

/** Record user consent for a tool */
export function useRecordToolConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: string) => {
      const { data } = await api.post<{ success: true; data: { consentedAt: string } }>(
        `/consent/tool/${tool}`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', 'tool'] });
    },
  });
}

/** Get licensed questionnaire for a family/tool combination */
export function useToolQuestionnaire(familyId: string | null, tool: string | null) {
  return useQuery({
    queryKey: ['questionnaires', familyId, 'licensed', tool],
    queryFn: async () => {
      const { data } = await api.get<{
        success: true;
        data: Array<{
          id: string;
          type: string;
          licensedTool?: string;
          name: string;
          items: LicensedQuestionnaireItem[];
        }>;
      }>(`/families/${familyId}/questionnaires`, { params: { type: 'LICENSED' } });
      const match = data.data.find((q) => q.licensedTool === tool);
      if (!match) return null;
      return { id: match.id, name: match.name, items: match.items } as LicensedQuestionnaire;
    },
    enabled: !!familyId && !!tool,
  });
}

/** Score a completed assessment */
export function useScoreAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data } = await api.post<{ success: true; data: ScoringResult }>(
        `/assessments/${assessmentId}/score`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}
