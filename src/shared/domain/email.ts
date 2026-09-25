import { ValidationError } from './domain-error';

// E-mail do cliente/usuário (glossário §6): formato RFC básico `local@dominio.tld`, normalizado em minúsculas e sem
// espaços nas pontas, máximo 254 caracteres (ADR-009 Parte 2; PRD-001 RN-006). Só ASCII: e-mail internacionalizado
// (unicode) fica fora do MVP.

const MAX_LENGTH = 254;
// Parte local em dot-atom (RFC 5322, sem aspas) + domínio com pelo menos um ponto e TLD de 2+ letras.
const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

export class Email {
  private constructor(readonly value: string) {}

  /** Normaliza (trim + minúsculas) e valida; fora do formato, acima de 254 caracteres ou não string → 422 `email`. */
  static parse(raw: string): Email {
    if (typeof raw !== 'string') {
      throw new ValidationError('e-mail inválido', 'email');
    }
    const value = raw.trim().toLowerCase();
    if (value.length > MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
      throw new ValidationError('e-mail inválido', 'email');
    }
    return new Email(value);
  }

  /** Exposição em logs (ADR-009 Parte 2): primeira letra da parte local + `***@dominio` → `m***@oficina.local`. */
  masked(): string {
    const at = this.value.indexOf('@');
    return `${this.value.charAt(0)}***${this.value.slice(at)}`;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
