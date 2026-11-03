import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { DatabaseService } from '../../../shared/database/database.service';
import { CatalogService, ItemService } from '../../catalog/services';
import { AddPartItemDto, AddServiceItemDto } from '../controllers/dtos';
import { buildQuote, calculateQuoteTotal } from '../domain/quote';
import { StatusTransitionPolicy } from '../domain/policies';

const QUOTE_VERSION = 1; // renegociar = nova OS (ADR-010): cada OS tem um único orçamento

const quoteItemsInclude = {
  itemEstoque: { select: { itemEstoqueNome: true } },
} satisfies Prisma.OrdemServicoItemInclude;

const quoteServicesInclude = {
  servico: { select: { servicoNome: true } },
} satisfies Prisma.OrdemServicoServicoInclude;

/** Serviços, peças e insumos da OS e o orçamento derivado deles (PRD-003). */
@Injectable()
export class ServiceOrderItemsService {
  private logger = new Logger(ServiceOrderItemsService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly itemService: ItemService,
    private readonly catalogService: CatalogService,
  ) {
    this.orm = this.prisma.db;
  }

  async addPartItem(serviceOrderId: string, payload: AddPartItemDto) {
    const part = await this.findActivePart(payload.itemEstoqueId);

    const quote = await this.orm.$transaction(async (tx) => {
      await this.ensureItemsEditable(tx, serviceOrderId);

      // ADR-012: incluir só verifica a disponibilidade; a reserva acontece na aprovação.
      const alreadyInOrder = await tx.ordemServicoItem.findMany({
        where: {
          ordemServicoId: serviceOrderId,
          itemEstoqueId: payload.itemEstoqueId,
        },
        select: { osItemQuantidade: true },
      });
      const requested =
        alreadyInOrder.reduce(
          (sum, item) => sum + Number(item.osItemQuantidade),
          0,
        ) + payload.osItemQuantidade;
      const available =
        Number(part.itemEstoqueQuantidade) - Number(part.itemEstoqueReservada);
      if (requested > available) {
        throw new UnprocessableEntityException(
          `Estoque insuficiente para ${part.itemEstoqueNome}: disponível ${available}`,
        );
      }

      const orcamento = await this.ensureQuote(tx, serviceOrderId);

      await tx.ordemServicoItem.create({
        data: {
          ordemServicoId: serviceOrderId,
          orcamentoId: orcamento.orcamentoId,
          itemEstoqueId: part.itemEstoqueId,
          osItemQuantidade: payload.osItemQuantidade,
          osItemPrecoUnitario: part.itemEstoquePrecoVenda, // snapshot do preço
        },
      });

      return await this.recalculateQuote(tx, serviceOrderId);
    });

    this.logger.log(
      `Peça ${payload.itemEstoqueId} incluída na OS ${serviceOrderId}`,
    );
    return quote;
  }

  async removePartItem(serviceOrderId: string, osItemId: string) {
    return await this.orm.$transaction(async (tx) => {
      await this.ensureItemsEditable(tx, serviceOrderId);

      const { count } = await tx.ordemServicoItem.deleteMany({
        where: { osItemId, ordemServicoId: serviceOrderId },
      });
      if (count === 0) throw new NotFoundException('Item não encontrado na OS');

      return await this.recalculateQuote(tx, serviceOrderId);
    });
  }

  async addServiceItem(serviceOrderId: string, payload: AddServiceItemDto) {
    const service = await this.findActiveService(payload.servicoId);

    const quote = await this.orm.$transaction(async (tx) => {
      await this.ensureItemsEditable(tx, serviceOrderId);

      const orcamento = await this.ensureQuote(tx, serviceOrderId);

      await tx.ordemServicoServico.create({
        data: {
          ordemServicoId: serviceOrderId,
          orcamentoId: orcamento.orcamentoId,
          servicoId: service.servicoId,
          osServicoQuantidade: payload.osServicoQuantidade,
          osServicoPrecoUnitario: service.servicoPrecoBase, // snapshot do preço
        },
      });

      return await this.recalculateQuote(tx, serviceOrderId);
    });

    this.logger.log(
      `Serviço ${payload.servicoId} incluído na OS ${serviceOrderId}`,
    );
    return quote;
  }

  async removeServiceItem(serviceOrderId: string, osServicoId: string) {
    return await this.orm.$transaction(async (tx) => {
      await this.ensureItemsEditable(tx, serviceOrderId);

      const { count } = await tx.ordemServicoServico.deleteMany({
        where: { osServicoId, ordemServicoId: serviceOrderId },
      });
      if (count === 0) {
        throw new NotFoundException('Serviço não encontrado na OS');
      }

      return await this.recalculateQuote(tx, serviceOrderId);
    });
  }

  async findQuote(serviceOrderId: string) {
    const serviceOrder = await this.orm.ordemServico.findUnique({
      where: { ordemServicoId: serviceOrderId },
      select: { ordemServicoId: true },
    });
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    return await this.loadQuote(this.orm, serviceOrderId);
  }

  /** Recalcula o total a partir dos itens atuais (nunca atribuído) e devolve o orçamento. */
  private async recalculateQuote(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
  ) {
    const items = await tx.ordemServicoItem.findMany({
      where: { ordemServicoId: serviceOrderId },
    });

    const services = await tx.ordemServicoServico.findMany({
      where: { ordemServicoId: serviceOrderId },
    });

    await tx.orcamento.updateMany({
      where: { ordemServicoId: serviceOrderId, orcamentoVersao: QUOTE_VERSION },
      data: {
        orcamentoValorTotal: calculateQuoteTotal(items, services),
        orcamentoAtualizadoEm: new Date(),
      },
    });

    return await this.loadQuote(tx, serviceOrderId);
  }

  private async loadQuote(
    client: Prisma.TransactionClient,
    serviceOrderId: string,
  ) {
    const [orcamento, items, services] = await Promise.all([
      client.orcamento.findUnique({
        where: {
          ordemServicoId_orcamentoVersao: {
            ordemServicoId: serviceOrderId,
            orcamentoVersao: QUOTE_VERSION,
          },
        },
      }),
      client.ordemServicoItem.findMany({
        where: { ordemServicoId: serviceOrderId },
        include: quoteItemsInclude,
        orderBy: [{ osItemCriadoEm: 'asc' }, { osItemId: 'asc' }],
      }),
      client.ordemServicoServico.findMany({
        where: { ordemServicoId: serviceOrderId },
        include: quoteServicesInclude,
        orderBy: [{ osServicoCriadoEm: 'asc' }, { osServicoId: 'asc' }],
      }),
    ]);

    return buildQuote(serviceOrderId, orcamento, items, services);
  }

  /** Cada OS tem um único orçamento (ADR-010); nasce na primeira inclusão de serviço ou peça. */
  private async ensureQuote(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
  ) {
    return await tx.orcamento.upsert({
      where: {
        ordemServicoId_orcamentoVersao: {
          ordemServicoId: serviceOrderId,
          orcamentoVersao: QUOTE_VERSION,
        },
      },
      create: {
        ordemServicoId: serviceOrderId,
        orcamentoVersao: QUOTE_VERSION,
      },
      update: {},
    });
  }

  private async ensureItemsEditable(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
  ) {
    const serviceOrder = await tx.ordemServico.findUnique({
      where: { ordemServicoId: serviceOrderId },
      select: { ordemServicoStatus: true },
    });
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (!StatusTransitionPolicy.canEditItems(serviceOrder.ordemServicoStatus)) {
      throw new ConflictException(
        `Os itens não podem ser alterados com a OS em ${serviceOrder.ordemServicoStatus}`,
      );
    }
  }

  /** `ItemService` lança 400 para peça inativa; aqui vira 422, como pede a ADR-012. */
  private async findActivePart(itemId: string) {
    try {
      return await this.itemService.findItemById(itemId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Peça não encontrada');
      }
      throw error;
    }
  }

  /** `CatalogService` lança 404 para serviço inexistente ou inativo; aqui segue 404 com a mensagem da OS. */
  private async findActiveService(serviceId: string) {
    try {
      return await this.catalogService.findServiceById(serviceId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Serviço não encontrado');
      }
      throw error;
    }
  }
}
