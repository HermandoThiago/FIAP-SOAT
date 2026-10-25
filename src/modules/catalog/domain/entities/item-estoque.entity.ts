import { Decimal } from '@prisma/client/runtime/client';
import { Exclude } from 'class-transformer';
import {
  ItemEstoque as ItemEstoquePrisma,
  TipoItemEstoque,
  UnidadeMedida,
} from '../../../../generated/prisma/client';

export class ItemEstoque implements ItemEstoquePrisma {
  itemEstoqueId: string;
  itemEstoqueTipo: TipoItemEstoque;
  itemEstoqueCodigo: string;
  itemEstoqueNome: string;
  itemEstoqueDescricao: string | null;
  itemEstoqueUnidade: UnidadeMedida;
  itemEstoquePrecoVenda: number;
  itemEstoqueQuantidade: Decimal;
  itemEstoqueReservada: Decimal;
  itemEstoqueAtivo: boolean;

  @Exclude()
  itemEstoqueCriadoEm: Date;

  @Exclude()
  itemEstoqueAtualizadoEm: Date;
}
