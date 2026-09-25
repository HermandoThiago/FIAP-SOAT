import { type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_TRACKING_ROUTE_KEY } from './tracking.decorator';

// Leitura dos marcadores de rota usados pelos guards globais: @Public() (allowlist — ADR-004) e @TrackingRoute()
// (autenticada pelo TrackingAuthGuard — ADR-011). O handler sobrescreve a classe.
function hasFlag(reflector: Reflector, context: ExecutionContext, key: string): boolean {
  return reflector.getAllAndOverride<boolean | undefined>(key, [context.getHandler(), context.getClass()]) === true;
}

export function isPublicRoute(reflector: Reflector, context: ExecutionContext): boolean {
  return hasFlag(reflector, context, IS_PUBLIC_KEY);
}

export function isTrackingRoute(reflector: Reflector, context: ExecutionContext): boolean {
  return hasFlag(reflector, context, IS_TRACKING_ROUTE_KEY);
}
