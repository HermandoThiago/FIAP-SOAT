import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** O status não é editável aqui: ele muda só por comandos de negócio (ADR-010). */
export class UpdateServiceOrderDto {
  @ApiProperty({ required: false, description: 'Novo mecânico responsável' })
  @IsOptional()
  @IsUUID()
  readonly mecanicoId?: string;

  @ApiProperty({ required: false })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly ordemServicoDescricaoProblema?: string;

  @ApiProperty({ required: false })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly ordemServicoDiagnostico?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly ordemServicoKmEntrada?: number;
}
