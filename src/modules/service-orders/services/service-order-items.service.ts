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
import { ItemService } from '../../catalog/services';
import { AddPartItemDto } from '../controllers/dtos';
import { buildQuote, calculateQuoteTotal } from '../domain/quote';
import { StatusTransitionPolicy } from '../domain/policies';

const QUOTE_VERSION = 1; // renegociar = nova OS (ADR-010): cada OS tem um único orçamento

const quoteItemsInclude = {
  itemEstoque: { select: { itemEstoqueNome: true } },
} satisfies Prisma.OrdemServicoItemInclude;

/** Peças e insumos da OS e o orçamento derivado deles (PRD-003). */
@Injectable()
export class ServiceOrderItemsService {
  private logger = new Logger(ServiceOrderItemsService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly itemService: ItemService,
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

      const orcamento = await tx.orcamento.upsert({
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

    await tx.orcamento.updateMany({
      where: { ordemServicoId: serviceOrderId, orcamentoVersao: QUOTE_VERSION },
      data: {
        orcamentoValorTotal: calculateQuoteTotal(items),
        orcamentoAtualizadoEm: new Date(),
      },
    });

    return await this.loadQuote(tx, serviceOrderId);
  }

  private async loadQuote(
    client: Prisma.TransactionClient,
    serviceOrderId: string,
  ) {
    const [orcamento, items] = await Promise.all([
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
    ]);

    return buildQuote(serviceOrderId, orcamento, items);
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
}
