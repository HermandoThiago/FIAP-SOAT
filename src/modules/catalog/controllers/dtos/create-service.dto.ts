import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServiceDto {
  @ApiProperty({ example: 'Troca de óleo' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly servicoNome: string;

  @ApiProperty({ required: false, example: 'Troca de óleo e filtro do motor' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly servicoDescricao?: string;

  @ApiProperty({
    example: 15000,
    description: 'Preço em centavos (15000 = R$ 150,00)',
  })
  @IsInt({ message: 'O preço deve ser um número inteiro em centavos' })
  @Min(0)
  @Max(100_000_000) // R$ 1.000.000,00
  readonly servicoPrecoBase: number;
}
