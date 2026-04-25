import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController, MeController } from './auth.controller';
import { JwtGuard } from './jwt.guard';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtGuard],
})
export class AuthModule {}
