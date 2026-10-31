import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { DatabaseService } from '../../../shared/database/database.service';
import { TrackingActor } from '../../identity/auth';
import {
  describeStatus,
  maskDocument,
  maskLicensePlate,
} from '../domain/tracking-view';
import { buildQuote } from '../domain/quote';
import { ServiceOrdersService } from './service-orders.service';

const trackingInclude = {
  veiculo: true,
  cliente: true,
  historicoStatus: { orderBy: { historicoCriadoEm: 'asc' } },
  orcamentos: { orderBy: { orcamentoVersao: 'desc' }, take: 1 },
  itens: { include: { itemEstoque: { select: { itemEstoqueNome: true } } } },
} satisfies Prisma.OrdemServicoInclude;

/** Acompanhamento do cliente (ADR-011): token de uma OS ou login `CUSTOMER`; OS alheia responde 404. */
@Injectable()
export class TrackingService {
  private logger = new Logger(TrackingService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly serviceOrdersService: ServiceOrdersService,
  ) {
    this.orm = this.prisma.db;
  }

  async findTracking(actor: TrackingActor, serviceOrderId: string) {
    const serviceOrder = await this.orm.ordemServico.findFirst({
      where: this.ownedBy(actor, serviceOrderId),
      include: trackingInclude,
    });
    if (!serviceOrder) {
      this.logger.warn(
        `Acompanhamento da OS ${serviceOrderId} negado/inexistente`,
      );
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    const quote = buildQuote(
      serviceOrderId,
      serviceOrder.orcamentos[0] ?? null,
      serviceOrder.itens,
    );
    const { statusDescription, nextAction } = describeStatus(
      serviceOrder.ordemServicoStatus,
    );

    return {
      number: String(serviceOrder.ordemServicoNumero),
      status: serviceOrder.ordemServicoStatus,
      statusDescription,
      vehicle: {
        licensePlate: maskLicensePlate(serviceOrder.veiculo.veiculoPlaca),
        brand: serviceOrder.veiculo.veiculoMarca,
        model: serviceOrder.veiculo.veiculoModelo,
      },
      customer: {
        name: serviceOrder.cliente.usuarioNome,
        document: maskDocument(serviceOrder.cliente.usuarioDocumento),
      },
      quote: {
        totalAmount: quote.orcamentoValorTotal,
        status: quote.orcamentoStatus,
        items: quote.itens.map((item) => ({
          description: item.nome,
          quantity: item.quantidade,
          subtotal: item.subtotal,
        })),
      },
      timeline: serviceOrder.historicoStatus.map((entry) => ({
        status: entry.historicoStatusNovo,
        at: entry.historicoCriadoEm,
      })),
      nextAction,
    };
  }

  async approveQuote(actor: TrackingActor, serviceOrderId: string) {
    const customerId = await this.resolveCustomerId(actor, serviceOrderId);
    await this.serviceOrdersService.approveQuote(serviceOrderId, customerId);
    return await this.findTracking(actor, serviceOrderId);
  }

  async rejectQuote(
    actor: TrackingActor,
    serviceOrderId: string,
    reason?: string,
  ) {
    const customerId = await this.resolveCustomerId(actor, serviceOrderId);
    await this.serviceOrdersService.rejectQuote(
      serviceOrderId,
      customerId,
      reason,
    );
    return await this.findTracking(actor, serviceOrderId);
  }

  /** Confirma o acesso (404 se alheia) e devolve o cliente dono da OS, que responde pelo orçamento. */
  private async resolveCustomerId(
    actor: TrackingActor,
    serviceOrderId: string,
  ) {
    const serviceOrder = await this.orm.ordemServico.findFirst({
      where: this.ownedBy(actor, serviceOrderId),
      select: { usuarioId: true },
    });
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return serviceOrder.usuarioId;
  }

  private ownedBy(actor: TrackingActor, serviceOrderId: string) {
    if (actor.kind === 'token') {
      // O token vale para uma OS só; outro id responde 404 como se não existisse.
      return {
        ordemServicoId:
          actor.serviceOrderId === serviceOrderId
            ? serviceOrderId
            : '00000000-0000-0000-0000-000000000000',
      };
    }
    return { ordemServicoId: serviceOrderId, usuarioId: actor.customerId };
  }
}
