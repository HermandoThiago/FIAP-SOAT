import { Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { type Env } from '../../shared/config/env';
import { CustomersModule } from '../customers/customers.module';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { PasswordHasher } from './services/password-hasher';
import { JWT_ALGORITHM, JWT_ISSUER } from './services/token.constants';
import { TrackingTokenService } from './services/tracking-token.service';
import { UsersService } from './services/users.service';

// Módulo `identity` (contextos-delimitados.md §4; ADR-004/011). Camadas: controllers/ + dto/ → services/ →
// repositories/, sobre domain/ (ADR-003). Registra os guards globais (JwtAuthGuard e depois RolesGuard) e cria o
// MANAGER de ADMIN_EMAIL/ADMIN_PASSWORD na subida (RF-062). Exporta só AuthService e TrackingTokenService.
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER },
        verifyOptions: { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER },
      }),
    }),
    CustomersModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    TrackingTokenService,
    UsersService,
    { provide: PasswordHasher, useFactory: () => new PasswordHasher() },
    UserRepository,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, TrackingTokenService],
})
export class IdentityModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(IdentityModule.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    await this.usersService.ensureAdminUser(email, this.config.get('ADMIN_PASSWORD', { infer: true }));
    this.logger.log(`Admin user (MANAGER) ensured for ${email}`);
  }
}
