import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from '../dtos';
import { VehiclesService } from '../services';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ description: 'Cadastra um veículo vinculado a um cliente' })
  @ApiResponse({ status: 201, description: 'Veículo criado' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({ description: 'Placa ou chassi já cadastrado' })
  @HttpCode(201)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Post()
  async createVehicle(@Body() payload: CreateVehicleDto) {
    return await this.vehiclesService.createVehicle(payload);
  }

  @ApiOperation({
    description: 'Lista veículos ativos (filtros: cliente e placa)',
  })
  @ApiResponse({ status: 200, description: 'Busca bem sucedida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get()
  async findAllVehicles(@Query() query: ListVehiclesQueryDto) {
    return await this.vehiclesService.findAll(query);
  }

  @ApiOperation({ description: 'Busca veículo pelo ID' })
  @ApiResponse({ status: 200, description: 'Veículo encontrado' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get(':vehicleId')
  async findVehicleById(@Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return await this.vehiclesService.findVehicleById(vehicleId);
  }

  @ApiOperation({
    description: 'Atualiza dados do veículo (placa: somente Admin)',
  })
  @ApiResponse({ status: 200, description: 'Veículo atualizado' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  @ApiForbiddenResponse({ description: 'Alteração de placa sem ser Admin' })
  @ApiConflictResponse({ description: 'Placa ou chassi já cadastrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT)
  @Patch(':vehicleId')
  async updateVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() payload: UpdateVehicleDto,
  ) {
    return await this.vehiclesService.updateVehicle(vehicleId, payload);
  }

  @ApiOperation({ description: 'Inativa o veículo pelo ID' })
  @ApiNoContentResponse({ description: 'Veículo inativado com sucesso' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  @ApiConflictResponse({ description: 'Veículo com OS em aberto' })
  @HttpCode(204)
  @Roles(Role.ADMIN)
  @Delete(':vehicleId')
  async deleteVehicleById(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    await this.vehiclesService.deleteVehicle(vehicleId);
  }
}
