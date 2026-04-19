import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RbacGuard } from './guards/rbac.guard';

@Module({
  imports: [
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AuthModule { }