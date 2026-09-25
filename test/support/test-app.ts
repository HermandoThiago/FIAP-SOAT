import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/app.setup';
import { applyTestEnv } from './test-env';

// Instância real da aplicação (mesmos pipes, filtro e prefixo do main.ts) sobre o banco de teste.
export async function createTestApp(): Promise<INestApplication> {
  applyTestEnv();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = setupApp(moduleRef.createNestApplication({ bufferLogs: true }));
  await app.init();
  return app;
}
