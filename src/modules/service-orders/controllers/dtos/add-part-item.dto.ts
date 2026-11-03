import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class AddPartItemDto {
  @ApiProperty({ description: 'Id da peça ou insumo (ItemEstoque) ativo' })
  @IsUUID()
  @IsNotEmpty()
  readonly itemEstoqueId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantidade > 0, até 3 casas decimais',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  readonly osItemQuantidade: number;
}
