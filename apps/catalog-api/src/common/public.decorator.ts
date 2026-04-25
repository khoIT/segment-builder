import { SetMetadata } from '@nestjs/common';

// Mark a route as public — bypasses the global JwtGuard. Used for
// /health and /auth/dev-login.
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
