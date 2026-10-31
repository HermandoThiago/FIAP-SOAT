import { Transform } from 'class-transformer';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../../../generated/prisma/client';

// `ordemServicoNumero` vira string na resposta: JSON não serializa BigInt.
export class ServiceOrder implements Omit<OrdemServico, 'ordemServicoNumero'> {
  ordemServicoId: string;

  @Transform(({ value }: { value: unknown }) => String(value))
  ordemServicoNumero: string;

  usuarioId: string;
  veiculoId: string;
  atendenteId: string;
  mecanicoId: string;

  ordemServicoStatus: StatusOrdemServico;
  ordemServicoDescricaoProblema: string | null;
  ordemServicoDiagnostico: string | null;
  ordemServicoKmEntrada: number | null;
  ordemServicoMotivoCancelamento: string | null;
  ordemServicoCriadaEm: Date;
  ordemServicoAtualizadaEm: Date;
}
