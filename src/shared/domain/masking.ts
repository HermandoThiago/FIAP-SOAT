// Máscaras de dados sensíveis (ADR-009 Parte 2; PRD-001 RN-008): usadas pelos value objects (`masked()`) e pelo
// mascaramento central dos logs em shared/http. Formatos oficiais: `***.982.247-**`, `**.***.174/0001-**`, `ABC1***`.

export function maskCpf(digits: string): string {
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function maskCnpj(digits: string): string {
  return `**.***.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
}

export function maskDocument(digits: string): string {
  return digits.length === 14 ? maskCnpj(digits) : maskCpf(digits);
}

export function maskLicensePlate(plate: string): string {
  return `${plate.slice(0, 4)}***`;
}
