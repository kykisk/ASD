import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@auticare/prisma-client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { ApiException } from '../exceptions/api.exception.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ApiException(401, 'AUTH_003', '유효하지 않은 토큰입니다');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ApiException(403, 'AUTH_006', '접근 권한이 없습니다');
    }
    return true;
  }
}
