import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { db } from '../../../prisma/db';

const documentTypes = db.enums.public.TipoDocumentoUsuario;
type DocumentType = (typeof documentTypes)['values'][number];

export class RegisterUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly usuarioNome: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  readonly usuarioEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly usuarioDocumento: string;

  @ApiProperty({ enum: [...documentTypes.values] })
  @MaxLength(4)
  @IsIn(documentTypes.values)
  readonly usuarioTipoDocumento: DocumentType;

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
  readonly password: string;

  @ApiProperty()
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  readonly perfilId: string;
}
