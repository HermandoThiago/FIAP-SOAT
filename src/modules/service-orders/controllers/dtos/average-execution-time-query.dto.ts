import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class AverageExecutionTimeQueryDto {
  @ApiProperty({
    required: false,
    description: 'OS finalizadas a partir de (ISO-8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly from?: Date;

  @ApiProperty({
    required: false,
    description: 'OS finalizadas até (ISO-8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly to?: Date;

  @ApiProperty({
    required: false,
    description: 'Considera só as OS que contêm este serviço',
  })
  @IsOptional()
  @IsUUID()
  readonly serviceId?: string;
}
