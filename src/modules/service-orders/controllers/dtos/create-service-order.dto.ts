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
import { IsValidDocument } from '../../../identity/dtos';

const onlyDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServiceOrderDto {
  @ApiProperty({
    required: false,
    description:
      'Id do cliente (usuário com perfil Cliente). Informe este campo ou `customerDocument`',
  })
  @IsOptional()
  @IsUUID()
  readonly clientId?: string;

  @ApiProperty({
    required: false,
    example: '52998224725',
    description:
      'CPF ou CNPJ do cliente (a pontuação é ignorada). Informe este campo ou `clientId`',
  })
  @Transform(onlyDigits)
  @IsOptional()
  @IsString()
  @IsValidDocument()
  readonly customerDocument?: string;

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
