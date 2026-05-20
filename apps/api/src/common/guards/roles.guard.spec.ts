import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ApiException } from '../exceptions/api.exception';

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

function createMockContext(user?: { id: string; role: string }): ExecutionContext {
  const request = { user };

  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RolesGuard(mockReflector as unknown as Reflector);
  });

  it('should allow access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ id: 'user-1', role: 'FAMILY_ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['FAMILY_ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'FAMILY_ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['SYSTEM_ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'FAMILY_ADMIN' });

    expect(() => guard.canActivate(context)).toThrow(ApiException);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 403, code: 'AUTH_006' });
    }
  });

  it('should throw AUTH_003 when no user is present', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['FAMILY_ADMIN']);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ApiException);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 401, code: 'AUTH_003' });
    }
  });

  it('should allow when multiple roles match', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['SYSTEM_ADMIN', 'FAMILY_ADMIN']);
    const context = createMockContext({ id: 'user-1', role: 'FAMILY_ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
