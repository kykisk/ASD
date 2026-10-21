import { Test, TestingModule } from '@nestjs/testing';
import { AiConfigService } from './ai-config.service';

const mockGenerate = vi.fn();
vi.mock('@auticare/ai-provider', () => ({
  AIProviderFactory: { create: vi.fn(async () => ({ generate: mockGenerate })) },
}));

const mockEncryptionService = {
  encryptString: vi.fn(),
  decryptString: vi.fn(),
};

const mockPrismaService = {
  aiConfig: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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

  describe('create', () => {
    it('should encrypt API key when provided', async () => {
      const dto = {
        name: 'OpenAI Config',
        provider: 'OPENAI' as const,
        isActive: true,
        isDefault: false,
        apiKey: 'sk-test-1234567890abcdef',
        maxTokens: 4096,
        temperature: 0.7,
        dailyBudgetLimit: 100,
      };

      mockEncryptionService.encryptString.mockResolvedValue({
        ciphertext: 'encrypted-blob',
        iv: 'test-iv',
        authTag: 'test-auth-tag',
        salt: 'test-salt',
      });

      const mockConfig = {
        id: 'config-1',
        name: 'OpenAI Config',
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

      mockPrismaService.aiConfig.create.mockResolvedValue(mockConfig);
      mockEncryptionService.decryptString.mockResolvedValue(
        JSON.stringify({ apiKey: 'sk-test-1234567890abcdef' }),
      );

      const result = await service.create(dto);

      expect(mockEncryptionService.encryptString).toHaveBeenCalledWith(
        JSON.stringify({ apiKey: 'sk-test-1234567890abcdef' }),
      );
      expect(result.maskedApiKey).toBe('****cdef');
      expect(result).not.toHaveProperty('apiKey');
    });
  });

  describe('update', () => {
    it('should preserve existing key when apiKey not provided', async () => {
      const existingConfig = {
        id: 'config-1',
        name: 'OpenAI Config',
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

      const updatedConfig = {
        ...existingConfig,
        maxTokens: 8192,
        temperature: 0.5,
        dailyBudgetLimit: 200,
        isActive: true,
      };
      mockPrismaService.aiConfig.update.mockResolvedValue(updatedConfig);
      mockEncryptionService.decryptString.mockResolvedValue(
        JSON.stringify({ apiKey: 'sk-original-key-abcd' }),
      );

      await service.update('config-1', {
        isActive: true,
        maxTokens: 8192,
        temperature: 0.5,
        dailyBudgetLimit: 200,
      });

      expect(mockEncryptionService.encryptString).not.toHaveBeenCalled();
      expect(mockPrismaService.aiConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'config-1' },
          data: expect.objectContaining({
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
          name: 'OpenAI Config',
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

  describe('testConnectionById', () => {
    const storedConfig = {
      id: 'config-1',
      name: 'Haiku',
      provider: 'CLAUDE_DIRECT',
      isActive: true,
      isDefault: true,
      encApiKey: 'enc-key',
      encIv: 'iv',
      encAuthTag: 'auth',
      encSalt: 'salt',
      modelId: 'claude-haiku-5-5',
      maxTokens: 4096,
      temperature: 0.7,
      dailyBudgetLimit: 1000,
    };

    it('calls the model and reports success with the model that answered', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue(storedConfig);
      mockEncryptionService.decryptString.mockResolvedValue(JSON.stringify({ apiKey: 'sk-ant' }));
      mockGenerate.mockResolvedValue({ content: 'OK', model: 'claude-haiku-5-5' });

      const result = await service.testConnectionById('config-1');

      expect(mockGenerate).toHaveBeenCalled();
      expect(result).toMatchObject({ success: true, model: 'claude-haiku-5-5' });
      expect(mockPrismaService.aiConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastTestSuccess: true }) }),
      );
    });

    it('reports the provider error when the real call fails (e.g. wrong key)', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue(storedConfig);
      mockEncryptionService.decryptString.mockResolvedValue(JSON.stringify({ apiKey: 'sk-bad' }));
      mockGenerate.mockRejectedValue(new Error('401 invalid x-api-key'));

      const result = await service.testConnectionById('config-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid x-api-key');
      expect(mockPrismaService.aiConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastTestSuccess: false }) }),
      );
    });

    it('fails without calling the model when no key is stored', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue({ ...storedConfig, encApiKey: null });

      const result = await service.testConnectionById('config-1');

      expect(result).toMatchObject({ success: false, error: '저장된 키가 없습니다' });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('returns failure when config not found', async () => {
      mockPrismaService.aiConfig.findUnique.mockResolvedValue(null);

      const result = await service.testConnectionById('nonexistent');

      expect(result).toMatchObject({ success: false, error: '설정을 찾을 수 없습니다' });
    });
  });

  describe('credential updates', () => {
    it('keeps the other stored keys when only the region changes', async () => {
      const existing = {
        id: 'config-2',
        name: 'Bedrock',
        provider: 'CLAUDE_BEDROCK',
        isActive: true,
        isDefault: false,
        encApiKey: 'enc',
        encRegion: null,
        encAccessKeyId: null,
        encSecretKey: null,
        encIv: 'iv',
        encAuthTag: 'auth',
        encSalt: 'salt',
        modelId: null,
        maxTokens: 4096,
        temperature: 0.7,
        dailyBudgetLimit: 100,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.aiConfig.findUnique.mockResolvedValue(existing);
      mockPrismaService.aiConfig.update.mockResolvedValue(existing);
      mockEncryptionService.decryptString.mockResolvedValue(
        JSON.stringify({ accessKeyId: 'AKIA', secretKey: 'secret', region: 'us-east-1' }),
      );
      mockEncryptionService.encryptString.mockResolvedValue({
        ciphertext: 'c',
        iv: 'i',
        authTag: 'a',
        salt: 's',
      });

      await service.update('config-2', { region: 'ap-northeast-2' });

      const payload = JSON.parse(mockEncryptionService.encryptString.mock.calls[0][0]);
      expect(payload).toEqual({
        accessKeyId: 'AKIA',
        secretKey: 'secret',
        region: 'ap-northeast-2',
      });
    });
  });
});
