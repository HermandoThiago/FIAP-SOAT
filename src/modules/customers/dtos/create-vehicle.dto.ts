import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { normalizeLicensePlate } from '../domain/validators';
import {
  IsValidLicensePlate,
  IsValidVehicleYear,
} from './vehicle-validators.decorator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateVehicleDto {
  @ApiProperty({ description: 'Id do cliente (usuário com perfil Cliente)' })
  @IsUUID()
  @IsNotEmpty()
  readonly usuarioId: string;

  @ApiProperty({
    example: 'ABC1D23',
    description: 'Antiga ou Mercosul; hífen e minúsculas são normalizados',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeLicensePlate(value) : value,
  )
  @IsString()
  @IsValidLicensePlate()
  readonly veiculoPlaca: string;

  @ApiProperty({ required: false, example: '9BWZZZ377VT004251' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Length(17, 17, { message: 'O chassi deve ter 17 caracteres' })
  readonly veiculoChassi?: string;

  @ApiProperty({ example: 'Fiat' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  readonly veiculoMarca: string;

  @ApiProperty({ example: 'Argo' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  readonly veiculoModelo: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @IsValidVehicleYear()
  readonly veiculoAnoFabricacao: number;

  @ApiProperty({ example: 'Prata' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  readonly veiculoCor: string;

  @ApiProperty({ required: false, example: 35000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly veiculoKmAtual?: number;
}
