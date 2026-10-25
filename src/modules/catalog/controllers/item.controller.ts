import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { ItemService } from '../services';
import { CreateItemEstoqueDto, ListItensQueryDto } from './dtos';

@ApiTags('Itens')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.ATTENDANT)
@Controller('itens')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @ApiOperation({ description: 'Cria um novo produto' })
  @ApiCreatedResponse({ description: 'Produto criado com sucesso' })
  @HttpCode(201)
  @Post()
  async createItem(@Body() payload: CreateItemEstoqueDto) {}

  @ApiOperation({ description: 'Busca todos os itens cadastrados' })
  @ApiResponse({ status: 200, description: 'Busca Realizada com sucesso' })
  @Get()
  async findAllItens(@Query() query: ListItensQueryDto) {}

  @ApiOperation({ description: 'Busca um item por ID' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  @ApiResponse({ status: 200, description: 'Item encontrado com sucesso' })
  @Get(':itemId')
  async findItemById(@Param('itemId') itemId: string) {}
}
