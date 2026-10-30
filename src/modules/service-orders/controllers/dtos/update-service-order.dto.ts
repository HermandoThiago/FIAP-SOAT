import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusOrdemServico } from '../../../../generated/prisma/enums';
import { CreateServiceOrderDto } from './create-service-order.dto';

export class UpdateServiceOrder extends PartialType(CreateServiceOrderDto) {
  @ApiProperty()
  @IsEnum(StatusOrdemServico)
  @IsOptional()
  private ordemServicoStatus?: StatusOrdemServico;

  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly ordemServicoMotivoCancelamento?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly ordemServicoDiagnostico?: string;
}
