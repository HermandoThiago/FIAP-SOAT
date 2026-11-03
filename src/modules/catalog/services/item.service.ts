import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { randomInt } from 'node:crypto';
import { TipoItemEstoque } from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext } from '../../identity/auth';
import {
  CreateItemEstoqueDto,
  ListItensQueryDto,
  UpdateItemDto,
} from '../controllers/dtos';
import { ItemEstoque } from '../domain/entities';
import { StockService } from './stock.service';

@Injectable()
export class ItemService {
  private logger = new Logger(ItemService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
    private readonly stockService: StockService,
  ) {
    this.orm = this.prisma.db;
  }

  async createItem(payload: CreateItemEstoqueDto) {
    const itemEstoqueCodigo = await this.generateItemCode(
      payload.itemEstoqueTipo,
    );

    // O saldo inicial nasce junto com a movimentação de ENTRADA que o explica (ADR-012).
    const item = await this.orm.$transaction(async (tx) => {
      const created = await tx.itemEstoque.create({
        data: {
          itemEstoqueTipo: payload.itemEstoqueTipo,
          itemEstoqueCodigo,
          itemEstoqueNome: payload.itemEstoqueNome,
          itemEstoqueDescricao: payload.itemEstoqueDescricao,
          itemEstoqueUnidade: payload.itemEstoqueUnidade,
          itemEstoquePrecoVenda: payload.itemEstoquePrecoVenda,
          itemEstoqueQuantidade: payload.itemEstoqueQuantidade,
        },
      });
      await this.stockService.recordInitialBalance(
        tx,
        created.itemEstoqueId,
        payload.itemEstoqueQuantidade,
      );
      return created;
    });

    return plainToInstance(ItemEstoque, item);
  }

  async updateItem(itemId: string, payload: UpdateItemDto) {
    await this.findItemById(itemId);

    // O saldo não passa por aqui: só movimentações e comandos da OS o alteram (ADR-012).
    await this.orm.itemEstoque.update({
      where: { itemEstoqueId: itemId },
      data: {
        ...payload,
        itemEstoqueAtualizadoEm: new Date(),
      },
    });
  }

  private async generateItemCode(tipo: TipoItemEstoque): Promise<string> {
    const prefix = tipo === TipoItemEstoque.PECA ? 'PC' : 'INS';
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    const block = () =>
      Array.from(
        { length: 4 },
        () => alphabet[randomInt(alphabet.length)],
      ).join('');

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `${prefix}-${block()}-${block()}`;
      const exists = await this.orm.itemEstoque.findUnique({
        where: { itemEstoqueCodigo: code },
        select: { itemEstoqueId: true },
      });

      if (!exists) return code;
    }

    throw new ConflictException('Não foi possível gerar um código único');
  }

  async findAllItens({ page, pageSize, itemEstoqueTipo }: ListItensQueryDto) {
    const [items, total] = await Promise.all([
      this.orm.itemEstoque.findMany({
        where: {
          itemEstoqueAtivo: true,
          itemEstoqueTipo,
        },
        orderBy: [{ itemEstoqueNome: 'asc' }, { itemEstoqueCriadoEm: 'desc' }],
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.orm.itemEstoque.count({
        where: { itemEstoqueAtivo: true, itemEstoqueTipo },
      }),
    ]);

    return {
      items: plainToInstance(ItemEstoque, items),
      total,
      page,
      pageSize,
    };
  }

  async findItemById(itemId: string) {
    const item = await this.orm.itemEstoque.findUnique({
      where: {
        itemEstoqueId: itemId,
      },
    });

    if (!item) {
      this.logger.error(`Item ${itemId} não encontrado`);
      throw new NotFoundException('Item não encontrado');
    }

    if (!item.itemEstoqueAtivo) {
      this.logger.error(`Item ${item.itemEstoqueNome} se encontra inativo!`);
      throw new BadRequestException(
        `Item ${item.itemEstoqueNome} se encontra inativo!`,
      );
    }

    return plainToInstance(ItemEstoque, item);
  }

  async deleteById(itemId: string) {
    const item = await this.findItemById(itemId);

    await this.orm.itemEstoque.update({
      where: {
        itemEstoqueId: itemId,
      },
      data: {
        itemEstoqueAtivo: false,
        itemEstoqueAtualizadoEm: new Date(),
      },
    });
  }
}
