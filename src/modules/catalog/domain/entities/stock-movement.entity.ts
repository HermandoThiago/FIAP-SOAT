import { Decimal } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import {
  MovimentacaoEstoque,
  TipoMovimentacaoEstoque,
} from '../../../../generated/prisma/client';

export class StockMovement implements MovimentacaoEstoque {
  movimentacaoId: string;
  itemEstoqueId: string;
  ordemServicoId: string | null;
  usuarioId: string;
  movimentacaoTipo: TipoMovimentacaoEstoque;

  @Type(() => Number)
  movimentacaoQuantidade: Decimal;

  movimentacaoMotivo: string | null;
  movimentacaoCriadaEm: Date;
}
