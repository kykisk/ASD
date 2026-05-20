import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIRequestOptions } from '../ai-provider.interface.js';

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = vi.fn();
  return {
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
    InvokeModelCommand: vi.fn().mockImplementation((input) => ({ input })),
    __mockSend: mockSend,
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

vi.mock('@google/generative-ai', () => {
  const mockSendMessage = vi.fn();
  const mockStartChat = vi.fn().mockReturnValue({ sendMessage: mockSendMessage });
  const mockGetGenerativeModel = vi.fn().mockReturnValue({ startChat: mockStartChat });
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    __mockGetGenerativeModel: mockGetGenerativeModel,
    __mockStartChat: mockStartChat,
    __mockSendMessage: mockSendMessage,
  };
});

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
  };
});

const defaultOptions: AIRequestOptions = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' },
  ],
};

describe('ClaudeBedrockProvider', () => {
  let provider: any;
  let mockSend: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const bedrockMock = await import('@aws-sdk/client-bedrock-runtime');
    mockSend = (bedrockMock as any).__mockSend;

    const { ClaudeBedrockProvider } = await import('./claude-bedrock.provider.js');
    provider = new ClaudeBedrockProvider({
      accessKeyId: 'test-key',
      secretKey: 'test-secret',
      region: 'us-east-1',
    });
  });

  it('should return correct name', () => {
    expect(provider.name).toBe('CLAUDE_BEDROCK');
  });

  it('isConfigured() returns true when all credentials present', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured() returns false when credentials missing', async () => {
    const { ClaudeBedrockProvider } = await import('./claude-bedrock.provider.js');
    const unconfigured = new ClaudeBedrockProvider({});
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('generate() returns AIResponse shape with correct token counts', async () => {
    const mockResponseBody = {
      content: [{ text: 'Hello there!' }],
      usage: { input_tokens: 10, output_tokens: 20 },
    };
    mockSend.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
    });

    const result = await provider.generate(defaultOptions);

    expect(result).toMatchObject({
      content: 'Hello there!',
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      model: 'anthropic.claude-sonnet-4-20250514-v1:0',
      provider: 'CLAUDE_BEDROCK',
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('generate() uses custom model from options', async () => {
    const mockResponseBody = {
      content: [{ text: 'Response' }],
      usage: { input_tokens: 5, output_tokens: 10 },
    };
    mockSend.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
    });

    const result = await provider.generate({
      ...defaultOptions,
      model: 'anthropic.claude-haiku-3',
    });

    expect(result.model).toBe('anthropic.claude-haiku-3');
  });
});

describe('ClaudeDirectProvider', () => {
  let provider: any;
  let mockCreate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const anthropicMock = await import('@anthropic-ai/sdk');
    mockCreate = (anthropicMock as any).__mockCreate;

    const { ClaudeDirectProvider } = await import('./claude-direct.provider.js');
    provider = new ClaudeDirectProvider({ apiKey: 'test-api-key' });
  });

  it('should return correct name', () => {
    expect(provider.name).toBe('CLAUDE_DIRECT');
  });

  it('isConfigured() returns true when apiKey present', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured() returns false when apiKey missing', async () => {
    const { ClaudeDirectProvider } = await import('./claude-direct.provider.js');
    const unconfigured = new ClaudeDirectProvider({});
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('generate() returns AIResponse shape with correct token counts', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Direct response' }],
      usage: { input_tokens: 15, output_tokens: 25 },
      model: 'claude-sonnet-4-20250514',
    });

    const result = await provider.generate(defaultOptions);

    expect(result).toMatchObject({
      content: 'Direct response',
      inputTokens: 15,
      outputTokens: 25,
      totalTokens: 40,
      model: 'claude-sonnet-4-20250514',
      provider: 'CLAUDE_DIRECT',
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('generate() filters system messages from messages array', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
      usage: { input_tokens: 5, output_tokens: 10 },
      model: 'claude-sonnet-4-20250514',
    });

    await provider.generate(defaultOptions);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    );
  });
});

describe('GeminiProvider', () => {
  let provider: any;
  let mockSendMessage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const geminiMock = await import('@google/generative-ai');
    mockSendMessage = (geminiMock as any).__mockSendMessage;

    const { GeminiProvider } = await import('./gemini.provider.js');
    provider = new GeminiProvider({ apiKey: 'test-gemini-key' });
  });

  it('should return correct name', () => {
    expect(provider.name).toBe('GEMINI');
  });

  it('isConfigured() returns true when apiKey present', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured() returns false when apiKey missing', async () => {
    const { GeminiProvider } = await import('./gemini.provider.js');
    const unconfigured = new GeminiProvider({});
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('generate() returns AIResponse shape with correct token counts', async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => 'Gemini response',
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 18,
          totalTokenCount: 30,
        },
      },
    });

    const result = await provider.generate(defaultOptions);

    expect(result).toMatchObject({
      content: 'Gemini response',
      inputTokens: 12,
      outputTokens: 18,
      totalTokens: 30,
      model: 'gemini-2.0-flash',
      provider: 'GEMINI',
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('generate() handles missing usageMetadata gracefully', async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => 'No metadata',
        usageMetadata: undefined,
      },
    });

    const result = await provider.generate(defaultOptions);

    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.totalTokens).toBe(0);
  });
});

describe('OpenAIProvider', () => {
  let provider: any;
  let mockCreate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiMock = await import('openai');
    mockCreate = (openaiMock as any).__mockCreate;

    const { OpenAIProvider } = await import('./openai.provider.js');
    provider = new OpenAIProvider({ apiKey: 'test-openai-key' });
  });

  it('should return correct name', () => {
    expect(provider.name).toBe('OPENAI');
  });

  it('isConfigured() returns true when apiKey present', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured() returns false when apiKey missing', async () => {
    const { OpenAIProvider } = await import('./openai.provider.js');
    const unconfigured = new OpenAIProvider({});
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('generate() returns AIResponse shape with correct token counts', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'OpenAI response' } }],
      usage: { prompt_tokens: 8, completion_tokens: 12, total_tokens: 20 },
      model: 'gpt-4o',
    });

    const result = await provider.generate(defaultOptions);

    expect(result).toMatchObject({
      content: 'OpenAI response',
      inputTokens: 8,
      outputTokens: 12,
      totalTokens: 20,
      model: 'gpt-4o',
      provider: 'OPENAI',
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('generate() handles null content gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      model: 'gpt-4o',
    });

    const result = await provider.generate(defaultOptions);
    expect(result.content).toBe('');
  });

  it('generate() passes system messages directly', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Response' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      model: 'gpt-4o',
    });

    await provider.generate(defaultOptions);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' },
        ],
      })
    );
  });
});
