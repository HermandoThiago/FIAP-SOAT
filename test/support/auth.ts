import { Controller, Get, type INestApplication } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import request from 'supertest';

import { TrackingPrincipal } from '../../src/shared/auth/current-user.decorator';
import { type TrackingCredential } from '../../src/shared/auth/principal';
import { TrackingRoute } from '../../src/shared/auth/tracking.decorator';
import { httpServer } from './test-app';
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from './test-env';

// Helpers de autenticação dos testes de integração/BDD (ADR-004/011): login pela API real e assinatura de tokens
// com o JwtService da aplicação (mesmo segredo/emissor) para cenários de token expirado ou forjado.
export const API_BASE = '/api/v1';

export async function loginAs(app: INestApplication, email: string, password: string): Promise<string> {
  const response = await request(httpServer(app)).post(`${API_BASE}/auth/login`).send({ email, password }).expect(200);
  return (response.body as { accessToken: string }).accessToken;
}

/** Token do MANAGER criado na subida (ADMIN_EMAIL/ADMIN_PASSWORD de test-env.ts — RF-062). */
export function loginAsAdmin(app: INestApplication): Promise<string> {
  return loginAs(app, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
}

/** Assina um token arbitrário com o JwtService do app (ex.: `{ expiresIn: '-1s' }` para expirado). */
export function signToken(app: INestApplication, payload: object, options: JwtSignOptions): Promise<string> {
  return app.get(JwtService).signAsync(payload, options);
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export const TRACKING_PROBE_PATH = 'tracking-probe';

/**
 * Rota de sondagem de /tracking/** (ADR-011): devolve a credencial que o TrackingAuthGuard injetou em request.tracking.
 * O teste unitário do guard só lê a metadata (@TrackingRoute) do handler; o de integração registra o controller no
 * módulo raiz do teste, como fará o módulo service-orders ao importar o IdentityModule.
 */
@TrackingRoute()
@Controller(TRACKING_PROBE_PATH)
export class TrackingProbeController {
  @Get()
  probe(@TrackingPrincipal() credential: TrackingCredential): TrackingCredential {
    return credential;
  }
}
