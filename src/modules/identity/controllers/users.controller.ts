import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';

import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { type AuthenticatedUser } from '../../../shared/auth/principal';
import { Roles } from '../../../shared/auth/roles.decorator';
import { Role } from '../../../shared/domain/role';
import { ProblemDetailsDto } from '../dto/problem-details.dto';
import { RegisterUserDto } from '../dto/register-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UsersService } from '../services/users.service';

const USERS_INSTANCE = '/api/v1/users';

function problemExample(status: number, type: string, title: string, detail: string): Record<string, unknown> {
  return { type: `https://oficina.local/errors/${type}`, title, status, detail, instance: USERS_INSTANCE };
}

// POST /users (contrato-api.md §3.1; RF-064; ADR-011): ATTENDANT e MANAGER chegam ao handler; a regra fina
// (equipe só por MANAGER; CUSTOMER por ATTENDANT ou MANAGER) fica no UsersService.
@ApiTags('identity')
@ApiBearerAuth('bearerAuth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ATTENDANT, Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastrar usuário (equipe ou acesso do cliente)',
    description:
      'Equipe (`ATTENDANT`, `MECHANIC`, `MANAGER`): só MANAGER. Acesso do cliente (`roles: ["CUSTOMER"]` + `customerId` ' +
      'de um cliente ativo): ATTENDANT ou MANAGER (ADR-011).',
  })
  @ApiCreatedResponse({
    description: 'Usuário criado (sem passwordHash); Location aponta para o recurso',
    type: UserResponseDto,
    headers: { Location: { description: 'URL do usuário criado', schema: { type: 'string' } } },
  })
  @ApiUnauthorizedResponse({
    description: 'Sem token, inválido, expirado ou de outra audiência (token de acompanhamento)',
    type: ProblemDetailsDto,
    example: problemExample(401, 'unauthorized', 'Não autenticado', 'Token inválido ou expirado'),
  })
  @ApiForbiddenResponse({
    description: 'Papel insuficiente (MECHANIC; ATTENDANT criando equipe; CUSTOMER em rota administrativa)',
    type: ProblemDetailsDto,
    example: problemExample(403, 'forbidden', 'Acesso negado', 'Apenas MANAGER pode criar usuários da equipe'),
  })
  @ApiNotFoundResponse({
    description: 'Cliente inexistente ou inativo (customerId)',
    type: ProblemDetailsDto,
    example: problemExample(404, 'not-found', 'Recurso não encontrado', 'Cliente não encontrado'),
  })
  @ApiConflictResponse({
    description: 'E-mail já cadastrado ou cliente já possui usuário de acesso',
    type: ProblemDetailsDto,
    example: problemExample(409, 'conflict', 'Conflito', 'E-mail já cadastrado'),
  })
  @ApiUnprocessableEntityResponse({
    description: 'Payload inválido ou invariante do usuário violada (errors[].field)',
    type: ProblemDetailsDto,
    example: {
      ...problemExample(422, 'validation', 'Dados inválidos', 'Dados inválidos'),
      errors: [{ field: 'customerId', message: 'customerId é obrigatório para o papel CUSTOMER' }],
    },
  })
  async register(
    @Body() body: RegisterUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.register(body, actor);
    // contrato-api.md §2: 201 + Location (/api/v1/users/{id}); request.path já inclui o prefixo global.
    response.setHeader('Location', `${request.path}/${user.id}`);
    return UserResponseDto.fromDomain(user);
  }
}
