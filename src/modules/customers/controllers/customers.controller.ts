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
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  ListVehiclesQueryDto,
  UpdateCustomerDto,
} from '../dtos';
import { CustomersService, VehiclesService } from '../services';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  @ApiOperation({ description: 'Cadastra um cliente (CPF ou CNPJ)' })
  @ApiResponse({ status: 201, description: 'Cliente criado' })
  @ApiConflictResponse({ description: 'E-mail ou documento já cadastrado' })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Post()
  async createCustomer(@Body() payload: CreateCustomerDto) {
    return await this.customersService.createCustomer(payload);
  }

  @ApiOperation({
    description: 'Lista clientes ativos (filtros: documento e nome)',
  })
  @ApiResponse({ status: 200, description: 'Busca bem sucedida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get()
  async findAllCustomers(@Query() query: ListCustomersQueryDto) {
    return await this.customersService.findAll(query);
  }

  @ApiOperation({ description: 'Busca cliente pelo ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get(':customerId')
  async findCustomerById(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return await this.customersService.findCustomerById(customerId);
  }

  @ApiOperation({
    description: 'Atualiza nome, e-mail ou telefone (o documento é imutável)',
  })
  @ApiResponse({ status: 200, description: 'Cliente atualizado' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Put(':customerId')
  async updateCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() payload: UpdateCustomerDto,
  ) {
    return await this.customersService.updateCustomer(customerId, payload);
  }

  @ApiOperation({ description: 'Inativa o cliente (exclusão lógica)' })
  @ApiNoContentResponse({ description: 'Cliente inativado com sucesso' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Cliente com OS em aberto' })
  @HttpCode(204)
  @Roles(Role.ADMIN)
  @Delete(':customerId')
  async deleteCustomer(@Param('customerId', ParseUUIDPipe) customerId: string) {
    await this.customersService.deleteCustomer(customerId);
  }

  @ApiOperation({ description: 'Lista os veículos ativos do cliente' })
  @ApiResponse({ status: 200, description: 'Busca bem sucedida' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get(':customerId/vehicles')
  async findCustomerVehicles(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: ListVehiclesQueryDto,
  ) {
    await this.customersService.findCustomerById(customerId);
    return await this.vehiclesService.findAll({
      ...query,
      usuarioId: customerId,
    });
  }
}
