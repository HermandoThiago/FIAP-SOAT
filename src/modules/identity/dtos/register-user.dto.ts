import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoDocumentoUsuario } from '../../../generated/prisma/enums';
import { IsValidDocument } from './is-valid-document.decorator';

// const documentTypes = Object.values(TipoDocumentoUsuario);

export class RegisterUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly usuarioNome: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  readonly usuarioEmail: string;

  @ApiProperty({ description: 'CPF ou CNPJ; pontuação é ignorada' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @IsNotEmpty()
  @IsValidDocument()
  readonly usuarioDocumento: string;

  @ApiProperty({ enum: TipoDocumentoUsuario })
  @MaxLength(4)
  @IsEnum(TipoDocumentoUsuario)
  readonly usuarioTipoDocumento: TipoDocumentoUsuario;

  @ApiProperty()
  @IsString()
  @MaxLength(11, {
    message: 'O número do telefone deve ter no máximo 11 caracteres',
  })
  @IsOptional()
  readonly usuarioTelefone: string;

  @ApiProperty()
  @IsString()
  @MinLength(12, { message: 'A senha deve ter no mínimo 12 caracteres' })
  readonly senha: string;

  @ApiProperty()
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  readonly perfilId: string;
}
