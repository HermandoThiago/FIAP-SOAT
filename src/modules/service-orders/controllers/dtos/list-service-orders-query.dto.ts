import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StatusOrdemServico } from '../../../../generated/prisma/enums';

export class ListServiceOrdersQueryDto {
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

  @ApiProperty({ required: false, enum: StatusOrdemServico })
  @IsOptional()
  @IsEnum(StatusOrdemServico)
  readonly status?: StatusOrdemServico;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  readonly clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  readonly veiculoId?: string;

  @ApiProperty({
    required: false,
    description: 'Criadas a partir de (ISO-8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly from?: Date;

  @ApiProperty({ required: false, description: 'Criadas até (ISO-8601)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly to?: Date;
}
