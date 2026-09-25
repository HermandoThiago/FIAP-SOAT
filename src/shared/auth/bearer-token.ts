// Extração do `Authorization: Bearer <token>` (contrato-api.md §1). Esquema diferente ou header ausente → sem token.
const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

export function extractBearerToken(request: { headers: { authorization?: string } }): string | undefined {
  const header = request.headers.authorization;
  if (!header) {
    return undefined;
  }
  return BEARER_PATTERN.exec(header)?.[1];
}
