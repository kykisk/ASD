import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';

export type AiProvider = 'CLAUDE_BEDROCK' | 'CLAUDE_DIRECT' | 'GEMINI' | 'OPENAI';

export interface AiProviderConfig {
  provider: AiProvider;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  modelId: string | null;
  maxTokens: number;
  temperature: number;
  dailyBudgetLimit: number;
  maskedApiKey?: string;
  maskedAccessKeyId?: string;
}

export interface UpsertAiConfigInput {
  isActive?: boolean;
  isDefault?: boolean;
  apiKey?: string;
  region?: string;
  accessKeyId?: string;
  secretKey?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  dailyBudgetLimit?: number;
}

export function useAiConfigs() {
  return useQuery({
    queryKey: ['ai-configs'],
    queryFn: async () => {
      const { data } = await adminApi.get<{ success: true; data: AiProviderConfig[] }>(
        '/admin/ai-config',
      );
      return data.data;
    },
    staleTime: 30000,
  });
}

export function useUpsertAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider, data }: { provider: AiProvider; data: UpsertAiConfigInput }) => {
      const { data: response } = await adminApi.put<{ success: true; data: AiProviderConfig }>(
        `/admin/ai-config/${provider}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (provider: AiProvider) => {
      const { data } = await adminApi.get<{ success: boolean; latencyMs: number; error?: string }>(
        `/admin/ai-config/${provider}/test`,
      );
      return data;
    },
  });
}
