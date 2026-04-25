import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// Stamps every request with `x-request-id`. Echoes any inbound id so
// upstream services (web, query-svc) keep their correlation chain.
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.headers['x-request-id'];
    const id = (typeof inbound === 'string' && inbound) ? inbound : randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
