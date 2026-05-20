import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIRequestOptions, AIResponse } from '../ai-provider.interface.js';
import type { ProviderConfig } from '../ai-provider.factory.js';

export class GeminiProvider implements AIProvider {
  readonly name = 'GEMINI';
  private genAI: GoogleGenerativeAI;
  private modelId: string;
  private maxTokens: number;
  private temperature: number;

  constructor(private config: ProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey!);
    this.modelId = config.modelId || 'gemini-2.0-flash';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.7;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generate(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: options.model || this.modelId,
      generationConfig: {
        maxOutputTokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? this.temperature,
      },
    });

    const systemMsg = options.messages.find(m => m.role === 'system')?.content || '';
    const userMessages = options.messages.filter(m => m.role !== 'system');

    const chat = model.startChat({
      history: userMessages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemMsg || undefined,
    });

    const lastMessage = userMessages[userMessages.length - 1]?.content || '';
    const result = await chat.sendMessage(lastMessage);
    const response = result.response;

    return {
      content: response.text(),
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      latencyMs: Date.now() - start,
      model: options.model || this.modelId,
      provider: this.name,
    };
  }
}
