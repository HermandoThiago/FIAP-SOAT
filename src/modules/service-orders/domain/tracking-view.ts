import { StatusOrdemServico as Status } from '../../../generated/prisma/enums';

/** Texto de status e próxima ação para o cliente (PRD-004). */
const CUSTOMER_MESSAGES: Record<
  Status,
  { statusDescription: string; nextAction: string | null }
> = {
  RECEBIDA: {
    statusDescription: 'Veículo recebido na oficina',
    nextAction: null,
  },
  EM_DIAGNOSTICO: {
    statusDescription: 'Veículo em diagnóstico',
    nextAction: null,
  },
  AGUARDANDO_APROVACAO: {
    statusDescription: 'Aguardando sua aprovação do orçamento',
    nextAction: 'aprovar ou recusar o orçamento',
  },
  AGUARDANDO_EXECUCAO: {
    statusDescription: 'Orçamento aprovado, aguardando o início do serviço',
    nextAction: null,
  },
  EM_EXECUCAO: { statusDescription: 'Serviço em execução', nextAction: null },
  FINALIZADA: {
    statusDescription: 'Serviço finalizado',
    nextAction: 'retirar o veículo na oficina',
  },
  ENTREGUE: { statusDescription: 'Veículo entregue', nextAction: null },
  ORCAMENTO_RECUSADO: {
    statusDescription: 'Orçamento recusado',
    nextAction: null,
  },
  CANCELADA: {
    statusDescription: 'Ordem de serviço cancelada',
    nextAction: null,
  },
};

export function describeStatus(status: Status) {
  return CUSTOMER_MESSAGES[status];
}

/** `ABC1D23` → `ABC1***`: a placa nunca sai inteira para o cliente (PII). */
export function maskLicensePlate(plate: string): string {
  return `${plate.slice(0, 4)}***`;
}

/** CPF `***.982.247-**`; CNPJ `**.***.247/0001-**`. Só os dígitos do meio aparecem. */
export function maskDocument(document: string): string {
  if (document.length === 14) {
    return `**.***.${document.slice(5, 8)}/${document.slice(8, 12)}-**`;
  }
  return `***.${document.slice(3, 6)}.${document.slice(6, 9)}-**`;
}
