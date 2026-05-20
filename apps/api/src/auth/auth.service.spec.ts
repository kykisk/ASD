import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { RedisTokenService } from './redis-token.service';
import { ApiException } from '../common/exceptions/api.exception';

const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

describe('AuthService', () => {
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

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password1!',
      name: '홍길동',
    };

    it('should create user with hashed password and return tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: true,
        passwordHash: '$2b$12$hashedpassword',
      });
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).toHaveLength(128);
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        familyId: null,
      });

      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe(registerDto.password);
      expect(createCall.data.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('should throw AUTH_007 for duplicate email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ApiException);
      await expect(service.register(registerDto)).rejects.toMatchObject({
        statusCode: 409,
        code: 'AUTH_007',
      });
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password1!',
    };

    it('should authenticate valid credentials and return tokens', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash('Password1!', 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: true,
        passwordHash: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).toHaveLength(128);
      expect(result.user.id).toBe('user-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw AUTH_001 for non-existent email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(ApiException);
      await expect(service.login(loginDto)).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_001',
      });
    });

    it('should throw AUTH_001 for wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: true,
        passwordHash: '$2b$12$invalidhashthatshouldnotmatch000000000000000000000',
      });

      await expect(service.login(loginDto)).rejects.toThrow(ApiException);
      await expect(service.login(loginDto)).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_001',
      });
    });

    it('should throw AUTH_006 for inactive user', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash('Password1!', 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: false,
        passwordHash: hashedPassword,
      });

      await expect(service.login(loginDto)).rejects.toThrow(ApiException);
      await expect(service.login(loginDto)).rejects.toMatchObject({
        statusCode: 403,
        code: 'AUTH_006',
      });
    });
  });

  describe('refresh', () => {
    it('should rotate tokens successfully', async () => {
      const refreshToken = 'a'.repeat(128);
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@example.com', name: '홍길동', role: 'FAMILY_ADMIN' },
      });
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockJwtService.signAsync.mockResolvedValue('new-access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toHaveLength(128);
      expect(result.user.id).toBe('user-1');

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw AUTH_005 for unknown token', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_005',
      });
    });

    it('should detect reuse and revoke all tokens', async () => {
      const refreshToken = 'b'.repeat(128);
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@example.com', name: '홍길동', role: 'FAMILY_ADMIN' },
      });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_005',
      });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw AUTH_004 for expired token', async () => {
      const refreshToken = 'c'.repeat(128);
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 86400000),
        user: { id: 'user-1', email: 'test@example.com', name: '홍길동', role: 'FAMILY_ADMIN' },
      });
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTH_004',
      });
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and blacklist access token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900;
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockJwtService.decode.mockReturnValue({ exp: futureExp });
      mockRedisTokenService.blacklistToken.mockResolvedValue(undefined);

      await service.logout('refresh-token', 'access-token');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
      expect(mockRedisTokenService.blacklistToken).toHaveBeenCalled();
    });

    it('should handle missing tokens gracefully', async () => {
      await expect(service.logout(undefined, undefined)).resolves.toBeUndefined();
    });
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens and blacklist access token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900;
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 5 });
      mockJwtService.decode.mockReturnValue({ exp: futureExp });
      mockRedisTokenService.blacklistToken.mockResolvedValue(undefined);

      await service.logoutAll('user-1', 'access-token');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockRedisTokenService.blacklistToken).toHaveBeenCalled();
    });
  });

  describe('generateTokens', () => {
    it('should create valid JWT with correct payload', async () => {
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: true,
        passwordHash: '$2b$12$hash',
      });

      await service.register({
        email: 'test@example.com',
        password: 'Password1!',
        name: '홍길동',
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: 'FAMILY_ADMIN',
        familyId: null,
      });
    });

    it('should store hashed refresh token in DB', async () => {
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: true,
        passwordHash: '$2b$12$hash',
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password1!',
        name: '홍길동',
      });

      const createCall = mockPrismaService.refreshToken.create.mock.calls[0][0];
      const expectedHash = createHash('sha256')
        .update(result.refreshToken)
        .digest('hex');

      expect(createCall.data.tokenHash).toBe(expectedHash);
      expect(createCall.data.userId).toBe('user-1');
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });

    it('should enforce max 10 active tokens per user', async () => {
      const existingTokens = Array.from({ length: 10 }, (_, i) => ({
        id: `token-${i}`,
        createdAt: new Date(Date.now() - (10 - i) * 1000),
      }));
      mockPrismaService.refreshToken.findMany.mockResolvedValue(existingTokens);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: '홍길동',
        role: 'FAMILY_ADMIN',
        isActive: true,
        passwordHash: '$2b$12$hash',
      });

      await service.register({
        email: 'test@example.com',
        password: 'Password1!',
        name: '홍길동',
      });

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-0' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
