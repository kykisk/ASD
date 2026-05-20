import { AICostTrackingService } from './ai-cost-tracking.service';

const mockPipeline = {
  hincrby: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockRedis = {
  pipeline: vi.fn(() => mockPipeline),
  scan: vi.fn(),
  hgetall: vi.fn(),
  hget: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis),
}));

describe('AICostTrackingService', () => {
  let service: AICostTrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    const mockConfigService = {
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    };

    service = new AICostTrackingService(mockConfigService as any);
  });

  describe('trackCall', () => {
    it('should increment Redis counters via pipeline', async () => {
      await service.trackCall({
        provider: 'OPENAI',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 1200,
        operation: 'curriculum_generation',
      });

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI'),
        'calls',
        1,
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI'),
        'inputTokens',
        100,
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI'),
        'outputTokens',
        50,
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI'),
        'totalMs',
        1200,
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        expect.stringContaining('total'),
        'calls',
        1,
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('checkBudgetLimit', () => {
    it('should return true when under limit', async () => {
      mockRedis.hget.mockResolvedValue('50');

      const result = await service.checkBudgetLimit('OPENAI', 100);

      expect(result).toBe(true);
    });

    it('should return false when over limit', async () => {
      mockRedis.hget.mockResolvedValue('100');

      const result = await service.checkBudgetLimit('OPENAI', 100);

      expect(result).toBe(false);
    });

    it('should return true when no calls recorded', async () => {
      mockRedis.hget.mockResolvedValue(null);

      const result = await service.checkBudgetLimit('OPENAI', 100);

      expect(result).toBe(true);
    });
  });

  describe('getDailyStats', () => {
    it('should aggregate stats by provider', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', [
          'auticare:ai-cost:2025-05-20:OPENAI',
          'auticare:ai-cost:2025-05-20:GEMINI',
          'auticare:ai-cost:2025-05-20:total',
        ]]);

      mockRedis.hgetall
        .mockResolvedValueOnce({ calls: '10', inputTokens: '500', outputTokens: '200', totalMs: '12000' })
        .mockResolvedValueOnce({ calls: '5', inputTokens: '300', outputTokens: '100', totalMs: '5000' });

      const result = await service.getDailyStats('2025-05-20');

      expect(result.byProvider['OPENAI']).toEqual({
        calls: 10,
        inputTokens: 500,
        outputTokens: 200,
        avgLatencyMs: 1200,
      });
      expect(result.byProvider['GEMINI']).toEqual({
        calls: 5,
        inputTokens: 300,
        outputTokens: 100,
        avgLatencyMs: 1000,
      });
      expect(result.total).toEqual({
        calls: 15,
        inputTokens: 800,
        outputTokens: 300,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis', () => {
      service.onModuleDestroy();
      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });
});
