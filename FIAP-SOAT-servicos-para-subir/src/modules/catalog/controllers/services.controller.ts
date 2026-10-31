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
import { CatalogService } from '../services/catalog.service';
import { CreateServiceDto } from './dtos/create-service.dto';
import { ListServicesQueryDto } from './dtos/list-services-query.dto';
import { UpdateServiceDto } from './dtos/update-service.dto';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly catalogService: CatalogService) {}

  @ApiOperation({ description: 'Cadastra um serviço da oficina' })
  @ApiResponse({ status: 201, description: 'Serviço criado' })
  @ApiConflictResponse({ description: 'Já existe um serviço com esse nome' })
  @HttpCode(201)
  @Roles(Role.ADMIN)
  @Post()
  async createService(@Body() payload: CreateServiceDto) {
    return await this.catalogService.createService(payload);
  }

  @ApiOperation({
    description: 'Lista serviços (filtros: nome e ativo/inativo)',
  })
  @ApiResponse({ status: 200, description: 'Busca bem sucedida' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get()
  async findAllServices(@Query() query: ListServicesQueryDto) {
    return await this.catalogService.findAll(query);
  }

  @ApiOperation({ description: 'Busca serviço pelo ID' })
  @ApiResponse({ status: 200, description: 'Serviço encontrado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get(':serviceId')
  async findServiceById(@Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return await this.catalogService.findServiceById(serviceId);
  }

  @ApiOperation({ description: 'Atualiza nome, descrição ou preço do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  @ApiConflictResponse({ description: 'Já existe um serviço com esse nome' })
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @Put(':serviceId')
  async updateService(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() payload: UpdateServiceDto,
  ) {
    return await this.catalogService.updateService(serviceId, payload);
  }

  @ApiOperation({ description: 'Inativa o serviço pelo ID' })
  @ApiNoContentResponse({ description: 'Serviço inativado com sucesso' })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado' })
  @HttpCode(204)
  @Roles(Role.ADMIN)
  @Delete(':serviceId')
  async deleteServiceById(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    await this.catalogService.deleteService(serviceId);
  }
}
