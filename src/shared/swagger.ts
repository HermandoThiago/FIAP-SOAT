import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('FIAP SOAT')
    .setDescription('Endpoints para desafio pós tech fiap')
    .setVersion('1.0')
    // Same name used by the controllers' @ApiBearerAuth() decorators.
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Informe somente o token JWT, sem o prefixo Bearer.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  return document;
}
