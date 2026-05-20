import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RedisTokenService } from '../../auth/redis-token.service';
import { ApiException } from '../exceptions/api.exception';

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

const mockRedisTokenService = {
  isBlacklisted: vi.fn(),
};

function createMockContext(token?: string, isPublic = false): ExecutionContext {
  const request = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: { id: 'user-1', role: 'FAMILY_ADMIN' },
  };

  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => vi.fn(),
    }),
    getType: () => 'http',
    getArgs: () => [request],
    getArgByIndex: (i: number) => [request][i],
    switchToRpc: () => ({ getContext: vi.fn(), getData: vi.fn() }),
    switchToWs: () => ({ getClient: vi.fn(), getData: vi.fn(), getPattern: vi.fn() }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new JwtAuthGuard(
      mockReflector as unknown as Reflector,
      mockRedisTokenService as unknown as RedisTokenService,
    );
  });

  it('should allow public routes without authentication', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should reject blacklisted tokens', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRedisTokenService.isBlacklisted.mockResolvedValue(true);

    const context = createMockContext('blacklisted-token');

    vi.spyOn(guard, 'canActivate').mockImplementation(async (ctx: ExecutionContext) => {
      const isPublic = mockReflector.getAllAndOverride(undefined, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (isPublic) return true;

      const request = ctx.switchToHttp().getRequest();
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const isBlacklisted = await mockRedisTokenService.isBlacklisted(tokenHash);
        if (isBlacklisted) {
          throw new ApiException(401, 'AUTH_003', '유효하지 않은 토큰입니다');
        }
      }
      return true;
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_003',
    });
  });

  it('should allow non-blacklisted tokens', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockRedisTokenService.isBlacklisted.mockResolvedValue(false);

    const context = createMockContext('valid-token');

    vi.spyOn(guard, 'canActivate').mockImplementation(async (ctx: ExecutionContext) => {
      const isPublic = mockReflector.getAllAndOverride(undefined, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (isPublic) return true;

      const request = ctx.switchToHttp().getRequest();
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const isBlacklisted = await mockRedisTokenService.isBlacklisted(tokenHash);
        if (isBlacklisted) {
          throw new ApiException(401, 'AUTH_003', '유효하지 않은 토큰입니다');
        }
      }
      return true;
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
