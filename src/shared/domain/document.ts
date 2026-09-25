import { ValidationError } from './domain-error';
import { maskDocument } from './masking';

// Documento do cliente (glossário §3; agregados.md §2): CPF (11 dígitos) ou CNPJ (14), só dígitos, com dígitos
// verificadores mod 11 e rejeição de sequências repetidas (ADR-009 Parte 2; PRD-001 RN-001/RN-002; PRD-005 RN-063).
// Formato alfanumérico da Receita fica fora (Could, PRD-001 RN-002).

export type DocumentKind = 'CPF' | 'CNPJ';

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const SEPARATORS = /[.\-/\s]/g;
const ONLY_DIGITS = /^\d+$/;
const REPEATED_SEQUENCE = /^(\d)\1+$/;
const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

// Entrada que não seja string cai na mesma validação (422 `document`), nunca TypeError.
function digitsOf(raw: unknown, ...allowedLengths: number[]): string {
  const digits = typeof raw === 'string' ? raw.replace(SEPARATORS, '') : '';
  if (!ONLY_DIGITS.test(digits) || !allowedLengths.includes(digits.length)) {
    throw new ValidationError('documento inválido', 'document');
  }
  return digits;
}

function mod11CheckDigit(digits: string, weightOf: (index: number) => number): string {
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * weightOf(index), 0);
  const remainder = sum % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}

/** Dígitos verificadores do CPF a partir dos 9 primeiros dígitos (pesos 10..2 e 11..2). */
export function cpfCheckDigits(base: string): string {
  const first = mod11CheckDigit(base, (index) => 10 - index);
  const second = mod11CheckDigit(base + first, (index) => 11 - index);
  return first + second;
}

/** Dígitos verificadores do CNPJ a partir dos 12 primeiros dígitos (pesos 5..2,9..2 e 6..2,9..2). */
export function cnpjCheckDigits(base: string): string {
  const first = mod11CheckDigit(base, (index) => CNPJ_WEIGHTS[index + 1]);
  const second = mod11CheckDigit(base + first, (index) => CNPJ_WEIGHTS[index]);
  return first + second;
}

export abstract class Document {
  protected constructor(
    readonly digits: string,
    readonly kind: DocumentKind,
  ) {}

  /** Aceita CPF ou CNPJ com ou sem pontuação; qualquer outro tamanho ou caractere → 422 `document`. */
  static parse(raw: string): Document {
    const digits = digitsOf(raw, CPF_LENGTH, CNPJ_LENGTH);
    return digits.length === CPF_LENGTH ? Cpf.parse(digits) : Cnpj.parse(digits);
  }

  abstract formatted(): string;

  /** Exposição ao cliente e aos logs (PRD-001 RN-008): `***.982.247-**` / `**.***.174/0001-**`. */
  masked(): string {
    return maskDocument(this.digits);
  }

  equals(other: Document): boolean {
    return this.digits === other.digits;
  }

  toString(): string {
    return this.digits;
  }
}

export class Cpf extends Document {
  private constructor(digits: string) {
    super(digits, 'CPF');
  }

  static override parse(raw: string): Cpf {
    const digits = digitsOf(raw, CPF_LENGTH);
    if (REPEATED_SEQUENCE.test(digits)) {
      throw new ValidationError('CPF inválido: sequência repetida', 'document');
    }
    if (cpfCheckDigits(digits.slice(0, 9)) !== digits.slice(9)) {
      throw new ValidationError('CPF com dígito verificador inválido', 'document');
    }
    return new Cpf(digits);
  }

  /** `529.982.247-25` */
  formatted(): string {
    const d = this.digits;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
}

export class Cnpj extends Document {
  private constructor(digits: string) {
    super(digits, 'CNPJ');
  }

  static override parse(raw: string): Cnpj {
    const digits = digitsOf(raw, CNPJ_LENGTH);
    if (REPEATED_SEQUENCE.test(digits)) {
      throw new ValidationError('CNPJ inválido: sequência repetida', 'document');
    }
    if (cnpjCheckDigits(digits.slice(0, 12)) !== digits.slice(12)) {
      throw new ValidationError('CNPJ com dígito verificador inválido', 'document');
    }
    return new Cnpj(digits);
  }

  /** `11.222.333/0001-81` */
  formatted(): string {
    const d = this.digits;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
}
