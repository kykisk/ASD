export interface AiConfigResponse {
  id: string;
  provider: string;
  isActive: boolean;
  isDefault: boolean;
  maskedApiKey: string | null;
  maskedRegion: string | null;
  maskedAccessKeyId: string | null;
  maskedSecretKey: string | null;
  modelId: string | null;
  maxTokens: number;
  temperature: number;
  dailyBudgetLimit: number;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedAiConfig {
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
