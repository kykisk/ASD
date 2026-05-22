import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AIProvider, AIRequestOptions, AIResponse } from '../ai-provider.interface.js';
import type { ProviderConfig } from '../ai-provider.factory.js';

export class ClaudeBedrockProvider implements AIProvider {
  readonly name = 'CLAUDE_BEDROCK';
  private client: BedrockRuntimeClient;
  private modelId: string;
  private maxTokens: number;
  private temperature: number;

  constructor(private config: ProviderConfig) {
    this.client = new BedrockRuntimeClient({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretKey!,
      },
    });
    this.modelId = config.modelId || 'anthropic.claude-sonnet-4-20250514-v1:0';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.7;
  }

  isConfigured(): boolean {
    return !!(this.config.accessKeyId && this.config.secretKey && this.config.region);
  }

  async generate(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const system = options.messages.find(m => m.role === 'system')?.content;
    const messages = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const temp = options.temperature ?? this.temperature;
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || this.maxTokens,
      ...(temp !== undefined && temp > 0 && { temperature: temp }),
      ...(system && { system }),
      messages,
    });

    const command = new InvokeModelCommand({
      modelId: options.model || this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(body),
    });

    const response = await this.client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    return {
      content: result.content[0].text,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
      totalTokens: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
      latencyMs: Date.now() - start,
      model: options.model || this.modelId,
      provider: this.name,
    };
  }
}
