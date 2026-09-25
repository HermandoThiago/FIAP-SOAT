import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Role } from '../../../shared/domain/role';
import { USER_NAME_MAX_LENGTH } from '../domain/user';

// Entrada de POST /users (contrato-api.md §3.1; RF-064; ADR-011). Validação sintática; as invariantes (CUSTOMER
// exclusivo, customerId se e só se CUSTOMER) ficam no agregado User. Senha entre 8 e 72 caracteres (limite do bcrypt).
export class RegisterUserDto {
  @ApiProperty({ example: 'Mecânico da oficina', maxLength: USER_NAME_MAX_LENGTH })
  @IsString({ message: 'nome obrigatório' })
  @MaxLength(USER_NAME_MAX_LENGTH, { message: `nome deve ter no máximo ${USER_NAME_MAX_LENGTH} caracteres` })
  name!: string;

  @ApiProperty({ example: 'mechanic@oficina.local', maxLength: 254 })
  @IsEmail({}, { message: 'e-mail inválido' })
  email!: string;

  @ApiProperty({ example: 'change-me-demo', format: 'password', minLength: 8, maxLength: 72 })
  @IsString({ message: 'senha obrigatória' })
  @MinLength(8, { message: 'senha deve ter ao menos 8 caracteres' })
  @MaxLength(72, { message: 'senha deve ter no máximo 72 caracteres' })
  password!: string;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.MECHANIC] })
  @IsArray({ message: 'informe ao menos um papel' })
  @ArrayNotEmpty({ message: 'informe ao menos um papel' })
  @IsEnum(Role, { each: true, message: 'papel inválido' })
  roles!: Role[];

  @ApiPropertyOptional({
    description: 'Cliente do cadastro; obrigatório se, e só se, roles = ["CUSTOMER"] (ADR-011)',
    example: 'c719b4b1-df0d-4057-a9dd-5b8f9be2898b',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'customerId inválido' })
  customerId?: string;
}
