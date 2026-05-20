export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
  provider: string;
}

export interface AIProvider {
  readonly name: string;
  generate(options: AIRequestOptions): Promise<AIResponse>;
  isConfigured(): boolean;
}
