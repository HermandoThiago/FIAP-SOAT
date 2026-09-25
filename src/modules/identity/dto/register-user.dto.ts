import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsByteLength,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateBy,
  type ValidationArguments,
} from 'class-validator';

import { Role } from '../../../shared/domain/role';
import { USER_NAME_MAX_LENGTH } from '../domain/user';

const NAME_REQUIRED = 'nome obrigatório';
const NAME_TOO_LONG = `nome deve ter no máximo ${USER_NAME_MAX_LENGTH} caracteres`;

/**
 * Tamanho máximo do nome sem duplicar o erro de ausência: os validadores de string do class-validator (MaxLength etc.)
 * também falham quando o valor não é string, e um nome ausente devolveria "nome obrigatório" E a mensagem de tamanho.
 * Aqui `undefined`/`null` passam (é o IsNotEmpty que os aponta), string longa recebe a mensagem de tamanho e outro tipo
 * (número, objeto) a de "obrigatório" — a mesma que o agregado usa (User.register).
 */
function IsNameWithinLength(max: number): PropertyDecorator {
  return ValidateBy({
    name: 'isNameWithinLength',
    constraints: [max],
    validator: {
      validate: (value: unknown) =>
        value === undefined || value === null || (typeof value === 'string' && value.length <= max),
      defaultMessage: (args: ValidationArguments) => (typeof args.value === 'string' ? NAME_TOO_LONG : NAME_REQUIRED),
    },
  });
}

// Entrada de POST /users (contrato-api.md §3.1; RF-064; ADR-011). Validação sintática; as invariantes (CUSTOMER
// exclusivo, customerId se e só se CUSTOMER, nome não vazio) ficam no agregado User. Senha entre 8 caracteres e
// 72 BYTES (o bcrypt ignora o que passa de 72 bytes — PRD-005 RN-060).
export class RegisterUserDto {
  @ApiProperty({ example: 'Mecânico da oficina', maxLength: USER_NAME_MAX_LENGTH })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: NAME_REQUIRED })
  @IsNameWithinLength(USER_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: 'mechanic@oficina.local', maxLength: 254 })
  @IsEmail({}, { message: 'e-mail inválido' })
  email!: string;

  @ApiProperty({
    example: 'change-me-demo',
    format: 'password',
    minLength: 8,
    maxLength: 72,
    description: 'Entre 8 caracteres e 72 bytes (limite do bcrypt)',
  })
  @IsString({ message: 'senha obrigatória' })
  @MinLength(8, { message: 'senha deve ter ao menos 8 caracteres' })
  @IsByteLength(0, 72, { message: 'senha deve ter no máximo 72 bytes' })
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
