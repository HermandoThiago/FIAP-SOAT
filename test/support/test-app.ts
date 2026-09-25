import { type Server } from 'node:http';

import { type INestApplication, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { applyTestEnv } from './test-env';

export interface TestAppOptions {
  /** Controllers extras registrados só no teste (ex.: uma rota de sondagem para um guard). */
  controllers?: Type[];
  /** Módulos extras importados pelo módulo raiz do teste (ex.: IdentityModule, para o guard do controller extra). */
  imports?: Type[];
}

// Instância real da aplicação (mesmos pipes, filtro e prefixo do main.ts) sobre o banco de teste.
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication> {
  applyTestEnv();
  // ConfigModule.forRoot({ validate }) roda no import do AppModule: o ambiente de teste precisa estar definido antes
  // (no CI não há .env), por isso o import é tardio.
  const { AppModule } = await import('../../src/app.module');
  const { setupApp } = await import('../../src/app.setup');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...(options.imports ?? [])],
    controllers: options.controllers ?? [],
  }).compile();
  const app = setupApp(moduleRef.createNestApplication({ bufferLogs: true }));
  await app.init();
  return app;
}

/** Servidor HTTP tipado para o supertest (getHttpServer() devolve `any`). */
export function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}
