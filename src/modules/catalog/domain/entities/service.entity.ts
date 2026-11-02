import { Servico } from '../../../../generated/prisma/client';

export class Service implements Servico {
  servicoId: string;
  servicoNome: string;
  servicoDescricao: string | null;
  servicoPrecoBase: number; // Em centavos (ex.: 15000 = R$ 150,00)
  servicoAtivo: boolean;
  servicoCriadoEm: Date;
  servicoAtualizadoEm: Date;
}
