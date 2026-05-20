import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RedisTokenService } from './redis-token.service';

const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  oAuthAccount: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  familyMember: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
};

const mockJwtService = {
  signAsync: vi.fn(),
  decode: vi.fn(),
};

const mockRedisTokenService = {
  blacklistToken: vi.fn(),
  isBlacklisted: vi.fn(),
};

describe('AuthService - OAuth', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'PrismaService', useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisTokenService, useValue: mockRedisTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    Object.defineProperty(service, 'prisma', { value: mockPrismaService });
    Object.defineProperty(service, 'jwtService', { value: mockJwtService });
    Object.defineProperty(service, 'redisTokenService', { value: mockRedisTokenService });
  });

  describe('validateOAuthUser', () => {
    const oauthData = {
      provider: 'GOOGLE' as const,
      providerUserId: 'google-123',
      email: 'oauth@example.com',
      name: '김구글',
      accessToken: 'gat-xxx',
      refreshToken: 'grt-xxx',
    };

    it('should return existing user when OAuth account exists', async () => {
      mockPrismaService.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          email: 'oauth@example.com',
          name: '김구글',
          role: 'FAMILY_ADMIN',
          isActive: true,
        },
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.validateOAuthUser(oauthData);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toHaveLength(128);
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'oauth@example.com',
        name: '김구글',
        role: 'FAMILY_ADMIN',
        familyId: null,
      });
      expect(mockPrismaService.oAuthAccount.create).not.toHaveBeenCalled();
    });

    it('should link OAuth account to existing user when email matches', async () => {
      mockPrismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'oauth@example.com',
        name: '김구글',
        role: 'FAMILY_ADMIN',
        isActive: true,
      });
      mockPrismaService.oAuthAccount.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.validateOAuthUser(oauthData);

      expect(result.user.id).toBe('user-2');
      expect(mockPrismaService.oAuthAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-2',
          provider: 'GOOGLE',
          providerUserId: 'google-123',
          accessToken: 'gat-xxx',
          refreshToken: 'grt-xxx',
        },
      });
    });

    it('should create new user when no existing account or email match', async () => {
      mockPrismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'oauth@example.com',
        name: '김구글',
        role: 'FAMILY_ADMIN',
        isActive: true,
      });
      mockPrismaService.oAuthAccount.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.validateOAuthUser(oauthData);

      expect(result.user.id).toBe('user-new');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'oauth@example.com',
          name: '김구글',
        },
      });
      expect(mockPrismaService.oAuthAccount.create).toHaveBeenCalled();
    });

    it('should throw AUTH_006 for inactive user', async () => {
      mockPrismaService.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          email: 'oauth@example.com',
          name: '김구글',
          role: 'FAMILY_ADMIN',
          isActive: false,
        },
      });

      await expect(service.validateOAuthUser(oauthData)).rejects.toMatchObject({
        statusCode: 403,
        code: 'AUTH_006',
      });
    });

    it('should work with Kakao provider', async () => {
      const kakaoData = {
        provider: 'KAKAO' as const,
        providerUserId: 'kakao-456',
        email: 'kakao@example.com',
        name: '김카카오',
        accessToken: 'kat-xxx',
        refreshToken: 'krt-xxx',
      };

      mockPrismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-kakao',
        email: 'kakao@example.com',
        name: '김카카오',
        role: 'FAMILY_ADMIN',
        isActive: true,
      });
      mockPrismaService.oAuthAccount.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('mock-kakao-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.validateOAuthUser(kakaoData);

      expect(result.accessToken).toBe('mock-kakao-token');
      expect(mockPrismaService.oAuthAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ provider: 'KAKAO', providerUserId: 'kakao-456' }),
        }),
      );
    });

    it('should work with Apple provider and handle missing name', async () => {
      const appleData = {
        provider: 'APPLE' as const,
        providerUserId: 'apple-sub-789',
        email: 'apple@privaterelay.appleid.com',
        name: '',
        accessToken: 'aat-xxx',
        refreshToken: 'art-xxx',
      };

      mockPrismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-apple',
        email: 'apple@privaterelay.appleid.com',
        name: '',
        role: 'FAMILY_ADMIN',
        isActive: true,
      });
      mockPrismaService.oAuthAccount.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('mock-apple-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.validateOAuthUser(appleData);

      expect(result.accessToken).toBe('mock-apple-token');
      expect(result.user.email).toBe('apple@privaterelay.appleid.com');
    });
  });
});
