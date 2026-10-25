import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../auth';
import { ListUsersQueryDto, UpdateUserDto } from '../dtos';
import { UsersService } from '../services';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @ApiOperation({ description: 'Busca todos os usuários' })
  @ApiResponse({ status: 200, description: 'Busca bem sucedida' })
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @HttpCode(200)
  @Get()
  async findAllUsers(@Query() query: ListUsersQueryDto) {
    return await this.userService.findAll(query);
  }

  @ApiOperation({ description: 'Busca usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Get(':userId')
  async findUserById(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.userService.findUserById(userId);
  }

  @ApiOperation({ description: 'Deleta usuário pelo ID' })
  @ApiNoContentResponse({ description: 'Usuário deletado com sucesso' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @HttpCode(204)
  @Roles(Role.ADMIN)
  @Delete(':userId')
  async deleteUserById(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.userService.deleteUser(userId);
  }

  @ApiOperation({ description: 'Atualiza informaçoes do usuário' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @HttpCode(201)
  @Patch(':userId')
  async updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() payload: UpdateUserDto,
  ) {
    return this.userService.updateUser(userId, payload);
  }
}
