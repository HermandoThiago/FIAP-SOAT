import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { Public } from '../../../shared/auth/public.decorator';
import { LoginDto } from '../dto/login.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { ProblemDetailsDto } from '../dto/problem-details.dto';
import { AuthService } from '../services/auth.service';

// POST /auth/login — pública (allowlist — ADR-004; RF-060/RF-067). Equipe e cliente (papel CUSTOMER — ADR-011) usam
// o mesmo login.
@ApiTags('identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login (equipe ou cliente)',
    description:
      'E-mail + senha → JWT HS256 (`aud=api`, 60 min) com `sub`, `roles` e, para CUSTOMER, `customerId` (ADR-004/011). ' +
      'Credenciais erradas devolvem sempre o mesmo 401, sem indicar se o e-mail existe.',
  })
  @ApiOkResponse({
    description: 'Token de acesso emitido, com a validade em segundos e os papéis',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'E-mail ou senha inválidos (mensagem genérica)',
    type: ProblemDetailsDto,
    example: {
      type: 'https://oficina.local/errors/unauthorized',
      title: 'Não autenticado',
      status: 401,
      detail: 'E-mail ou senha inválidos',
      instance: '/api/v1/auth/login',
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Payload inválido (errors[].field)',
    type: ProblemDetailsDto,
    example: {
      type: 'https://oficina.local/errors/validation',
      title: 'Dados inválidos',
      status: 422,
      detail: 'Dados inválidos',
      instance: '/api/v1/auth/login',
      errors: [{ field: 'email', message: 'e-mail inválido' }],
    },
  })
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    const result = await this.authService.login(body.email, body.password);
    return { accessToken: result.accessToken, tokenType: 'Bearer', expiresIn: result.expiresIn, roles: result.roles };
  }
}
