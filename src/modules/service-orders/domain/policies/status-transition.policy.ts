import { StatusOrdemServico as Status } from '../../../../generated/prisma/enums';

/** Comandos de negócio que mudam o status da OS (ADR-010): nunca há `PATCH status`. */
export const ServiceOrderCommand = {
  START_DIAGNOSIS: 'startDiagnosis',
  SEND_QUOTE: 'sendQuote',
  APPROVE_QUOTE: 'approveQuote',
  REJECT_QUOTE: 'rejectQuote',
  START_EXECUTION: 'startExecution',
  COMPLETE: 'complete',
  DELIVER: 'deliver',
  CANCEL: 'cancel',
} as const;
export type ServiceOrderCommand =
  (typeof ServiceOrderCommand)[keyof typeof ServiceOrderCommand];

interface Transition {
  from: Status[];
  to: Status;
}

const TRANSITIONS: Record<ServiceOrderCommand, Transition> = {
  startDiagnosis: { from: [Status.RECEBIDA], to: Status.EM_DIAGNOSTICO },
  sendQuote: {
    from: [Status.EM_DIAGNOSTICO],
    to: Status.AGUARDANDO_APROVACAO,
  },
  approveQuote: {
    from: [Status.AGUARDANDO_APROVACAO],
    to: Status.AGUARDANDO_EXECUCAO,
  },
  rejectQuote: {
    from: [Status.AGUARDANDO_APROVACAO],
    to: Status.ORCAMENTO_RECUSADO,
  },
  startExecution: {
    from: [Status.AGUARDANDO_EXECUCAO],
    to: Status.EM_EXECUCAO,
  },
  complete: { from: [Status.EM_EXECUCAO], to: Status.FINALIZADA },
  deliver: { from: [Status.FINALIZADA], to: Status.ENTREGUE },
  // O cancelamento só vale antes da aprovação do orçamento.
  cancel: {
    from: [Status.RECEBIDA, Status.EM_DIAGNOSTICO, Status.AGUARDANDO_APROVACAO],
    to: Status.CANCELADA,
  },
};

/** Status finais: a OS não aceita mais nenhum comando nem edição. */
export const TERMINAL_STATUSES: readonly Status[] = [
  Status.ENTREGUE,
  Status.ORCAMENTO_RECUSADO,
  Status.CANCELADA,
];

/** Itens (e o orçamento derivado deles) só mudam antes do envio do orçamento (PRD-003 RN-031). */
const ITEM_EDITABLE_STATUSES: readonly Status[] = [
  Status.RECEBIDA,
  Status.EM_DIAGNOSTICO,
];

export const StatusTransitionPolicy = {
  /** Status de destino do comando, ou `null` se o status atual não o permite. */
  resolve(current: Status, command: ServiceOrderCommand): Status | null {
    const { from, to } = TRANSITIONS[command];
    return from.includes(current) ? to : null;
  },

  canEditItems(status: Status): boolean {
    return ITEM_EDITABLE_STATUSES.includes(status);
  },

  isTerminal(status: Status): boolean {
    return TERMINAL_STATUSES.includes(status);
  },
};
