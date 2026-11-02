import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoMovimentacaoEstoque } from '../../../../generated/prisma/enums';

/** Tipos que a equipe registra à mão; reserva e baixa só nascem dos comandos da OS. */
export const MANUAL_MOVEMENT_TYPES = [
  TipoMovimentacaoEstoque.ENTRADA,
  TipoMovimentacaoEstoque.SAIDA,
  TipoMovimentacaoEstoque.AJUSTE,
] as const;

export type ManualMovementType = (typeof MANUAL_MOVEMENT_TYPES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateStockMovementDto {
  @ApiProperty({
    enum: MANUAL_MOVEMENT_TYPES,
    description:
      'ENTRADA soma ao saldo; SAIDA subtrai do disponível; AJUSTE define o novo saldo físico (contagem de inventário)',
  })
  @IsIn(MANUAL_MOVEMENT_TYPES)
  readonly movimentacaoTipo: ManualMovementType;

  @ApiProperty({
    example: 5,
    description:
      'Quantidade (até 3 casas). Em ENTRADA/SAIDA deve ser > 0; em AJUSTE é o novo saldo (>= 0)',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999_999_999.999)
  readonly movimentacaoQuantidade: number;

  @ApiProperty({
    required: false,
    example: 'Compra do fornecedor X',
    description: 'Obrigatório no AJUSTE',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly movimentacaoMotivo?: string;
}
