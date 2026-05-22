import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';

export type AiProvider = 'CLAUDE_BEDROCK' | 'CLAUDE_DIRECT' | 'GEMINI' | 'OPENAI';

export interface AiConfigItem {
  id: string;
  name: string;
  provider: AiProvider;
  isActive: boolean;
  isDefault: boolean;
  maskedApiKey: string | null;
  maskedAccessKeyId: string | null;
  modelId: string | null;
  maxTokens: number;
  temperature: number;
  dailyBudgetLimit: number;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  createdAt: string;
}

export interface CreateAiConfigInput {
  name: string;
  provider: AiProvider;
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

export interface UpdateAiConfigInput {
  name?: string;
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
      const { data } = await adminApi.get<{ success: true; data: AiConfigItem[] }>(
        '/admin/ai-config',
      );
      return data.data;
    },
    staleTime: 30000,
  });
}

export function useCreateAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAiConfigInput) => {
      const { data } = await adminApi.post<{ success: true; data: AiConfigItem }>(
        '/admin/ai-config',
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

export function useUpdateAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: UpdateAiConfigInput }) => {
      const { data } = await adminApi.put<{ success: true; data: AiConfigItem }>(
        `/admin/ai-config/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

export function useDeleteAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await adminApi.delete(`/admin/ai-config/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

export function useSetDefaultAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await adminApi.post<{ success: true; data: AiConfigItem }>(
        `/admin/ai-config/${id}/default`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

export function useTestAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await adminApi.get<{ success: boolean; latencyMs: number; error?: string }>(
        `/admin/ai-config/${id}/test`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}
