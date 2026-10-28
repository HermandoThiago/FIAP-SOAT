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
  @ApiProperty({ required: true, readOnly: true })
  @IsEnum(TipoItemEstoque)
  readonly itemEstoqueTipo: TipoItemEstoque;

  @ApiProperty({ required: true, readOnly: true })
  @IsString()
  @MaxLength(120)
  @IsNotEmpty()
  readonly itemEstoqueNome: string;

  @ApiProperty({ required: true, readOnly: true })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  readonly itemEstoqueDescricao: string;

  @ApiProperty({ required: true, readOnly: true })
  @IsEnum(UnidadeMedida)
  readonly itemEstoqueUnidade: UnidadeMedida;

  @ApiProperty({ required: true, readOnly: true, example: 10.5 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  readonly itemEstoquePrecoVenda: number;

  @ApiProperty({ required: true, readOnly: true })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999_999_999.999)
  @IsNotEmpty()
  readonly itemEstoqueQuantidade: number;
}
