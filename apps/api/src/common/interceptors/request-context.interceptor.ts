import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '@auticare/prisma-client';
import { requestContext } from '../context/request-context.js';

/** 로그인한 사용자를 요청 컨텍스트에 넣음. 가족은 필요할 때만(AI 호출 기록) 조회 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string; familyId?: string | null } }>();
    const user = req?.user;
    let family: Promise<string | null> | undefined;
    const resolveFamilyId = () => {
      family ??= user?.familyId
        ? Promise.resolve(user.familyId)
        : user?.id
          ? this.prisma.familyMember
              .findFirst({ where: { userId: user.id }, select: { familyId: true } })
              .then((m) => m?.familyId ?? null)
              .catch(() => null)
          : Promise.resolve(null);
      return family;
    };
    return new Observable((subscriber) =>
      requestContext.run({ userId: user?.id, resolveFamilyId }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
