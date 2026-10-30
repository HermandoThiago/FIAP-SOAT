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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { ServiceOrderService } from '../services';
import { CreateServiceOrderDto, UpdateServiceOrder } from './dtos';

@ApiTags('ServiceOrders')
@ApiBearerAuth()
@Controller('service-orders')
export class ServiceOrders {
  constructor(private readonly serviceOrderService: ServiceOrderService) {}

  @ApiOperation({ description: 'Busca todas as ordens de serviço cadastradas' })
  @ApiResponse({ status: 200, description: 'Busca realizada com sucesso' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get()
  async findAllServiceOrders() {}

  @ApiOperation({ description: 'Busca Ordem de Serviço pelo ID' })
  @ApiResponse({ status: 200, description: 'Busca realizada com sucesso' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC, Role.CUSTOMER)
  @Get(':serviceOrderId')
  async findServiceOrderById(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {}

  @ApiOperation({ description: 'Cria ordem de serviço' })
  @ApiCreatedResponse({ description: 'Ordem criada com sucesso' })
  @ApiBadRequestResponse({ description: 'Ordem criada com dados incorretos' })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Post()
  async createServiceOrder(@Body() payload: CreateServiceOrderDto) {}

  @ApiOperation({ description: 'Atualiza dados da ordem pelo ID' })
  @ApiNotFoundResponse({ description: 'Ordem se serviço não encontrada' })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço atualizada com sucesso',
  })
  @Put(':serviceOrderId')
  async updateServiceOrderById(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Body() payload: UpdateServiceOrder,
  ) {}

  @ApiOperation({ description: 'Cancela uma ordem pelo ID' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiNoContentResponse({ description: 'Ordem cancelada' })
  @Delete(':serviceOrderId')
  async cancelledOrderById(
    @Param('serviceOrderById', ParseUUIDPipe) serviceOrderById: string,
  ) {}
}
