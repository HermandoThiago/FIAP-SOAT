import { Decimal } from '@prisma/client/runtime/client';
import { Exclude, Type } from 'class-transformer';
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

  @Type(() => Number)
  itemEstoqueQuantidade: Decimal;

  @Type(() => Number)
  itemEstoqueReservada: Decimal;

  @Type(() => Number)
  itemEstoqueAtivo: boolean;

  @Exclude()
  itemEstoqueCriadoEm: Date;

  @Exclude()
  itemEstoqueAtualizadoEm: Date;
}
