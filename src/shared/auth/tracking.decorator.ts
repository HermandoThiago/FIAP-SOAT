import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { TrackingAuthGuard } from './tracking-auth.guard';

// Marca as rotas /tracking/** (ADR-011): o JwtAuthGuard global as ignora e o TrackingAuthGuard passa a autenticar
// (token de acompanhamento ou login CUSTOMER). Usável na classe do controller ou no handler.
export const IS_TRACKING_ROUTE_KEY = 'isTrackingRoute';
export const TrackingRoute = () =>
  applyDecorators(SetMetadata(IS_TRACKING_ROUTE_KEY, true), UseGuards(TrackingAuthGuard));
