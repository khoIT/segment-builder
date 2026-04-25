import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface BedrockClaims extends JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  name: string;
}

// Sign / verify HS256 tokens. Secret comes from JWT_SECRET env. Dev
// tokens last 1d; in production we'll cut to 1h once SSO + refresh
// land (out of scope for the prototype).
@Injectable()
export class AuthService {
  constructor(private readonly cfg: ConfigService) {}

  private get secret(): string {
    return this.cfg.getOrThrow<string>('JWT_SECRET');
  }

  sign(claims: Omit<BedrockClaims, 'iat' | 'exp'>): string {
    const ttl = this.cfg.get('NODE_ENV') === 'production' ? '1h' : '1d';
    return jwt.sign(claims, this.secret, { algorithm: 'HS256', expiresIn: ttl });
  }

  verify(token: string): BedrockClaims {
    const decoded = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') {
      throw new Error('Unexpected string JWT payload');
    }
    return decoded as BedrockClaims;
  }
}
