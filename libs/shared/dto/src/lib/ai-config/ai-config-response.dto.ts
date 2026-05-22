export interface AiConfigResponse {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  isDefault: boolean;
  maskedApiKey: string | null;
  maskedAccessKeyId: string | null;
  modelId: string | null;
  maxTokens: number;
  temperature: number;
  dailyBudgetLimit: number;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
}

export interface DecryptedAiConfig {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  isDefault: boolean;
  apiKey: string | null;
  region: string | null;
  accessKeyId: string | null;
  secretKey: string | null;
  modelId: string | null;
  maxTokens: number;
  temperature: number;
  dailyBudgetLimit: number;
}
