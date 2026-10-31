import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServiceOrderDto {
  @ApiProperty({ description: 'Id do cliente (usuário com perfil Cliente)' })
  @IsUUID()
  @IsNotEmpty()
  readonly clientId: string;

  @ApiProperty({ description: 'Id do veículo (deve pertencer ao cliente)' })
  @IsUUID()
  @IsNotEmpty()
  readonly veiculoId: string;

  @ApiProperty({ description: 'Id do mecânico responsável (perfil Mecânico)' })
  @IsUUID()
  @IsNotEmpty()
  readonly mecanicoId: string;

  @ApiProperty({ required: false, example: 'Barulho ao frear' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly ordemServicoDescricaoProblema?: string;

  @ApiProperty({ required: false, example: 35000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly ordemServicoKmEntrada?: number;
}
