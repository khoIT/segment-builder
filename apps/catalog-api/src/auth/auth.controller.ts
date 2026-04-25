import {
  Body, Controller, Get, NotFoundException, Post, UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import type { BedrockClaims } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import { DevLoginRequest, DevLoginResponse } from '@bedrock/contracts';

type DevLoginResponseT = z.infer<typeof DevLoginResponse>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cfg: ConfigService,
  ) {}

  // Mock SSO. Issues a token for `AUTH_DEV_USER`. Refuses in production.
  @Public()
  @Post('dev-login')
  async devLogin(
    @Body(new ZodValidationPipe(DevLoginRequest.partial())) body: Partial<{ email: string; role: 'admin' | 'editor' | 'viewer' }>,
  ): Promise<DevLoginResponseT> {
    if (this.cfg.get('NODE_ENV') === 'production') {
      throw new NotFoundException('dev-login disabled in production');
    }
    const email = body.email ?? this.cfg.getOrThrow<string>('AUTH_DEV_USER');
    const role = body.role ?? 'admin';
    const name = this.cfg.get<string>('AUTH_DEV_USER_NAME') ?? email.split('@')[0];
    // For prototype, sub == email. Real schema will key on users.id.
    const user = { id: email, email, role, name };
    const token = this.auth.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    return { token, user };
  }
}

@Controller('me')
@UseGuards(JwtGuard)
export class MeController {
  @Get()
  async me(@CurrentUser() user: BedrockClaims) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
