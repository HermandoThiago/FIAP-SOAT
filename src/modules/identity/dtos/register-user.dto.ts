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
import { TipoDocumentoUsuario } from '../../../generated/prisma/enums';

const documentTypes = Object.values(TipoDocumentoUsuario);

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

  @ApiProperty({ enum: documentTypes })
  @MaxLength(4)
  @IsIn(documentTypes)
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
  readonly password: string;

  @ApiProperty()
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  readonly perfilId: string;
}
