import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import { TipoMovimentacaoEstoque } from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext } from '../../identity/auth';
import {
  CreateStockMovementDto,
  ListStockMovementsQueryDto,
} from '../controllers/dtos';
import { StockMovement } from '../domain/entities';
import {
  StockLevel,
  StockResult,
  StockRuleError,
  adjust,
  availableQuantity,
  issue,
  receive,
  release,
  reserve,
  withdrawReserved,
} from '../domain/stock';

export interface StockLine {
  itemEstoqueId: string;
  quantidade: number;
}

interface LockedItem {
  item_estoque_id: string;
  item_estoque_nome: string;
  item_estoque_quantidade: Prisma.Decimal;
  item_estoque_reservada: Prisma.Decimal;
}

/**
 * Controle de estoque (ADR-012): o saldo só muda por uma `MovimentacaoEstoque` gravada na mesma transação.
 * As operações de OS (`reserveForServiceOrder`, `withdrawReservedForServiceOrder`) recebem a transação do
 * serviço da OS e participam dela: se qualquer item falhar, a transição de status inteira é desfeita.
 */
@Injectable()
export class StockService {
  private logger = new Logger(StockService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
  ) {
    this.orm = this.prisma.db;
  }

  /** Movimentação manual: entrada, saída ou ajuste de inventário. */
  async registerMovement(itemId: string, payload: CreateStockMovementDto) {
    const userId = this.ctx.userId;

    const { movement, level } = await this.orm.$transaction(async (tx) => {
      const locked = await this.lockItem(tx, itemId);
      const before = this.levelOf(locked);

      const { result, reason } = this.applyManual(before, payload);
      const movement = await this.persist(tx, locked, result, {
        tipo: payload.movimentacaoTipo,
        userId,
        motivo: reason,
      });
      return { movement, level: result.level };
    });

    this.logger.log(
      `Estoque do item ${itemId}: ${payload.movimentacaoTipo} ${movement.movimentacaoQuantidade}`,
    );
    return {
      movimentacao: plainToInstance(StockMovement, movement),
      saldo: { ...level, disponivel: availableQuantity(level) },
    };
  }

  async findMovements(
    itemId: string,
    {
      page,
      pageSize,
      movimentacaoTipo,
      ordemServicoId,
    }: ListStockMovementsQueryDto,
  ) {
    const item = await this.orm.itemEstoque.findUnique({
      where: { itemEstoqueId: itemId },
      select: { itemEstoqueId: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    const where: Prisma.MovimentacaoEstoqueWhereInput = {
      itemEstoqueId: itemId,
      ...(movimentacaoTipo ? { movimentacaoTipo } : {}),
      ...(ordemServicoId ? { ordemServicoId } : {}),
    };

    const [items, total] = await Promise.all([
      this.orm.movimentacaoEstoque.findMany({
        where,
        orderBy: [{ movimentacaoCriadaEm: 'desc' }, { movimentacaoId: 'desc' }],
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.orm.movimentacaoEstoque.count({ where }),
    ]);

    return {
      movements: plainToInstance(StockMovement, items),
      total,
      page,
      pageSize,
    };
  }

  /** Saldo inicial de um item recém-criado: o saldo já foi gravado, falta o histórico. */
  async recordInitialBalance(
    tx: Prisma.TransactionClient,
    itemId: string,
    quantity: number,
  ) {
    if (!(quantity > 0)) return;

    await tx.movimentacaoEstoque.create({
      data: {
        itemEstoqueId: itemId,
        usuarioId: this.ctx.userId,
        movimentacaoTipo: TipoMovimentacaoEstoque.ENTRADA,
        movimentacaoQuantidade: quantity,
        movimentacaoMotivo: 'Saldo inicial',
      },
    });
  }

  /** Aprovação do orçamento: reserva cada peça da OS. Falta de saldo em qualquer uma → 422 e nada é reservado. */
  async reserveForServiceOrder(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    userId: string,
    lines: StockLine[],
  ) {
    await this.applyToServiceOrder(tx, serviceOrderId, userId, lines, {
      tipo: TipoMovimentacaoEstoque.RESERVA,
      motivo: 'Reserva na aprovação do orçamento',
      apply: reserve,
    });
  }

  /** Finalização da OS: baixa do estoque o que foi reservado (saldo e reserva diminuem juntos). */
  async withdrawReservedForServiceOrder(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    userId: string,
    lines: StockLine[],
  ) {
    await this.applyToServiceOrder(tx, serviceOrderId, userId, lines, {
      tipo: TipoMovimentacaoEstoque.SAIDA,
      motivo: 'Baixa na finalização da OS',
      apply: withdrawReserved,
    });
  }

  /** Libera as reservas da OS sem baixar o saldo (ex.: OS abandonada depois da aprovação). */
  async releaseForServiceOrder(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    userId: string,
    lines: StockLine[],
  ) {
    await this.applyToServiceOrder(tx, serviceOrderId, userId, lines, {
      tipo: TipoMovimentacaoEstoque.LIBERACAO_RESERVA,
      motivo: 'Liberação da reserva da OS',
      apply: release,
    });
  }

  private async applyToServiceOrder(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    userId: string,
    lines: StockLine[],
    operation: {
      tipo: TipoMovimentacaoEstoque;
      motivo: string;
      apply: (level: StockLevel, quantity: number) => StockResult;
    },
  ) {
    // Uma linha por item (soma as repetidas) e ordem fixa de bloqueio: duas OS concorrentes não se travam.
    const totals = new Map<string, number>();
    for (const line of lines) {
      totals.set(
        line.itemEstoqueId,
        (totals.get(line.itemEstoqueId) ?? 0) + Number(line.quantidade),
      );
    }

    for (const [itemId, quantity] of [...totals].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const locked = await this.lockItem(tx, itemId);
      const before = this.levelOf(locked);

      let result: StockResult;
      try {
        result = operation.apply(before, quantity);
      } catch (error) {
        throw this.translate(error, locked.item_estoque_nome, before);
      }

      await this.persist(tx, locked, result, {
        tipo: operation.tipo,
        userId,
        serviceOrderId,
        motivo: operation.motivo,
      });
    }
  }

  private applyManual(before: StockLevel, payload: CreateStockMovementDto) {
    const quantity = payload.movimentacaoQuantidade;
    try {
      switch (payload.movimentacaoTipo) {
        case TipoMovimentacaoEstoque.ENTRADA:
          return {
            result: receive(before, quantity),
            reason: payload.movimentacaoMotivo,
          };
        case TipoMovimentacaoEstoque.SAIDA:
          return {
            result: issue(before, quantity),
            reason: payload.movimentacaoMotivo,
          };
        default: {
          if (!payload.movimentacaoMotivo) {
            throw new StockRuleError(
              'NO_CHANGE',
              'O ajuste de inventário exige um motivo',
            );
          }
          const result = adjust(before, quantity);
          // O tipo AJUSTE não guarda o sentido: ele fica no motivo (saldo antes → depois).
          return {
            result,
            reason:
              `Ajuste de inventário (${before.quantidade} → ${result.level.quantidade}): ${payload.movimentacaoMotivo}`.slice(
                0,
                255,
              ),
          };
        }
      }
    } catch (error) {
      throw this.translate(error, undefined, before);
    }
  }

  /** Bloqueia a linha do item até o fim da transação (`FOR UPDATE`): leituras e escritas do saldo não se cruzam. */
  private async lockItem(tx: Prisma.TransactionClient, itemId: string) {
    const rows = await tx.$queryRaw<LockedItem[]>`
      SELECT item_estoque_id, item_estoque_nome, item_estoque_quantidade, item_estoque_reservada
      FROM "ItemEstoque"
      WHERE item_estoque_id = ${itemId}::uuid
      FOR UPDATE`;

    if (rows.length === 0) throw new NotFoundException('Item não encontrado');
    return rows[0];
  }

  private levelOf(row: LockedItem): StockLevel {
    return {
      quantidade: Number(row.item_estoque_quantidade),
      reservada: Number(row.item_estoque_reservada),
    };
  }

  private async persist(
    tx: Prisma.TransactionClient,
    locked: LockedItem,
    { level, movimentada }: StockResult,
    movement: {
      tipo: TipoMovimentacaoEstoque;
      userId: string;
      serviceOrderId?: string;
      motivo?: string;
    },
  ) {
    await tx.itemEstoque.update({
      where: { itemEstoqueId: locked.item_estoque_id },
      data: {
        itemEstoqueQuantidade: level.quantidade,
        itemEstoqueReservada: level.reservada,
        itemEstoqueAtualizadoEm: new Date(),
      },
    });

    return await tx.movimentacaoEstoque.create({
      data: {
        itemEstoqueId: locked.item_estoque_id,
        ordemServicoId: movement.serviceOrderId,
        usuarioId: movement.userId,
        movimentacaoTipo: movement.tipo,
        movimentacaoQuantidade: movimentada,
        movimentacaoMotivo: movement.motivo,
      },
    });
  }

  private translate(
    error: unknown,
    itemName: string | undefined,
    level: StockLevel,
  ) {
    if (!(error instanceof StockRuleError)) return error;

    if (error.code === 'INSUFFICIENT' && itemName) {
      return new UnprocessableEntityException(
        `Estoque insuficiente para ${itemName}: disponível ${availableQuantity(level)}`,
      );
    }
    return new UnprocessableEntityException(error.message);
  }
}
