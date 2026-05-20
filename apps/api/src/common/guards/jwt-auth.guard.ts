import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { RedisTokenService } from '../../auth/redis-token.service.js';
import { ApiException } from '../exceptions/api.exception.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private redisTokenService: RedisTokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    let parentResult: boolean;
    try {
      parentResult = (await super.canActivate(context)) as boolean;
    } catch (err: any) {
      if (err?.message === 'jwt expired') {
        throw new ApiException(401, 'AUTH_002', '액세스 토큰이 만료되었습니다');
      }
      throw new ApiException(401, 'AUTH_003', '유효하지 않은 토큰입니다');
    }
    if (!parentResult) return false;

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const isBlacklisted = await this.redisTokenService.isBlacklisted(tokenHash);
      if (isBlacklisted) {
        throw new ApiException(401, 'AUTH_003', '유효하지 않은 토큰입니다');
      }
    }

    return true;
  }
}
