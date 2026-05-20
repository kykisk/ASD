import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiException } from '../exceptions/api.exception.js';

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string; constraint: string }>;
  };
  timestamp: string;
  path: string;
  requestId: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();

    let statusCode: number;
    let code: string;
    let message: string;
    let details: Array<{ field: string; message: string; constraint: string }> | undefined;

    if (exception instanceof ApiException) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.userMessage;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = this.mapHttpStatusToCode(statusCode, request.path);
      message = this.mapHttpStatusToMessage(statusCode);

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (resp['message'] && typeof resp['message'] === 'string') {
          message = resp['message'];
        }
      }
    } else {
      statusCode = 500;
      code = 'SYSTEM_001';
      message = '서버 내부 오류가 발생했습니다';

      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    response.status(statusCode).json(body);
  }

  private mapHttpStatusToCode(status: number, path: string): string {
    switch (status) {
      case 400:
        return 'VALIDATION_001';
      case 401:
        return 'AUTH_003';
      case 403:
        return 'AUTH_006';
      case 404: {
        const module = this.extractModuleFromPath(path);
        return `${module}_404`;
      }
      case 409: {
        const module = this.extractModuleFromPath(path);
        return `${module}_409`;
      }
      case 429:
        return 'SYSTEM_002';
      default:
        return 'SYSTEM_001';
    }
  }

  private mapHttpStatusToMessage(status: number): string {
    switch (status) {
      case 400:
        return '입력값이 유효하지 않습니다';
      case 401:
        return '유효하지 않은 토큰입니다';
      case 403:
        return '접근 권한이 없습니다';
      case 404:
        return '리소스를 찾을 수 없습니다';
      case 409:
        return '리소스 충돌이 발생했습니다';
      case 429:
        return '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요';
      default:
        return '서버 내부 오류가 발생했습니다';
    }
  }

  private extractModuleFromPath(path: string): string {
    const segments = path.replace(/^\/v1\//, '').split('/');
    const resource = segments[0] || 'SYSTEM';
    return resource.toUpperCase().replace(/-/g, '_');
  }
}
