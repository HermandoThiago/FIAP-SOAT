import { OrdemServicoStatusHistorico } from '../../../../generated/prisma/client';

export class StatusHistoryEntry implements OrdemServicoStatusHistorico {
  historicoId: string;
  ordemServicoId: string;
  historicoStatusAnterior: OrdemServicoStatusHistorico['historicoStatusAnterior'];
  historicoStatusNovo: OrdemServicoStatusHistorico['historicoStatusNovo'];
  usuarioId: string | null;
  historicoObservacao: string | null;
  historicoCriadoEm: Date;
}
