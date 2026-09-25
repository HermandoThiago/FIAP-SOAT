import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { CatalogModule } from './modules/catalog/catalog.module';
import { CustomersModule } from './modules/customers/customers.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { type Env, validateEnv } from './shared/config/env';
import { buildLoggerParams } from './shared/http/logger';
import { ProblemDetailsFilter } from './shared/http/problem-details.filter';
import { createValidationPipe } from './shared/http/validation';
import { SharedModule } from './shared/shared.module';

// Raiz do monólito modular: SharedModule + os 4 módulos de contexto (estrutura-do-repositorio.md §2).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildLoggerParams({
          APP_ENV: config.get('APP_ENV', { infer: true }),
          LOG_LEVEL: config.get('LOG_LEVEL', { infer: true }),
        }),
    }),
    SharedModule,
    CustomersModule,
    CatalogModule,
    ServiceOrdersModule,
    IdentityModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
