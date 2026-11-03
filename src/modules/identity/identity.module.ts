import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import 'dotenv/config';
import {
  JwtAuthGuard,
  RequestContext,
  RequestContextInterceptor,
  RolesGuard,
} from './auth';
import { AuthController } from './controllers';
import { UserController } from './controllers/users.controller';
import { AuthService, TrackingTokenService } from './services';
import { UsersService } from './services/users.service';

const jwtSecret = process.env['JWT_SECRET'];
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('Defina JWT_SECRET com pelo menos 32 caracteres.');
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtSecret,
      signOptions: {
        algorithm: 'HS256',
        expiresIn: (process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m') as '15m',
      },
    }),
  ],
  controllers: [AuthController, UserController],
  exports: [UsersService, AuthService, TrackingTokenService, RequestContext],
  providers: [
    UsersService,
    AuthService,
    TrackingTokenService,
    RequestContext,
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    // Ordem importa: primeiro autentica (JwtAuthGuard), depois autoriza por perfil (RolesGuard).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class IdentityModule {}
