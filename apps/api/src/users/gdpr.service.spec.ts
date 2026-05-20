import { Test, TestingModule } from '@nestjs/testing';
import { GdprService, UserDataExport } from './gdpr.service';

const mockPrismaService = {
  user: {
    findUniqueOrThrow: vi.fn(),
  },
  familyMember: {
    findMany: vi.fn(),
  },
  assessment: {
    findMany: vi.fn(),
  },
  legalConsent: {
    findMany: vi.fn(),
  },
};

const mockEncryptionService = {
  decryptPii: vi.fn(),
};

describe('GdprService', () => {
  let service: GdprService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: 'EncryptionService', useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'encryptionService', { value: mockEncryptionService });
  });

  describe('exportUserData', () => {
    it('should export all user data sections with decrypted PII', async () => {
      const userId = 'user-1';
      const now = new Date();

      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        createdAt: now,
      });

      mockPrismaService.familyMember.findMany.mockResolvedValue([
        {
          role: 'FAMILY_ADMIN',
          family: {
            id: 'family-1',
            name: '홍씨 가족',
            children: [
              {
                id: 'child-1',
                nameEnc: 'encrypted',
                encIv: 'iv',
                encAuthTag: 'tag',
                encSalt: 'salt',
                gender: 'MALE',
                diagnosisName: 'ASD',
              },
            ],
            schedules: [
              {
                title: '언어치료',
                startTime: now,
                category: 'THERAPY',
              },
            ],
          },
        },
      ]);

      mockEncryptionService.decryptPii.mockResolvedValue({
        name: '홍민준',
        birthDate: '2020-01-15',
      });

      mockPrismaService.assessment.findMany.mockResolvedValue([
        {
          id: 'assess-1',
          createdAt: now,
          totalScore: 85,
          scores: [
            { domain: 'COMMUNICATION', score: 4 },
            { domain: 'SOCIAL', score: 3 },
          ],
        },
      ]);

      mockPrismaService.legalConsent.findMany.mockResolvedValue([
        {
          consentType: 'PRIVACY_POLICY',
          consentVersion: '1.0',
          consentedAt: now,
        },
      ]);

      const result: UserDataExport = await service.exportUserData(userId);

      expect(result.exportedAt).toBeDefined();
      expect(result.user.id).toBe(userId);
      expect(result.user.email).toBe('test@example.com');

      expect(result.families).toHaveLength(1);
      expect(result.families[0].children).toHaveLength(1);
      expect(result.families[0].children[0].name).toBe('홍민준');
      expect(result.families[0].children[0].birthDate).toBe('2020-01-15');

      expect(result.assessments).toHaveLength(1);
      expect(result.assessments[0].childName).toBe('홍민준');
      expect(result.assessments[0].scores).toHaveLength(2);

      expect(result.schedules).toHaveLength(1);
      expect(result.schedules[0].title).toBe('언어치료');

      expect(result.consents).toHaveLength(1);
      expect(result.consents[0].consentType).toBe('PRIVACY_POLICY');
    });

    it('should handle user with no families', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-2',
        email: 'empty@example.com',
        name: '김철수',
        role: 'FAMILY_ADMIN',
        createdAt: new Date(),
      });

      mockPrismaService.familyMember.findMany.mockResolvedValue([]);
      mockPrismaService.legalConsent.findMany.mockResolvedValue([]);

      const result = await service.exportUserData('user-2');

      expect(result.families).toHaveLength(0);
      expect(result.assessments).toHaveLength(0);
      expect(result.schedules).toHaveLength(0);
      expect(result.consents).toHaveLength(0);
    });
  });
});
