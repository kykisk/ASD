import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '@auticare/prisma-client';

const AUDITABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!AUDITABLE_METHODS.has(method)) {
      return next.handle();
    }

    const user = (request as Request & { user?: { id?: string } }).user;
    const userId = user?.id ?? null;
    const action = METHOD_TO_ACTION[method] || method;
    const resource = this.extractResource(request.path);
    const resourceId = this.extractResourceId(request.path);
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      null;
    const userAgent = (request.headers['user-agent'] as string) || null;

    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog
          .create({
            data: {
              userId,
              action,
              resource,
              resourceId,
              ipAddress,
              userAgent,
            },
          })
          .catch((error: unknown) => {
            this.logger.error(
              `Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      }),
    );
  }

  private extractResource(path: string): string {
    const segments = path.replace(/^\/v1\//, '').split('/');
    return segments[0] || 'unknown';
  }

  private extractResourceId(path: string): string | null {
    const segments = path.replace(/^\/v1\//, '').split('/');
    return segments.length > 1 ? segments[1] || null : null;
  }
}
