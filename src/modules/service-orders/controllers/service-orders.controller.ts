import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { ServiceOrdersService } from '../services';
import {
  CancelServiceOrderDto,
  CreateServiceOrderDto,
  ListServiceOrdersQueryDto,
  UpdateServiceOrderDto,
} from './dtos';

@ApiTags('ServiceOrders')
@ApiBearerAuth()
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @ApiOperation({
    description:
      'Lista ordens de serviço (filtros: status, cliente, veículo e período)',
  })
  @ApiResponse({ status: 200, description: 'Busca realizada com sucesso' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get()
  async findAllServiceOrders(@Query() query: ListServiceOrdersQueryDto) {
    return await this.serviceOrdersService.findAll(query);
  }

  @ApiOperation({ description: 'Busca Ordem de Serviço pelo ID' })
  @ApiResponse({ status: 200, description: 'Busca realizada com sucesso' })
  @ApiNotFoundResponse({
    description: 'Ordem de serviço não encontrada (ou de outro cliente)',
  })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC, Role.CUSTOMER)
  @Get(':serviceOrderId')
  async findServiceOrderById(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.findServiceOrderById(serviceOrderId);
  }

  @ApiOperation({ description: 'Cria ordem de serviço (status RECEBIDA)' })
  @ApiCreatedResponse({ description: 'Ordem criada com sucesso' })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @ApiNotFoundResponse({
    description: 'Cliente, mecânico ou veículo não encontrado',
  })
  @ApiConflictResponse({
    description: 'Veículo de outro cliente ou com OS em aberto',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Cliente ou mecânico com perfil incorreto',
  })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Post()
  async createServiceOrder(@Body() payload: CreateServiceOrderDto) {
    return await this.serviceOrdersService.createServiceOrder(payload);
  }

  @ApiOperation({
    description:
      'Atualiza dados descritivos e o mecânico da OS (o status muda só por comandos)',
  })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Ordem de serviço encerrada' })
  @ApiResponse({
    status: 200,
    description: 'Ordem de serviço atualizada com sucesso',
  })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Put(':serviceOrderId')
  async updateServiceOrderById(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Body() payload: UpdateServiceOrderDto,
  ) {
    return await this.serviceOrdersService.updateServiceOrder(
      serviceOrderId,
      payload,
    );
  }

  @ApiOperation({
    description:
      'Cancela a OS (somente em RECEBIDA, EM_DIAGNOSTICO ou AGUARDANDO_APROVACAO)',
  })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Status não permite cancelamento' })
  @ApiResponse({ status: 200, description: 'Ordem cancelada' })
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @Post(':serviceOrderId/cancel')
  async cancelServiceOrderById(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Body() payload: CancelServiceOrderDto,
  ) {
    return await this.serviceOrdersService.cancelServiceOrder(
      serviceOrderId,
      payload,
    );
  }
}
