import { useState, useCallback } from 'react';

export type AiProvider = 'claude-bedrock' | 'claude-direct' | 'gemini' | 'openai';

export interface AiProviderConfig {
  provider: AiProvider;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  config: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
  dailyBudgetLimit: number;
}

const MOCK_CONFIGS: AiProviderConfig[] = [
  {
    provider: 'claude-bedrock',
    isActive: true,
    isDefault: true,
    lastTestedAt: '2025-05-18T14:30:00Z',
    lastTestSuccess: true,
    config: {
      awsRegion: 'us-east-1',
      awsAccessKeyId: '',
      awsSecretKey: '',
      modelId: 'claude-sonnet-4-20250514',
    },
    maxTokens: 4096,
    temperature: 0.7,
    dailyBudgetLimit: 50000,
  },
  {
    provider: 'claude-direct',
    isActive: false,
    isDefault: false,
    lastTestedAt: '2025-05-15T10:00:00Z',
    lastTestSuccess: false,
    config: {
      apiKey: '',
      modelId: 'claude-sonnet-4-20250514',
    },
    maxTokens: 4096,
    temperature: 0.7,
    dailyBudgetLimit: 30000,
  },
  {
    provider: 'gemini',
    isActive: true,
    isDefault: false,
    lastTestedAt: '2025-05-17T09:15:00Z',
    lastTestSuccess: true,
    config: {
      apiKey: '',
      modelId: 'gemini-2.0-flash',
    },
    maxTokens: 8192,
    temperature: 0.8,
    dailyBudgetLimit: 20000,
  },
  {
    provider: 'openai',
    isActive: false,
    isDefault: false,
    lastTestedAt: null,
    lastTestSuccess: null,
    config: {
      apiKey: '',
      modelId: 'gpt-4o',
    },
    maxTokens: 4096,
    temperature: 1.0,
    dailyBudgetLimit: 40000,
  },
];

export function useAiConfigs() {
  const [configs, setConfigs] = useState<AiProviderConfig[]>(MOCK_CONFIGS);
  const [isLoading] = useState(false);

  return { configs, setConfigs, isLoading };
}

export function useUpsertAiConfig() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (_provider: AiProvider, _data: Partial<AiProviderConfig>) => {
    setIsLoading(true);
    // TODO: Replace with real API call
    // await adminApi.put(`/admin/ai-config/${provider}`, data);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    return { success: true };
  }, []);

  return { mutate, isLoading };
}

export function useTestConnection() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (_provider: AiProvider) => {
    setIsLoading(true);
    // TODO: Replace with real API call
    // const res = await adminApi.get(`/admin/ai-config/${provider}/test`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const success = Math.random() > 0.3;
    setIsLoading(false);
    return { success, latencyMs: Math.floor(Math.random() * 800) + 200 };
  }, []);

  return { mutate, isLoading };
}
