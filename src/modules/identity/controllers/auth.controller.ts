import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public, Role, Roles } from '../auth';
import { LoginDto, RefreshTokenDto, RegisterUserDto } from '../dtos';
import { AuthService } from '../services';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ description: 'Cria um novo usuário (somente Admin)' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @ApiBearerAuth()
  @Post('register')
  async register(@Body() payload: RegisterUserDto) {
    return await this.authService.register(payload);
  }

  @ApiOperation({
    description: 'Efetua login e retorna access + refresh token',
  })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha incorretos' })
  @HttpCode(200)
  @Public()
  @Post('login')
  async login(@Body() payload: LoginDto) {
    return await this.authService.login(payload);
  }

  @ApiOperation({
    description: 'Troca um refresh token por um novo par de tokens',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido ou expirado',
  })
  @HttpCode(200)
  @ApiBearerAuth()
  @Post('refresh')
  async refresh(@Body() { refreshToken }: RefreshTokenDto) {
    return await this.authService.refresh(refreshToken);
  }

  @ApiOperation({ description: 'Encerra a sessão (revoga o refresh token)' })
  @HttpCode(204)
  @ApiBearerAuth()
  @Post('logout')
  async logout(@Body() { refreshToken }: RefreshTokenDto) {
    await this.authService.logout(refreshToken);
  }
}
