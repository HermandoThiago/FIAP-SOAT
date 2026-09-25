import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';

import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

// GET /health (liveness) e GET /ready (readiness: checa o banco) — visao-geral.md §6; contrato-api.md §3.1.
// Públicas (allowlist — ADR-004) e fora do prefixo /api/v1 (README §6).
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness: o processo responde' })
  @ApiOkResponse({ description: 'Aplicação viva', schema: { example: { status: 'UP' } } })
  health(): { status: 'UP' } {
    return { status: 'UP' };
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness: o banco de dados responde' })
  @ApiOkResponse({ description: 'Banco de dados acessível', schema: { example: { status: 'UP' } } })
  @ApiServiceUnavailableResponse({
    description: 'Banco de dados indisponível',
    schema: { example: { status: 'DOWN' } },
  })
  async ready(@Res({ passthrough: true }) response: Response): Promise<{ status: 'UP' | 'DOWN' }> {
    const databaseUp = await this.prisma.isHealthy();
    if (!databaseUp) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'DOWN' };
    }
    return { status: 'UP' };
  }
}
