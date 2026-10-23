import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Campos ausentes não mudam. `usuarioTelefone: null` remove o telefone.
 * O documento não pode ser alterado. A senha tem fluxo próprio.
 * `@ValidateIf(v !== undefined)` recusa `null` nos campos que não aceitam remoção.
 */
export class UpdateUserDto {
  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly usuarioNome?: string;

  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  @MaxLength(255)
  readonly usuarioEmail?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional() // pula a validação quando é null (remover) ou undefined (não alterar)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(/^\d{10,11}$/, {
    message: 'O telefone deve ter 10 ou 11 dígitos (DDD + número)',
  })
  readonly usuarioTelefone?: string | null;

  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  readonly perfilId?: string;
}
