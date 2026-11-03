import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TipoItemEstoque,
  UnidadeMedida,
} from '../../../../generated/prisma/enums';

export class CreateItemEstoqueDto {
  @ApiProperty({ enum: TipoItemEstoque, example: TipoItemEstoque.PECA })
  @IsEnum(TipoItemEstoque)
  readonly itemEstoqueTipo: TipoItemEstoque;

  @ApiProperty({ example: 'Filtro de óleo' })
  @IsString()
  @MaxLength(120)
  @IsNotEmpty()
  readonly itemEstoqueNome: string;

  @ApiProperty({ required: false, example: 'Filtro de óleo do motor' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  readonly itemEstoqueDescricao: string;

  @ApiProperty({ enum: UnidadeMedida, example: UnidadeMedida.UN })
  @IsEnum(UnidadeMedida)
  readonly itemEstoqueUnidade: UnidadeMedida;

  @ApiProperty({ description: 'Preço de venda em centavos', example: 4550 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  readonly itemEstoquePrecoVenda: number;

  @ApiProperty({ example: 10 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999_999_999.999)
  @IsNotEmpty()
  readonly itemEstoqueQuantidade: number;
}
