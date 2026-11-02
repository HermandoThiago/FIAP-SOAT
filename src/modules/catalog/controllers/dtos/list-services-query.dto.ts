import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListServicesQueryDto {
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

  /** Busca parcial pelo nome, sem diferenciar maiúsculas. */
  @ApiProperty({ required: false, example: 'óleo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly servicoNome?: string;

  /** `true` (padrão) lista os ativos; `false`, os inativos. */
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly servicoAtivo: boolean = true;
}
