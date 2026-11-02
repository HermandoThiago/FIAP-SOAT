import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StatusOrdemServico } from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { AverageExecutionTimeQueryDto } from '../controllers/dtos';
import {
  ExecutionSample,
  averageExecutionMinutes,
  buildExecutionSamples,
  executionMinutes,
} from '../domain/execution-time';

/** Leitura sobre o histórico de status (PRD-006): tempo médio de `EM_EXECUCAO` até `FINALIZADA`. */
@Injectable()
export class MetricsService {
  private logger = new Logger(MetricsService.name);
  private orm;

  constructor(private readonly prisma: DatabaseService) {
    this.orm = this.prisma.db;
  }

  async averageExecutionTime({
    from,
    to,
    serviceId,
  }: AverageExecutionTimeQueryDto) {
    if (from && to && from > to) {
      throw new UnprocessableEntityException(
        'O início do período deve ser anterior ao fim',
      );
    }

    // O período vale para a data de finalização da OS.
    const completedWhere: Prisma.OrdemServicoStatusHistoricoWhereInput = {
      historicoStatusNovo: StatusOrdemServico.FINALIZADA,
      ...(from || to
        ? {
            historicoCriadoEm: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(serviceId
        ? { ordemServico: { servicos: { some: { servicoId: serviceId } } } }
        : {}),
    };

    const completions = await this.orm.ordemServicoStatusHistorico.findMany({
      where: completedWhere,
      select: { ordemServicoId: true, historicoCriadoEm: true },
    });
    const orderIds = [...new Set(completions.map((c) => c.ordemServicoId))];

    const starts = orderIds.length
      ? await this.orm.ordemServicoStatusHistorico.findMany({
          where: {
            ordemServicoId: { in: orderIds },
            historicoStatusNovo: StatusOrdemServico.EM_EXECUCAO,
          },
          select: { ordemServicoId: true, historicoCriadoEm: true },
        })
      : [];

    const samples = buildExecutionSamples(
      starts.map((s) => ({
        serviceOrderId: s.ordemServicoId,
        at: s.historicoCriadoEm,
      })),
      completions.map((c) => ({
        serviceOrderId: c.ordemServicoId,
        at: c.historicoCriadoEm,
      })),
    );

    const byService = await this.averageByService(samples, serviceId);

    this.logger.log(
      `Tempo médio de execução calculado sobre ${samples.length} OS`,
    );
    return {
      period: { from: from ?? null, to: to ?? null },
      averageMinutes: averageExecutionMinutes(samples),
      serviceOrderCount: samples.length,
      byService,
    };
  }

  /** Média por serviço entre as OS que o contêm (uma OS com 2 serviços conta nos dois). */
  private async averageByService(
    samples: ExecutionSample[],
    onlyServiceId?: string,
  ) {
    if (samples.length === 0) return [];

    const lines = await this.orm.ordemServicoServico.findMany({
      where: {
        ordemServicoId: { in: samples.map((s) => s.serviceOrderId) },
        ...(onlyServiceId ? { servicoId: onlyServiceId } : {}),
      },
      select: {
        ordemServicoId: true,
        servicoId: true,
        servico: { select: { servicoNome: true } },
      },
    });

    const minutesByOrder = new Map(
      samples.map((s) => [s.serviceOrderId, executionMinutes(s)]),
    );
    const groups = new Map<
      string,
      { name: string; orders: Map<string, number> }
    >();
    for (const line of lines) {
      const group = groups.get(line.servicoId) ?? {
        name: line.servico.servicoNome,
        orders: new Map<string, number>(),
      };
      group.orders.set(
        line.ordemServicoId,
        minutesByOrder.get(line.ordemServicoId)!,
      );
      groups.set(line.servicoId, group);
    }

    return [...groups.entries()]
      .map(([serviceId, { name, orders }]) => {
        const values = [...orders.values()];
        return {
          serviceId,
          name,
          averageMinutes:
            Math.round(
              (values.reduce((sum, v) => sum + v, 0) / values.length) * 100,
            ) / 100,
          serviceOrderCount: values.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
