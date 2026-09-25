import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { type Prisma, PrismaClient } from '../../generated/prisma/client';
import { type Env } from '../config/env';

// Conexão única com o PostgreSQL (Prisma 7 + driver adapter pg — E-17). Os repositórios recebem este serviço;
// os serviços de aplicação abrem transações com `prisma.$transaction` (visao-geral.md §6; ADR-012).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({ adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Readiness (GET /ready): o banco responde a uma consulta trivial. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

/** Cliente dentro de uma transação interativa — assinatura comum aos métodos de repositório que participam dela. */
export type TransactionClient = Prisma.TransactionClient;
