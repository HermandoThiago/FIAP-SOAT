import { StatusOrdemServico as Status } from '../../src/generated/prisma/enums';
import {
  ServiceOrderCommand as Command,
  StatusTransitionPolicy,
  TERMINAL_STATUSES,
} from '../../src/modules/service-orders/domain/policies';

// Tabela esperada: comando → [status de origem → status de destino].
const ALLOWED: Record<Command, Partial<Record<Status, Status>>> = {
  startDiagnosis: { RECEBIDA: 'EM_DIAGNOSTICO' },
  sendQuote: { EM_DIAGNOSTICO: 'AGUARDANDO_APROVACAO' },
  approveQuote: { AGUARDANDO_APROVACAO: 'AGUARDANDO_EXECUCAO' },
  rejectQuote: { AGUARDANDO_APROVACAO: 'ORCAMENTO_RECUSADO' },
  startExecution: { AGUARDANDO_EXECUCAO: 'EM_EXECUCAO' },
  complete: { EM_EXECUCAO: 'FINALIZADA' },
  deliver: { FINALIZADA: 'ENTREGUE' },
  cancel: {
    RECEBIDA: 'CANCELADA',
    EM_DIAGNOSTICO: 'CANCELADA',
    AGUARDANDO_APROVACAO: 'CANCELADA',
  },
};

const combinations = Object.values(Command).flatMap((command) =>
  Object.values(Status).map(
    (status) => [command, status, ALLOWED[command][status] ?? null] as const,
  ),
);

describe('StatusTransitionPolicy', () => {
  it('should cover every status and command combination', () => {
    expect(combinations).toHaveLength(
      Object.values(Command).length * Object.values(Status).length,
    );
  });

  it.each(combinations)(
    'should resolve %s from %s to %s',
    (command, status, expected) => {
      expect(StatusTransitionPolicy.resolve(status, command)).toBe(expected);
    },
  );

  it.each(Object.values(Status))(
    'should flag %s as terminal only when it is a final status',
    (status) => {
      expect(StatusTransitionPolicy.isTerminal(status)).toBe(
        TERMINAL_STATUSES.includes(status),
      );
    },
  );

  it.each(TERMINAL_STATUSES)(
    'should not allow any command from the terminal status %s',
    (status) => {
      for (const command of Object.values(Command)) {
        expect(StatusTransitionPolicy.resolve(status, command)).toBeNull();
      }
    },
  );
});
