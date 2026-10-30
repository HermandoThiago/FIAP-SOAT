import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateServiceOrderDto {
  @ApiProperty({ required: true, readOnly: true })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  readonly clientId: string;

  @ApiProperty({ required: true, readOnly: true })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  readonly veiculoId: string;

  @ApiProperty({ required: true, readOnly: true })
  @IsString()
  @IsOptional()
  readonly ordemServicoDescricaoProblema?: string;

  @ApiProperty({ required: true, readOnly: true })
  @IsNumber()
  @IsInt()
  @IsOptional()
  readonly ordemServicoKmEntrada?: number;
}
