import { Test, TestingModule } from '@nestjs/testing';
import { AiConfigService } from './ai-config.service';

const mockEncryptionService = {
  encryptString: vi.fn(),
  decryptString: vi.fn(),
};

const mockPrismaService = {
  aiConfig: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('AiConfigService', () => {
  let service: AiConfigService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConfigService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'EncryptionService', useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<AiConfigService>(AiConfigService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'encryption', { value: mockEncryptionService });
  });

  describe('upsert', () => {
    it('should encrypt API key when provided', async () => {
      const dto = {
        provider: 'OPENAI' as const,
        isActive: true,
        isDefault: false,
        apiKey: 'sk-test-1234567890abcdef',
        maxTokens: 4096,
        temperature: 0.7,
        dailyBudgetLimit: 100,
      };

      mockPrismaService.aiConfig.findUnique.mockResolvedValue(null);
      mockEncryptionService.encryptString.mockResolvedValue({
        ciphertext: 'encrypted-blob',
        iv: 'test-iv',
        authTag: 'test-auth-tag',
        salt: 'test-salt',
      });

      const mockConfig = {
        id: 'config-1',
        provider: 'OPENAI',
        isActive: true,
        isDefault: false,
        encApiKey: 'encrypted-blob',
        encRegion: null,
        encAccessKeyId: null,
        encSecretKey: null,
        encIv: 'test-iv',
        encAuthTag: 'test-auth-tag',
        encSalt: 'test-salt',
        modelId: null,
        maxTokens: 4096,
        temperature: 0.7,
        dailyBudgetLimit: 100,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.aiConfig.upsert.mockResolvedValue(mockConfig);
      mockEncryptionService.decryptString.mockResolvedValue(
        JSON.stringify({ apiKey: 'sk-test-1234567890abcdef' }),
      );

      const result = await service.upsert(dto);

      expect(mockEncryptionService.encryptString).toHaveBeenCalledWith(
        JSON.stringify({ apiKey: 'sk-test-1234567890abcdef' }),
      );
      expect(result.maskedApiKey).toBe('****cdef');
      expect(result).not.toHaveProperty('apiKey');
    });

    it('should preserve existing key when apiKey not provided', async () => {
      const dto = {
        provider: 'OPENAI' as const,
        isActive: true,
        isDefault: false,
        maxTokens: 8192,
        temperature: 0.5,
        dailyBudgetLimit: 200,
      };

      const existingConfig = {
        id: 'config-1',
        provider: 'OPENAI',
        isActive: false,
        isDefault: false,
        encApiKey: 'existing-encrypted',
        encRegion: null,
        encAccessKeyId: null,
        encSecretKey: null,
        encIv: 'existing-iv',
        encAuthTag: 'existing-auth',
        encSalt: 'existing-salt',
        modelId: null,
        maxTokens: 4096,
        temperature: 0.7,
        dailyBudgetLimit: 100,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.aiConfig.findUnique.mockResolvedValue(existingConfig);

      const updatedConfig = { ...existingConfig, maxTokens: 8192, temperature: 0.5, dailyBudgetLimit: 200, isActive: true };
      mockPrismaService.aiConfig.upsert.mockResolvedValue(updatedConfig);
      mockEncryptionService.decryptString.mockResolvedValue(
        JSON.stringify({ apiKey: 'sk-original-key-abcd' }),
      );

      await service.upsert(dto);

      expect(mockEncryptionService.encryptString).not.toHaveBeenCalled();
      expect(mockPrismaService.aiConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            encApiKey: 'existing-encrypted',
            encIv: 'existing-iv',
            encAuthTag: 'existing-auth',
            encSalt: 'existing-salt',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should mask credentials in response', async () => {
      const configs = [
        {
          id: 'config-1',
          provider: 'OPENAI',
          isActive: true,
          isDefault: true,
          encApiKey: 'enc-data',
          encRegion: null,
          encAccessKeyId: null,
          encSecretKey: null,
          encIv: 'iv-data',
          encAuthTag: 'auth-data',
          encSalt: 'salt-data',
          modelId: 'gpt-4',
          maxTokens: 4096,
          temperature: 0.7,
          dailyBudgetLimit: 100,
          lastTestedAt: null,
          lastTestSuccess: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.aiConfig.findMany.mockResolvedValue(configs);
      mockEncryptionService.decryptString.mockResolvedValue(
        JSON.stringify({ apiKey: 'sk-real-key-xyz1234' }),
      );

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].maskedApiKey).toBe('****1234');
      expect(JSON.stringify(result[0])).not.toContain('sk-real-key');
    });
  });

  describe('testConnection', () => {
    it('should return success when credentials are configured', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        provider: 'OPENAI',
        encApiKey: 'enc-key',
        encAccessKeyId: null,
        encIv: 'iv',
        encAuthTag: 'auth',
        encSalt: 'salt',
      });
      mockPrismaService.aiConfig.update.mockResolvedValue({});

      const result = await service.testConnection('OPENAI' as any);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('latencyMs');
    });

    it('should return failure when no credentials configured', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        provider: 'OPENAI',
        encApiKey: null,
        encAccessKeyId: null,
        encIv: null,
        encAuthTag: null,
        encSalt: null,
      });
      mockPrismaService.aiConfig.update.mockResolvedValue({});

      const result = await service.testConnection('OPENAI' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No credentials configured');
    });

    it('should return failure when config not found', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue(null);

      const result = await service.testConnection('OPENAI' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Configuration not found');
    });
  });
});
