import type { AIProvider } from './ai-provider.interface.js';

export type AIProviderName = 'CLAUDE_BEDROCK' | 'CLAUDE_DIRECT' | 'GEMINI' | 'OPENAI';

export interface ProviderConfig {
  apiKey?: string;
  region?: string;
  accessKeyId?: string;
  secretKey?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AIProviderFactory {
  static async create(providerName: AIProviderName, config: ProviderConfig): Promise<AIProvider> {
    switch (providerName) {
      case 'CLAUDE_BEDROCK': {
        const { ClaudeBedrockProvider } = await import('./providers/claude-bedrock.provider.js');
        return new ClaudeBedrockProvider(config);
      }
      case 'CLAUDE_DIRECT': {
        const { ClaudeDirectProvider } = await import('./providers/claude-direct.provider.js');
        return new ClaudeDirectProvider(config);
      }
      case 'GEMINI': {
        const { GeminiProvider } = await import('./providers/gemini.provider.js');
        return new GeminiProvider(config);
      }
      case 'OPENAI': {
        const { OpenAIProvider } = await import('./providers/openai.provider.js');
        return new OpenAIProvider(config);
      }
      default:
        throw new Error(`Unknown AI provider: ${providerName}`);
    }
  }
}
