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
import { ServiceOrderItemsService, ServiceOrdersService } from '../services';
import {
  AddPartItemDto,
  AddServiceItemDto,
  CancelServiceOrderDto,
  CreateServiceOrderDto,
  ListServiceOrdersQueryDto,
  UpdateServiceOrderDto,
} from './dtos';

@ApiTags('ServiceOrders')
@ApiBearerAuth()
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly itemsService: ServiceOrderItemsService,
  ) {}

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

  @ApiOperation({
    description:
      'Detalha a OS: cliente, veículo, mecânico, serviços, peças, orçamento e marcos (datas de cada etapa)',
  })
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
    return await this.serviceOrdersService.findServiceOrderDetail(
      serviceOrderId,
    );
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

  @ApiOperation({ description: 'Lista o histórico de status da OS' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiResponse({ status: 200, description: 'Histórico em ordem cronológica' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get(':serviceOrderId/status-history')
  async findStatusHistory(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.findStatusHistory(serviceOrderId);
  }

  @ApiOperation({
    description: 'Inicia o diagnóstico (RECEBIDA → EM_DIAGNOSTICO)',
  })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Transição de status inválida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':serviceOrderId/diagnosis')
  async startDiagnosis(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.startDiagnosis(serviceOrderId);
  }

  @ApiOperation({
    description: 'Inicia a execução (AGUARDANDO_EXECUCAO → EM_EXECUCAO)',
  })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Transição de status inválida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':serviceOrderId/start-execution')
  async startExecution(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.startExecution(serviceOrderId);
  }

  @ApiOperation({ description: 'Finaliza a OS (EM_EXECUCAO → FINALIZADA)' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Transição de status inválida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':serviceOrderId/complete')
  async completeServiceOrder(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.completeServiceOrder(serviceOrderId);
  }

  @ApiOperation({ description: 'Entrega o veículo (FINALIZADA → ENTREGUE)' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Transição de status inválida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Post(':serviceOrderId/deliver')
  async deliverServiceOrder(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.deliverServiceOrder(serviceOrderId);
  }

  @ApiOperation({
    description:
      'Inclui peça ou insumo na OS (RECEBIDA/EM_DIAGNOSTICO) e recalcula o orçamento',
  })
  @ApiCreatedResponse({ description: 'Item incluído; devolve o orçamento' })
  @ApiNotFoundResponse({ description: 'OS ou peça não encontrada' })
  @ApiConflictResponse({
    description: 'Status da OS não permite alterar itens',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Estoque insuficiente ou peça inativa',
  })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':serviceOrderId/items/parts')
  async addPartItem(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Body() payload: AddPartItemDto,
  ) {
    return await this.itemsService.addPartItem(serviceOrderId, payload);
  }

  @ApiOperation({
    description:
      'Inclui serviço do catálogo na OS (RECEBIDA/EM_DIAGNOSTICO) e recalcula o orçamento',
  })
  @ApiCreatedResponse({ description: 'Serviço incluído; devolve o orçamento' })
  @ApiNotFoundResponse({ description: 'OS ou serviço não encontrado' })
  @ApiConflictResponse({
    description: 'Status da OS não permite alterar itens',
  })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':serviceOrderId/items/services')
  async addServiceItem(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Body() payload: AddServiceItemDto,
  ) {
    return await this.itemsService.addServiceItem(serviceOrderId, payload);
  }

  @ApiOperation({
    description: 'Remove um serviço da OS e recalcula o orçamento',
  })
  @ApiNotFoundResponse({ description: 'OS ou serviço não encontrado na OS' })
  @ApiConflictResponse({
    description: 'Status da OS não permite alterar itens',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço removido; devolve o orçamento',
  })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Delete(':serviceOrderId/items/services/:osServicoId')
  async removeServiceItem(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Param('osServicoId', ParseUUIDPipe) osServicoId: string,
  ) {
    return await this.itemsService.removeServiceItem(
      serviceOrderId,
      osServicoId,
    );
  }

  @ApiOperation({ description: 'Remove um item da OS e recalcula o orçamento' })
  @ApiNotFoundResponse({ description: 'OS ou item não encontrado' })
  @ApiConflictResponse({
    description: 'Status da OS não permite alterar itens',
  })
  @ApiResponse({
    status: 200,
    description: 'Item removido; devolve o orçamento',
  })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Delete(':serviceOrderId/items/parts/:osItemId')
  async removePartItem(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
    @Param('osItemId', ParseUUIDPipe) osItemId: string,
  ) {
    return await this.itemsService.removePartItem(serviceOrderId, osItemId);
  }

  @ApiOperation({ description: 'Orçamento da OS, derivado dos itens' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiResponse({ status: 200, description: 'Orçamento atual' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get(':serviceOrderId/quote')
  async findQuote(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.itemsService.findQuote(serviceOrderId);
  }

  @ApiOperation({
    description:
      'Envia o orçamento ao cliente (EM_DIAGNOSTICO → AGUARDANDO_APROVACAO)',
  })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiConflictResponse({ description: 'Transição de status inválida' })
  @ApiUnprocessableEntityResponse({ description: 'Orçamento sem itens' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.MECHANIC)
  @Post(':serviceOrderId/quote/send')
  async sendQuote(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {
    return await this.serviceOrdersService.sendQuote(serviceOrderId);
  }
}
