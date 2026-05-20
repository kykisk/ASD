import { AIProviderFactory } from './ai-provider.factory.js';
import { ClaudeBedrockProvider } from './providers/claude-bedrock.provider.js';
import { ClaudeDirectProvider } from './providers/claude-direct.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';

describe('AIProviderFactory', () => {
  it('creates ClaudeBedrockProvider for CLAUDE_BEDROCK', async () => {
    const provider = await AIProviderFactory.create('CLAUDE_BEDROCK', {
      accessKeyId: 'test-key',
      secretKey: 'test-secret',
      region: 'us-east-1',
    });
    expect(provider).toBeInstanceOf(ClaudeBedrockProvider);
    expect(provider.name).toBe('CLAUDE_BEDROCK');
  });

  it('creates ClaudeDirectProvider for CLAUDE_DIRECT', async () => {
    const provider = await AIProviderFactory.create('CLAUDE_DIRECT', {
      apiKey: 'test-api-key',
    });
    expect(provider).toBeInstanceOf(ClaudeDirectProvider);
    expect(provider.name).toBe('CLAUDE_DIRECT');
  });

  it('creates GeminiProvider for GEMINI', async () => {
    const provider = await AIProviderFactory.create('GEMINI', {
      apiKey: 'test-api-key',
    });
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe('GEMINI');
  });

  it('creates OpenAIProvider for OPENAI', async () => {
    const provider = await AIProviderFactory.create('OPENAI', {
      apiKey: 'test-api-key',
    });
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('OPENAI');
  });

  it('throws for unknown provider', async () => {
    await expect(
      AIProviderFactory.create('UNKNOWN' as any, {}),
    ).rejects.toThrow('Unknown AI provider: UNKNOWN');
  });

  describe('isConfigured()', () => {
    it('returns false for ClaudeBedrockProvider when config is missing', async () => {
      const provider = await AIProviderFactory.create('CLAUDE_BEDROCK', {});
      expect(provider.isConfigured()).toBe(false);
    });

    it('returns true for ClaudeBedrockProvider when config is complete', async () => {
      const provider = await AIProviderFactory.create('CLAUDE_BEDROCK', {
        accessKeyId: 'key',
        secretKey: 'secret',
        region: 'us-east-1',
      });
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns false for ClaudeDirectProvider when apiKey is missing', async () => {
      const provider = await AIProviderFactory.create('CLAUDE_DIRECT', {});
      expect(provider.isConfigured()).toBe(false);
    });

    it('returns true for ClaudeDirectProvider when apiKey is present', async () => {
      const provider = await AIProviderFactory.create('CLAUDE_DIRECT', {
        apiKey: 'sk-test',
      });
      expect(provider.isConfigured()).toBe(true);
    });
  });
});
