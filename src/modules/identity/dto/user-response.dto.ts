import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '../../../shared/domain/role';
import { type User } from '../domain/user';

// Representação `User` da API (contrato-api.md §3.1): nunca expõe passwordHash.
export class UserResponseDto {
  @ApiProperty({ format: 'uuid', example: 'cce771c5-f55c-4c38-a8c4-43c462c98350' })
  id!: string;

  @ApiProperty({ example: 'Mecânico da oficina' })
  name!: string;

  @ApiProperty({ example: 'mechanic@oficina.local' })
  email!: string;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.MECHANIC] })
  roles!: Role[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Só para o papel CUSTOMER (ADR-011)' })
  customerId?: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  createdAt!: string;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email.value;
    dto.roles = user.roles;
    if (user.customerId !== undefined) {
      dto.customerId = user.customerId;
    }
    dto.active = user.active;
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}
