import { StatusOrdemServico as S } from '../../src/generated/prisma/enums';
import { buildMilestones } from '../../src/modules/service-orders/domain/milestones';

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 10, minute));
const entry = (status: S, minute: number) => ({
  historicoStatusNovo: status,
  historicoCriadoEm: at(minute),
});

describe('buildMilestones', () => {
  it('should return every milestone empty when the history is empty', () => {
    expect(Object.values(buildMilestones([]))).toEqual(Array(8).fill(null));
  });

  it('should map each status of the happy path to its milestone', () => {
    const milestones = buildMilestones([
      entry(S.RECEBIDA, 0),
      entry(S.EM_DIAGNOSTICO, 5),
      entry(S.AGUARDANDO_APROVACAO, 10),
      entry(S.AGUARDANDO_EXECUCAO, 15),
      entry(S.EM_EXECUCAO, 20),
      entry(S.FINALIZADA, 30),
      entry(S.ENTREGUE, 40),
    ]);

    expect(milestones).toEqual({
      recebidaEm: at(0),
      diagnosticoIniciadoEm: at(5),
      orcamentoEnviadoEm: at(10),
      orcamentoRespondidoEm: at(15),
      execucaoIniciadaEm: at(20),
      finalizadaEm: at(30),
      entregueEm: at(40),
      encerradaEm: at(40),
    });
  });

  it('should treat the refusal as the quote answer and as the end of the order', () => {
    const milestones = buildMilestones([
      entry(S.RECEBIDA, 0),
      entry(S.AGUARDANDO_APROVACAO, 10),
      entry(S.ORCAMENTO_RECUSADO, 12),
    ]);

    expect(milestones.orcamentoRespondidoEm).toEqual(at(12));
    expect(milestones.encerradaEm).toEqual(at(12));
    expect(milestones.execucaoIniciadaEm).toBeNull();
  });

  it('should set only the end of the order when it was cancelled', () => {
    const milestones = buildMilestones([
      entry(S.RECEBIDA, 0),
      entry(S.CANCELADA, 3),
    ]);

    expect(milestones.encerradaEm).toEqual(at(3));
    expect(milestones.entregueEm).toBeNull();
  });

  it('should not depend on the order of the entries and keep the first occurrence', () => {
    const milestones = buildMilestones([
      entry(S.EM_DIAGNOSTICO, 9),
      entry(S.RECEBIDA, 0),
      entry(S.EM_DIAGNOSTICO, 5),
    ]);

    expect(milestones.diagnosticoIniciadoEm).toEqual(at(5));
  });
});
