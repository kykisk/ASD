import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIRequestOptions, AIResponse } from '../ai-provider.interface.js';
import type { ProviderConfig } from '../ai-provider.factory.js';

export class ClaudeDirectProvider implements AIProvider {
  readonly name = 'CLAUDE_DIRECT';
  private client: Anthropic;
  private modelId: string;
  private maxTokens: number;
  private temperature: number;

  constructor(private config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey! });
    this.modelId = config.modelId || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.7;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generate(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const system = options.messages.find(m => m.role === 'system')?.content;
    const messages = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: options.model || this.modelId,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature ?? this.temperature,
      ...(system && { system }),
      messages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      latencyMs: Date.now() - start,
      model: response.model,
      provider: this.name,
    };
  }
}
