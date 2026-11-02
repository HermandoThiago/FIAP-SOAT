import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TipoMovimentacaoEstoque } from '../../../../generated/prisma/enums';

export class ListStockMovementsQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize: number = 20;

  @ApiProperty({ required: false, enum: TipoMovimentacaoEstoque })
  @IsOptional()
  @IsEnum(TipoMovimentacaoEstoque)
  readonly movimentacaoTipo?: TipoMovimentacaoEstoque;

  @ApiProperty({ required: false, description: 'Só as movimentações desta OS' })
  @IsOptional()
  @IsUUID()
  readonly ordemServicoId?: string;
}
