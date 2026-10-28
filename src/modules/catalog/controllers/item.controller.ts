import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { ItemService } from '../services';
import { CreateItemEstoqueDto, ListItensQueryDto, UpdateItemDto } from './dtos';

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
  async createItem(@Body() payload: CreateItemEstoqueDto) {
    return await this.itemService.createItem(payload);
  }

  @ApiOperation({ description: 'Busca todos os itens cadastrados' })
  @ApiResponse({ status: 200, description: 'Busca Realizada com sucesso' })
  @Get()
  async findAll(@Query() query: ListItensQueryDto) {
    return await this.itemService.findAllItens(query);
  }

  @ApiOperation({ description: 'Busca um item por ID' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  @ApiResponse({ status: 200, description: 'Item encontrado com sucesso' })
  @Get(':itemId')
  async findItem(@Param('itemId') itemId: string) {
    return await this.itemService.findItemById(itemId);
  }

  @ApiOperation({ description: 'Atualiza o item pelo ID' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  @ApiNoContentResponse({ description: 'Item atualizado com sucesso' })
  @HttpCode(204)
  @Put(':itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() payload: UpdateItemDto,
  ) {
    return await this.itemService.updateItem(itemId, payload);
  }

  @ApiOperation({ description: 'Delete item pelo ID' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  @ApiResponse({ status: 200, description: 'Item deletado com sucesso' })
  @Delete(':itemId')
  async deleteItem(@Param('itemId') itemId: string) {
    return await this.itemService.deleteById(itemId);
  }
}
