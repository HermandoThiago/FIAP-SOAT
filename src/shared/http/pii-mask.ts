import { maskCnpj, maskCpf, maskLicensePlate } from '../domain/masking';

// Mascaramento central de PII em texto livre (logs — ADR-009; PRD-005 RN-066; seguranca.md A02).
// Reconhece CPF (com ou sem pontuação), CNPJ (idem) e placas (antiga e Mercosul, com ou sem hífen).
const CNPJ_PATTERN = /\b(\d{2})\.?(\d{3})\.?(\d{3})\/?(\d{4})-?(\d{2})\b/g;
const CPF_PATTERN = /\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g;
const PLATE_PATTERN = /\b([A-Z]{3})-?(\d)([A-Z0-9])(\d{2})\b/g;

const MAX_DEPTH = 8;

export function maskPii(text: string): string {
  return text
    .replace(CNPJ_PATTERN, (_match, a: string, b: string, c: string, d: string, e: string) =>
      maskCnpj(`${a}${b}${c}${d}${e}`),
    )
    .replace(CPF_PATTERN, (_match, a: string, b: string, c: string, d: string) => maskCpf(`${a}${b}${c}${d}`))
    .replace(PLATE_PATTERN, (_match, letters: string, d1: string, x: string, d2: string) =>
      maskLicensePlate(`${letters}${d1}${x}${d2}`),
    );
}

/**
 * Aplica `maskPii` nas strings de um valor de log: recursivo só em arrays e objetos literais (com limite de
 * profundidade e proteção contra ciclos); instâncias de classe (req/res do Node, Error, Date) passam intactas —
 * elas já são reduzidas pelos serializers do pino.
 */
export function maskPiiDeep<T>(value: T, depth = 0, seen: WeakSet<object> = new WeakSet()): T {
  if (typeof value === 'string') {
    return maskPii(value) as T;
  }
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    seen.add(value);
    return value.map((item: unknown) => maskPiiDeep(item, depth + 1, seen)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  seen.add(value);
  const masked: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    masked[key] = maskPiiDeep(item, depth + 1, seen);
  }
  return masked as T;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
