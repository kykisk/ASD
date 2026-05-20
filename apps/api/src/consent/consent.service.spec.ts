import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';

const mockPrismaService = {
  legalConsent: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
  });

  describe('record', () => {
    it('should save consent with IP and userAgent', async () => {
      const mockConsent = {
        id: 'consent-1',
        userId: 'user-1',
        consentType: 'TERMS_OF_SERVICE',
        consentVersion: '1.0',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        consentedAt: new Date(),
      };

      mockPrismaService.legalConsent.create.mockResolvedValue(mockConsent);

      const result = await service.record(
        'user-1',
        { consentType: 'TERMS_OF_SERVICE', consentVersion: '1.0' },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual(mockConsent);
      expect(mockPrismaService.legalConsent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          consentType: 'TERMS_OF_SERVICE',
          consentVersion: '1.0',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          consentedAt: expect.any(Date),
        },
      });
    });
  });

  describe('hasConsented', () => {
    it('should return true when consent is found', async () => {
      mockPrismaService.legalConsent.findFirst.mockResolvedValue({
        id: 'consent-1',
        userId: 'user-1',
        consentType: 'TERMS_OF_SERVICE',
        consentVersion: '1.0',
      });

      const result = await service.hasConsented(
        'user-1',
        'TERMS_OF_SERVICE',
        '1.0',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.legalConsent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          consentType: 'TERMS_OF_SERVICE',
          consentVersion: '1.0',
        },
      });
    });

    it('should return false when consent is not found', async () => {
      mockPrismaService.legalConsent.findFirst.mockResolvedValue(null);

      const result = await service.hasConsented(
        'user-1',
        'TERMS_OF_SERVICE',
        '1.0',
      );

      expect(result).toBe(false);
    });

    it('should return false for different version', async () => {
      mockPrismaService.legalConsent.findFirst.mockResolvedValue(null);

      const result = await service.hasConsented(
        'user-1',
        'TERMS_OF_SERVICE',
        '2.0',
      );

      expect(result).toBe(false);
      expect(mockPrismaService.legalConsent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          consentType: 'TERMS_OF_SERVICE',
          consentVersion: '2.0',
        },
      });
    });
  });

  describe('getUserConsents', () => {
    it('should return only the user consents', async () => {
      const mockConsents = [
        {
          id: 'consent-1',
          userId: 'user-1',
          consentType: 'TERMS_OF_SERVICE',
          consentVersion: '1.0',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          consentedAt: new Date(),
        },
        {
          id: 'consent-2',
          userId: 'user-1',
          consentType: 'PRIVACY_POLICY',
          consentVersion: '1.0',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          consentedAt: new Date(),
        },
      ];

      mockPrismaService.legalConsent.findMany.mockResolvedValue(mockConsents);

      const result = await service.getUserConsents('user-1');

      expect(result).toEqual(mockConsents);
      expect(mockPrismaService.legalConsent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { consentedAt: 'desc' },
      });
    });
  });

  describe('getCurrentVersions', () => {
    it('should return current versions', () => {
      const versions = service.getCurrentVersions();

      expect(versions).toEqual({
        TERMS_OF_SERVICE: '1.0',
        PRIVACY_POLICY: '1.0',
        LICENSED_TOOL_USE: '1.0',
      });
    });
  });
});
