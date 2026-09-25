import { randomBytes, randomInt } from 'node:crypto';

import { cnpjCheckDigits, cpfCheckDigits } from '../../src/shared/domain/document';

// Geradores de dados fictícios válidos para testes de qualquer módulo e para o BDD (estrategia-de-testes.md §2;
// seguranca.md): nunca dados reais. Documentos e placas saem no formato armazenado (só dígitos / normalizada).

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomDigits(length: number): string {
  return Array.from({ length }, () => randomInt(10)).join('');
}

/** Base do documento com dois dígitos distintos garantidos: nunca sequência repetida (PRD-001 RN-001). */
function documentBase(length: number): string {
  const digits = Array.from({ length }, () => randomInt(10));
  digits[1] = (digits[0] + randomInt(1, 10)) % 10;
  return digits.join('');
}

function randomLetters(length: number): string {
  return Array.from({ length }, () => LETTERS[randomInt(LETTERS.length)]).join('');
}

function withWrongLastDigit(digits: string): string {
  const last = Number(digits.slice(-1));
  return digits.slice(0, -1) + String((last + 1) % 10);
}

/** CPF válido, só dígitos (ex.: `52998224725`). */
export function validCpf(): string {
  const base = documentBase(9);
  return base + cpfCheckDigits(base);
}

/** CNPJ válido de matriz (`/0001`), só dígitos (ex.: `45723174000110`). */
export function validCnpj(): string {
  const base = `${documentBase(8)}0001`;
  return base + cnpjCheckDigits(base);
}

/** CPF com o último dígito verificador errado. */
export function invalidCpf(): string {
  return withWrongLastDigit(validCpf());
}

/** CNPJ com o último dígito verificador errado. */
export function invalidCnpj(): string {
  return withWrongLastDigit(validCnpj());
}

/** Placa no padrão antigo, normalizada (ex.: `ABC1234`). */
export function oldLicensePlate(): string {
  return `${randomLetters(3)}${randomDigits(4)}`;
}

/** Placa Mercosul, normalizada (ex.: `ABC1D23`). */
export function mercosulLicensePlate(): string {
  return `${randomLetters(3)}${randomInt(10)}${randomLetters(1)}${randomDigits(2)}`;
}

/** E-mail fictício em domínio reservado (RFC 2606). */
export function randomEmail(): string {
  return `user-${randomBytes(4).toString('hex')}@example.com`;
}

/** Telefone com DDD, só dígitos: fixo (10) ou celular (11) — PRD-001 RN-006. */
export function randomPhone(): string {
  const areaCode = String(randomInt(11, 100));
  const mobile = randomInt(2) === 1;
  return mobile ? `${areaCode}9${randomDigits(8)}` : `${areaCode}${randomInt(2, 6)}${randomDigits(7)}`;
}
