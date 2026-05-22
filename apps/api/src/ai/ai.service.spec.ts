import { AIService } from './ai.service';
import { z } from 'zod';

const mockAiConfigService = {
  findAll: vi.fn(),
  getDecryptedConfig: vi.fn(),
};

const mockAiFeatureConfigService = {
  getConfigIdForFeature: vi.fn().mockResolvedValue(null),
  getAll: vi.fn(),
  saveAll: vi.fn(),
};

const mockCostTracker = {
  trackCall: vi.fn(),
  checkBudgetLimit: vi.fn(),
};

const mockPrismaService = {
  family: {
    findUnique: vi.fn(),
  },
};

const mockConfigService = {
  get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
};

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  disconnect: vi.fn(),
};

const mockProvider = {
  name: 'OPENAI',
  generate: vi.fn(),
  isConfigured: () => true,
};

vi.mock('@auticare/ai-provider', () => ({
  AIProviderFactory: {
    create: vi.fn(() => Promise.resolve(mockProvider)),
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis),
}));

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    service = new AIService(
      mockAiConfigService as any,
      mockAiFeatureConfigService as any,
      mockCostTracker as any,
      mockPrismaService as any,
      mockConfigService as any,
    );
  });

  const defaultConfigs = [
    { id: 'cfg-1', provider: 'OPENAI', isActive: true, isDefault: true },
    { id: 'cfg-2', provider: 'GEMINI', isActive: true, isDefault: false },
  ];

  const decryptedConfig = {
    id: 'cfg-1',
    name: 'OpenAI GPT-4',
    provider: 'OPENAI',
    isActive: true,
    isDefault: true,
    apiKey: 'sk-test',
    region: null,
    accessKeyId: null,
    secretKey: null,
    modelId: 'gpt-4',
    maxTokens: 4096,
    temperature: 0.7,
    dailyBudgetLimit: 100,
  };

  const mockResponse = {
    content: 'Hello world',
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    latencyMs: 500,
    model: 'gpt-4',
    provider: 'OPENAI',
  };

  describe('generate', () => {
    it('should call preferred provider', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockProvider.generate.mockResolvedValue(mockResponse);
      mockCostTracker.trackCall.mockResolvedValue(undefined);

      const result = await service.generate(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'OPENAI',
      );

      expect(result).toEqual(mockResponse);
      expect(mockCostTracker.trackCall).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'OPENAI', model: 'gpt-4' }),
      );
    });

    it('should fall back to next provider on error', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig
        .mockResolvedValueOnce(decryptedConfig)
        .mockResolvedValueOnce({ ...decryptedConfig, id: 'cfg-2', provider: 'GEMINI' });
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockProvider.generate
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({ ...mockResponse, provider: 'GEMINI' });
      mockCostTracker.trackCall.mockResolvedValue(undefined);

      const result = await service.generate(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'OPENAI',
      );

      expect(result.provider).toBe('GEMINI');
    });

    it('should throw when all providers fail', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockProvider.generate.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        service.generate({ messages: [{ role: 'user', content: 'Hi' }] }),
      ).rejects.toThrow('모든 AI 프로바이더 실패');
    });

    it('should skip provider when budget exceeded', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      mockProvider.generate.mockResolvedValue({ ...mockResponse, provider: 'GEMINI' });
      mockCostTracker.trackCall.mockResolvedValue(undefined);

      const result = await service.generate(
        { messages: [{ role: 'user', content: 'Hi' }] },
      );

      expect(result.provider).toBe('GEMINI');
    });
  });

  describe('generateStructured', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should return parsed data on valid JSON', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockCostTracker.trackCall.mockResolvedValue(undefined);
      mockProvider.generate.mockResolvedValue({
        ...mockResponse,
        content: '{"name": "John", "age": 30}',
      });

      const result = await service.generateStructured(
        { messages: [{ role: 'user', content: 'Generate person' }] },
        testSchema,
      );

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should handle JSON wrapped in code fences', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockCostTracker.trackCall.mockResolvedValue(undefined);
      mockProvider.generate.mockResolvedValue({
        ...mockResponse,
        content: '```json\n{"name": "Jane", "age": 25}\n```',
      });

      const result = await service.generateStructured(
        { messages: [{ role: 'user', content: 'Generate person' }] },
        testSchema,
      );

      expect(result).toEqual({ name: 'Jane', age: 25 });
    });

    it('should retry on invalid schema', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockCostTracker.trackCall.mockResolvedValue(undefined);
      mockProvider.generate
        .mockResolvedValueOnce({ ...mockResponse, content: '{"name": "John"}' })
        .mockResolvedValueOnce({ ...mockResponse, content: '{"name": "John", "age": 30}' });

      const result = await service.generateStructured(
        { messages: [{ role: 'user', content: 'Generate person' }] },
        testSchema,
      );

      expect(result).toEqual({ name: 'John', age: 30 });
      expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    });

    it('should throw after 3 failed retries', async () => {
      mockAiConfigService.findAll.mockResolvedValue(defaultConfigs);
      mockAiConfigService.getDecryptedConfig.mockResolvedValue(decryptedConfig);
      mockCostTracker.checkBudgetLimit.mockResolvedValue(true);
      mockCostTracker.trackCall.mockResolvedValue(undefined);
      mockProvider.generate.mockResolvedValue({
        ...mockResponse,
        content: '{"invalid": true}',
      });

      await expect(
        service.generateStructured(
          { messages: [{ role: 'user', content: 'Generate person' }] },
          testSchema,
        ),
      ).rejects.toThrow('AI 응답 스키마 검증 실패');

      expect(mockProvider.generate).toHaveBeenCalledTimes(3);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return active provider names', async () => {
      mockAiConfigService.findAll.mockResolvedValue([
        { id: 'cfg-1', provider: 'OPENAI', isActive: true, isDefault: true },
        { id: 'cfg-2', provider: 'GEMINI', isActive: true, isDefault: false },
        { id: 'cfg-3', provider: 'CLAUDE_DIRECT', isActive: false, isDefault: false },
      ]);

      const result = await service.getAvailableProviders();

      expect(result).toEqual(['OPENAI', 'GEMINI']);
    });
  });
});
