import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Esquema OpenAPI do erro único da API — RFC 9457 Problem Details (contrato-api.md §5; ADR-005). Espelha a interface
// `ProblemDetails` de shared/http; quando os demais módulos documentarem seus erros, mover para shared/http.
export class FieldErrorDto {
  @ApiProperty({ example: 'email' })
  field!: string;

  @ApiProperty({ example: 'e-mail inválido' })
  message!: string;
}

export class ProblemDetailsDto {
  @ApiProperty({ example: 'https://oficina.local/errors/unauthorized' })
  type!: string;

  @ApiProperty({ example: 'Não autenticado' })
  title!: string;

  @ApiProperty({ example: 401 })
  status!: number;

  @ApiPropertyOptional({ example: 'E-mail ou senha inválidos' })
  detail?: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  instance!: string;

  @ApiPropertyOptional({ type: [FieldErrorDto], description: 'Só em 422 de validação' })
  errors?: FieldErrorDto[];

  @ApiPropertyOptional({ example: '3f9d2c1e-8b4a-4d6f-9c0e-1a2b3c4d5e6f' })
  requestId?: string;
}
