import { StatusOrdemServico as Status } from '../../../generated/prisma/enums';

/** Marcos da OS: quando cada etapa aconteceu (primeira vez em cada status), ou `null` se ainda não ocorreu. */
export interface Milestones {
  recebidaEm: Date | null;
  diagnosticoIniciadoEm: Date | null;
  orcamentoEnviadoEm: Date | null;
  orcamentoRespondidoEm: Date | null;
  execucaoIniciadaEm: Date | null;
  finalizadaEm: Date | null;
  entregueEm: Date | null;
  encerradaEm: Date | null;
}

const MILESTONE_BY_STATUS: Partial<Record<Status, keyof Milestones>> = {
  RECEBIDA: 'recebidaEm',
  EM_DIAGNOSTICO: 'diagnosticoIniciadoEm',
  AGUARDANDO_APROVACAO: 'orcamentoEnviadoEm',
  AGUARDANDO_EXECUCAO: 'orcamentoRespondidoEm', // aprovação
  ORCAMENTO_RECUSADO: 'orcamentoRespondidoEm', // recusa (terminal)
  EM_EXECUCAO: 'execucaoIniciadaEm',
  FINALIZADA: 'finalizadaEm',
  ENTREGUE: 'entregueEm',
};

const TERMINAL: Status[] = [
  Status.ENTREGUE,
  Status.ORCAMENTO_RECUSADO,
  Status.CANCELADA,
];

/** Deriva os marcos do histórico de status (append-only), que é a fonte da verdade das datas. */
export function buildMilestones(
  history: { historicoStatusNovo: Status; historicoCriadoEm: Date }[],
): Milestones {
  const milestones: Milestones = {
    recebidaEm: null,
    diagnosticoIniciadoEm: null,
    orcamentoEnviadoEm: null,
    orcamentoRespondidoEm: null,
    execucaoIniciadaEm: null,
    finalizadaEm: null,
    entregueEm: null,
    encerradaEm: null,
  };

  const ordered = [...history].sort(
    (a, b) => a.historicoCriadoEm.getTime() - b.historicoCriadoEm.getTime(),
  );
  for (const {
    historicoStatusNovo: status,
    historicoCriadoEm: at,
  } of ordered) {
    const key = MILESTONE_BY_STATUS[status];
    if (key && milestones[key] === null) milestones[key] = at;
    if (TERMINAL.includes(status) && milestones.encerradaEm === null) {
      milestones.encerradaEm = at;
    }
  }
  return milestones;
}
