import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class AddServiceItemDto {
  @ApiProperty({ description: 'Id do serviço (Servico) ativo do catálogo' })
  @IsUUID()
  @IsNotEmpty()
  readonly servicoId: string;

  @ApiProperty({ example: 1, description: 'Quantidade inteira >= 1' })
  @IsInt()
  @Min(1)
  @Max(1000)
  readonly osServicoQuantidade: number;
}
