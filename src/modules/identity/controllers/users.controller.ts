import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListUsersQueryDto } from '../dtos';
import { UsersService } from '../services';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @ApiOperation({ description: 'Busca todos os usuários' })
  @ApiResponse({ status: 200 })
  @HttpCode(200)
  @Get()
  async findAllUsers(@Query() query: ListUsersQueryDto) {
    return await this.userService.findAll(query);
  }

  @ApiOperation({ description: 'Busca usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @HttpCode(200)
  @Get(':userId')
  async findUserById(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.userService.findUserById(userId);
  }
}
