import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListCustomersQueryDto {
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

  /** Busca exata pelo CPF/CNPJ (a pontuação é ignorada). */
  @ApiProperty({ required: false, example: '52998224725' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  readonly usuarioDocumento?: string;

  /** Busca parcial pelo nome, sem diferenciar maiúsculas. */
  @ApiProperty({ required: false, example: 'maria' })
  @IsOptional()
  @IsString()
  readonly usuarioNome?: string;
}
