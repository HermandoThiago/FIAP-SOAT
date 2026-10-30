import { Exclude } from 'class-transformer';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../../../generated/prisma/client';

export class ServiceOrder implements OrdemServico {
  ordemServicoId: string;
  ordemServicoNumero: bigint;
  veiculoId: string;

  ordemServicoStatus: StatusOrdemServico;
  ordemServicoDescricaoProblema: string | null;
  ordemServicoDiagnostico: string | null;
  ordemServicoKmEntrada: number | null;
  ordemServicoMotivoCancelamento: string | null;
  ordemServicoCriadaEm: Date;
  ordemServicoAtualizadaEm: Date;

  @Exclude()
  usuarioId: string;

  @Exclude()
  atendenteId: string;

  @Exclude()
  mecanicoId: string;
}
