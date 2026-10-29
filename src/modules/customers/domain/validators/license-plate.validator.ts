// TypeScript puro (sem @nestjs/*): regras da placa (PRD-001 RN-004 e RN-008).

// Antiga: AAA9999 · Mercosul: AAA9A99.
const OLD_PATTERN = /^[A-Z]{3}\d{4}$/;
const MERCOSUL_PATTERN = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/** Maiúsculas, sem hífen, espaços ou pontuação: "abc-1d23" → "ABC1D23". */
export function normalizeLicensePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Valida uma placa já normalizada (padrão antigo ou Mercosul). */
export function isValidLicensePlate(value: string): boolean {
  return OLD_PATTERN.test(value) || MERCOSUL_PATTERN.test(value);
}

/** Máscara para logs (RN-008): "ABC1D23" → "ABC1***". */
export function maskLicensePlate(value: string): string {
  return `${value.slice(0, 4)}***`;
}
