import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIRequestOptions, AIResponse } from '../ai-provider.interface.js';
import type { ProviderConfig } from '../ai-provider.factory.js';

const MIN_MAX_TOKENS = 16000;

export class ClaudeDirectProvider implements AIProvider {
  readonly name = 'CLAUDE_DIRECT';
  private client: Anthropic;
  private modelId: string;
  private maxTokens: number;

  constructor(private config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey! });
    this.modelId = config.modelId || 'claude-haiku-5-5';
    this.maxTokens = config.maxTokens || 4096;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generate(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const system = options.messages.find((m) => m.role === 'system')?.content;
    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: options.model || this.modelId,
      // 최신 모델은 thinking 이 기본 on 이고 max_tokens 에 포함되므로 출력이 잘리지 않게 하한을 둠
      max_tokens: Math.max(options.maxTokens || this.maxTokens, MIN_MAX_TOKENS),
      // 최신 Claude 모델은 temperature 기본값 외 값을 400 으로 거부하므로 보내지 않음
      ...(system && { system }),
      messages,
    });

    if (response.stop_reason === 'max_tokens') {
      throw new Error(`Claude response truncated at max_tokens (${response.usage.output_tokens})`);
    }

    // 응답 앞에 thinking 블록이 오므로 text 블록만 모아서 사용
    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

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
