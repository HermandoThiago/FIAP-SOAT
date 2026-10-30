import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { ServiceOrderService } from '../services';

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
  @Get(':serviceOrderId')
  async findServiceOrderById(
    @Param('serviceOrderId', ParseUUIDPipe) serviceOrderId: string,
  ) {}

  @ApiOperation({ description: 'Cancela uma ordem pelo ID' })
  @ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada' })
  @ApiNoContentResponse({ description: 'Ordem cancelada' })
  @Delete(':serviceOrderId')
  async cancelledOrderById(
    @Param('serviceOrderById', ParseUUIDPipe) serviceOrderById: string,
  ) {}
}
