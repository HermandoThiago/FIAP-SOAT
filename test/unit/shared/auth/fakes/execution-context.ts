import { type ExecutionContext, type Type } from '@nestjs/common';

import { type AuthenticatedRequest } from '../../../../../src/shared/auth/principal';

export type FakeRequest = Pick<AuthenticatedRequest, 'user' | 'tracking'> & { headers: { authorization?: string } };

/**
 * ExecutionContext falso para os guards: aponta para um handler e uma classe reais (com os decorators de metadata
 * aplicados) e devolve um request mínimo. O Reflector real lê a metadata desses alvos.
 */
export function createExecutionContext(
  controller: Type,
  handlerName: string,
  request: FakeRequest = { headers: {} },
): { context: ExecutionContext; request: FakeRequest } {
  const handler = (controller.prototype as Record<string, unknown>)[handlerName] as () => unknown;
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

export function bearer(token: string): FakeRequest {
  return { headers: { authorization: `Bearer ${token}` } };
}
