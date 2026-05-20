import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T> | T>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        if (data !== null && data !== undefined && typeof data === 'object') {
          const obj = data as Record<string, unknown>;
          if ('success' in obj) {
            return data;
          }
        }

        return {
          success: true as const,
          data: data ?? null,
        } as SuccessResponse<T>;
      }),
    );
  }
}
