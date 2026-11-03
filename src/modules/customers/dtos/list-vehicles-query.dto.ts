import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { normalizeLicensePlate } from '../domain/validators';

export class ListVehiclesQueryDto {
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

  /** Filtra pelos veículos de um cliente. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  readonly usuarioId?: string;

  /** Busca exata pela placa (normalizada). */
  @ApiProperty({ required: false, example: 'ABC1D23' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeLicensePlate(value) : value,
  )
  @IsString()
  readonly veiculoPlaca?: string;
}
