import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TipoDocumentoUsuario } from '../../../generated/prisma/enums';
import { IsValidDocument } from '../../identity/dtos';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const onlyDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

export class CreateCustomerDto {
  @ApiProperty({ example: 'Maria da Silva' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly usuarioNome: string;

  @ApiProperty({ example: 'maria@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  readonly usuarioEmail: string;

  @ApiProperty({
    example: '52998224725',
    description: 'CPF ou CNPJ válido; a pontuação é ignorada. Imutável depois',
  })
  @Transform(onlyDigits)
  @IsString()
  @IsNotEmpty()
  @IsValidDocument()
  readonly usuarioDocumento: string;

  @ApiProperty({ enum: TipoDocumentoUsuario })
  @IsEnum(TipoDocumentoUsuario)
  readonly usuarioTipoDocumento: TipoDocumentoUsuario;

  @ApiProperty({ required: false, example: '85999990000' })
  @Transform(onlyDigits)
  @IsOptional()
  @Matches(/^\d{10,11}$/, {
    message: 'O telefone deve ter 10 ou 11 dígitos (DDD + número)',
  })
  readonly usuarioTelefone?: string;
}
