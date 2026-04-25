import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

// Single source of truth for the API error envelope. Maps Nest's
// HttpException, zod errors, and unknown errors into a consistent shape.
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly log = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (req.headers['x-request-id'] as string) ?? null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      code: 'INTERNAL',
      message: 'Internal server error',
    };

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      body = {
        code: 'VALIDATION_ERROR',
        message: 'Request payload failed validation',
        details: { issues: exception.issues },
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string'
        ? { code: this.codeForStatus(status), message: r }
        : { code: this.codeForStatus(status), ...(r as Record<string, unknown>) };
    } else if (exception instanceof Error) {
      this.log.error({ err: exception.message, stack: exception.stack, requestId });
      body = { code: 'INTERNAL', message: 'Internal server error' };
    }

    res.status(status).json({ ...body, requestId });
  }

  private codeForStatus(s: number): string {
    if (s === 400) return 'BAD_REQUEST';
    if (s === 401) return 'UNAUTHORIZED';
    if (s === 403) return 'FORBIDDEN';
    if (s === 404) return 'NOT_FOUND';
    if (s === 409) return 'CONFLICT';
    if (s === 429) return 'RATE_LIMITED';
    return 'INTERNAL';
  }
}
