import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { CreateItemEstoqueDto } from './create-item.dto';

export class UpdateItemDto extends PartialType(CreateItemEstoqueDto) {
  @ApiProperty({ required: true, readOnly: true })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999_999_999.999)
  @IsNotEmpty()
  readonly itemEstoqueReservada: number;
}
