import OpenAI from 'openai';
import type { AIProvider, AIRequestOptions, AIResponse } from '../ai-provider.interface.js';
import type { ProviderConfig } from '../ai-provider.factory.js';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OPENAI';
  private client: OpenAI;
  private modelId: string;
  private maxTokens: number;
  private temperature: number;

  constructor(private config: ProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey! });
    this.modelId = config.modelId || 'gpt-4o';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.7;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generate(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const messages = options.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.client.chat.completions.create({
      model: options.model || this.modelId,
      messages,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature ?? this.temperature,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - start,
      model: response.model,
      provider: this.name,
    };
  }
}
