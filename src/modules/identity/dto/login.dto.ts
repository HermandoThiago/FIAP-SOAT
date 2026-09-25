import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Entrada de POST /auth/login (contrato-api.md §3.1; RF-060). Validação sintática; mensagens em português (ADR-013).
export class LoginDto {
  @ApiProperty({ example: 'manager@oficina.local', maxLength: 254 })
  @IsEmail({}, { message: 'e-mail inválido' })
  email!: string;

  @ApiProperty({ example: 'change-me-manager', format: 'password' })
  @IsString({ message: 'senha obrigatória' })
  @IsNotEmpty({ message: 'senha obrigatória' })
  password!: string;
}
