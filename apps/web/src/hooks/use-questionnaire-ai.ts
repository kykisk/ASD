import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Domain, QuestionnaireItem } from './use-questionnaires';
import { getAiErrorMessage } from './use-curriculum';

export type RiskLevel = 'SAFE' | 'CAUTION' | 'HIGH_RISK';
export type OverallRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AiFilterItemResult {
  originalIndex: number;
  originalText: string;
  riskLevel: RiskLevel;
  reason?: string;
  suggestedRevision?: string;
}

export interface AiFilterResult {
  overallRisk: OverallRisk;
  items: AiFilterItemResult[];
}

export interface AiGenerateInput {
  childId?: string;
  familyId?: string;
  childAgeMonths: number;
  targetDomains: Domain[];
  additionalContext?: string;
}

export interface AiGeneratedItem {
  domain: Domain;
  text: string;
  weight: number;
}

export interface AiGenerateResult {
  name: string;
  description: string;
  domains: Domain[];
  items: AiGeneratedItem[];
  filterResult: AiFilterResult;
}

export function useAiFilter() {
  return useMutation({
    mutationFn: async (items: Pick<QuestionnaireItem, 'text' | 'domain'>[]) => {
      const { data } = await api.post<{ success: true; data: AiFilterResult }>(
        '/questionnaires/ai-filter',
        { items },
      );
      return data.data;
    },
    onError: (err) => {
      const msg = getAiErrorMessage(err);
      if (msg) alert(msg);
    },
  });
}

export function useAiGenerate() {
  return useMutation({
    mutationFn: async (input: AiGenerateInput) => {
      const { data } = await api.post<{ success: true; data: { generated: AiGenerateResult; questionnaire: unknown } }>(
        '/questionnaires/ai-generate',
        input,
      );
      return data.data.generated;
    },
    onError: (err) => {
      const msg = getAiErrorMessage(err);
      if (msg) alert(msg);
    },
  });
}
