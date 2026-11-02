import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiUnprocessableEntityResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { ItemService, StockService } from '../services';
import {
  CreateItemEstoqueDto,
  CreateStockMovementDto,
  ListItensQueryDto,
  ListStockMovementsQueryDto,
  UpdateItemDto,
} from './dtos';

@ApiTags('Itens')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.ATTENDANT)
@Controller('itens')
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly stockService: StockService,
  ) {}

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

  @ApiOperation({
    description:
      'Registra uma movimentação manual de estoque (ENTRADA, SAIDA ou AJUSTE) e devolve o novo saldo',
  })
  @ApiCreatedResponse({ description: 'Movimentação registrada' })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  @ApiUnprocessableEntityResponse({
    description:
      'Saldo insuficiente, ajuste abaixo do reservado ou sem motivo, ou quantidade inválida',
  })
  @HttpCode(201)
  @Post(':itemId/stock-movements')
  async registerMovement(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() payload: CreateStockMovementDto,
  ) {
    return await this.stockService.registerMovement(itemId, payload);
  }

  @ApiOperation({
    description:
      'Histórico de movimentações do item, da mais recente para a mais antiga (filtros: tipo e OS)',
  })
  @ApiNotFoundResponse({ description: 'Item não encontrado' })
  @ApiResponse({ status: 200, description: 'Histórico paginado' })
  @HttpCode(200)
  @Get(':itemId/stock-movements')
  async findMovements(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: ListStockMovementsQueryDto,
  ) {
    return await this.stockService.findMovements(itemId, query);
  }
}
