import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Role, Roles } from '../../identity/auth';
import { MetricsService } from '../services';
import { AverageExecutionTimeQueryDto } from './dtos';

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @ApiOperation({
    description:
      'Tempo médio de execução (EM_EXECUCAO → FINALIZADA) das OS finalizadas no período, geral e por serviço',
  })
  @ApiResponse({ status: 200, description: 'Média em minutos' })
  @ApiUnprocessableEntityResponse({ description: 'Período inválido' })
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.ATTENDANT, Role.MECHANIC)
  @Get('average-execution-time')
  async averageExecutionTime(@Query() query: AverageExecutionTimeQueryDto) {
    return await this.metricsService.averageExecutionTime(query);
  }
}
