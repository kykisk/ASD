import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicensedTool } from '@auticare/prisma-client';
import { LicensesService } from '../../licenses/licenses.service.js';
import { FamilyResolverService } from '../services/family-resolver.service.js';
import { REQUIRES_LICENSE_KEY } from '../decorators/requires-license.decorator.js';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licensesService: LicensesService,
    private readonly familyResolver: FamilyResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTool = this.reflector.getAllAndOverride<LicensedTool | undefined>(
      REQUIRES_LICENSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 라이선스 불필요 → 통과
    if (!requiredTool) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; familyId: string | null };
      params?: Record<string, string>;
    }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('인증이 필요합니다');

    const familyId = await this.familyResolver.resolve(user.id, user.familyId);
    if (!familyId) {
      throw new ForbiddenException('가족 정보를 찾을 수 없습니다');
    }

    const hasLicense = await this.licensesService.validateLicense(familyId, requiredTool);
    if (!hasLicense) {
      throw new ForbiddenException(
        `${requiredTool} 도구에 대한 유효한 라이선스가 없습니다. 관리자에게 문의하세요.`,
      );
    }

    return true;
  }
}
