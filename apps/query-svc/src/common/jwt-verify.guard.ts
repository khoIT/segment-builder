import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';

export interface BedrockClaims extends JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  name?: string;
}

// Verify-only guard — query-svc never issues tokens. Same JWT_SECRET as
// catalog-api so the user's token works end-to-end.
@Injectable()
export class JwtVerifyGuard implements CanActivate {
  constructor(private readonly cfg: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, this.cfg.getOrThrow<string>('JWT_SECRET'), { algorithms: ['HS256'] });
      if (typeof decoded === 'string') throw new Error('Unexpected string payload');
      (req as Request & { user?: BedrockClaims }).user = decoded as BedrockClaims;
      // Pass-through token for downstream HTTP calls to catalog-api.
      (req as Request & { token?: string }).token = token;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
