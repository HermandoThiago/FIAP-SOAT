// TypeScript puro (sem @nestjs/*): regras de CPF e CNPJ (dígitos verificadores).
export type DocumentType = 'CPF' | 'CNPJ';

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;

const toDigits = (value: string) => Array.from(value, Number);

// Todos os dígitos iguais (ex.: 111.111.111-11) passam no cálculo, mas não são documentos válidos.
const hasOnlyRepeatedDigits = (value: string) => /^(\d)\1+$/.test(value);

const checkDigit = (digits: number[], weights: number[]) => {
  const sum = weights.reduce((acc, weight, i) => acc + digits[i] * weight, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

export function isValidCpf(value: string): boolean {
  if (!/^\d+$/.test(value) || value.length !== CPF_LENGTH) return false;
  if (hasOnlyRepeatedDigits(value)) return false;

  const digits = toDigits(value);
  const first = checkDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits[9] === first && digits[10] === second;
}

export function isValidCnpj(value: string): boolean {
  if (!/^\d+$/.test(value) || value.length !== CNPJ_LENGTH) return false;
  if (hasOnlyRepeatedDigits(value)) return false;

  const digits = toDigits(value);
  const first = checkDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits[12] === first && digits[13] === second;
}

export function isValidDocument(type: DocumentType, value: string): boolean {
  return type === 'CPF' ? isValidCpf(value) : isValidCnpj(value);
}
