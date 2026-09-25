import { SetMetadata } from '@nestjs/common';

// Rotas públicas em allowlist explícita (ADR-004; contrato-api.md §1): /auth/login, /health, /ready, /docs (dev).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
