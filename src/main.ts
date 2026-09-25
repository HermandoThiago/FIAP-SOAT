import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { API_PREFIX, DOCS_PATH, setupApp } from './app.setup';
import { type Env } from './shared/config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupApp(app);

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(
    `API listening on http://localhost:${port}/${API_PREFIX} (APP_ENV=${config.get('APP_ENV', { infer: true })})`,
  );
  if (config.get('APP_ENV', { infer: true }) === 'dev') {
    logger.log(`Swagger UI on http://localhost:${port}/${DOCS_PATH}`);
  }
}

void bootstrap();
