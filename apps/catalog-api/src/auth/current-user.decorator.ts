import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { BedrockClaims } from './auth.service';

// Convenience: `someHandler(@CurrentUser() user: BedrockClaims) { … }`.
// Throws if used on a route that didn't pass through JwtGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BedrockClaims => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.user) {
      throw new Error('CurrentUser used on unauthenticated route');
    }
    return req.user;
  },
);
