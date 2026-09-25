import { ValidationError } from './domain-error';

// Telefone do cliente (glossário §6): só dígitos, com DDD, 10 (fixo) ou 11 (celular) dígitos — é a única regra
// documentada (ADR-009 Parte 2; PRD-001 RN-006): sem faixa de DDD nem 9 inicial. Sem código do país. Mascarado em logs
// e nas respostas ao cliente.

const LANDLINE_LENGTH = 10;
const MOBILE_LENGTH = 11;
const SEPARATORS = /[\s().-]/g;
const ONLY_DIGITS = /^\d+$/;

export class Phone {
  private constructor(readonly digits: string) {}

  /** Aceita com ou sem máscara `(11) 91234-5678`; outro tamanho, outro caractere ou não string → 422 `phone`. */
  static parse(raw: string): Phone {
    const digits = typeof raw === 'string' ? raw.replace(SEPARATORS, '') : '';
    if (!ONLY_DIGITS.test(digits) || ![LANDLINE_LENGTH, MOBILE_LENGTH].includes(digits.length)) {
      throw new ValidationError('telefone inválido', 'phone');
    }
    return new Phone(digits);
  }

  /** `(11) 91234-5678` (celular) / `(11) 3123-4567` (fixo). */
  formatted(): string {
    return `(${this.areaCode()}) ${this.prefix()}-${this.suffix()}`;
  }

  /** Exposição ao cliente e aos logs (ADR-009 Parte 2): `(11) *****-5678` / `(11) ****-4567`. */
  masked(): string {
    return `(${this.areaCode()}) ${'*'.repeat(this.prefix().length)}-${this.suffix()}`;
  }

  equals(other: Phone): boolean {
    return this.digits === other.digits;
  }

  toString(): string {
    return this.digits;
  }

  private areaCode(): string {
    return this.digits.slice(0, 2);
  }

  private prefix(): string {
    return this.digits.slice(2, -4);
  }

  private suffix(): string {
    return this.digits.slice(-4);
  }
}
