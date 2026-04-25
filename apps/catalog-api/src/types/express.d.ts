// Augment express Request with our JWT claims so `req.user` is typed.
import type { BedrockClaims } from '../auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: BedrockClaims;
    }
  }
}
export {};
