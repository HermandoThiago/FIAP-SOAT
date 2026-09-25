import { ApiProperty } from '@nestjs/swagger';

import { Role } from '../../../shared/domain/role';

// Saída de POST /auth/login (contrato-api.md §3.1): token de acesso HS256 (ADR-004) e os papéis do usuário.
export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT HS256 (aud=api)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.abc',
  })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer', enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Validade do token em segundos', example: 3600 })
  expiresIn!: number;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.MANAGER] })
  roles!: Role[];
}
