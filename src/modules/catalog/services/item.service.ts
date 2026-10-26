import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
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

@Injectable()
export class ItemService {
  private logger = new Logger(ItemService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
  ) {
    this.orm = this.prisma.db;
  }

  async createItem(payload: CreateItemEstoqueDto) {
    const itemEstoqueCodigo = await this.generateItemCode(
      payload.itemEstoqueTipo,
    );

    const item = await this.orm.itemEstoque.create({
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

    return plainToInstance(ItemEstoque, item);
  }

  async updateItem(itemId: string, payload: UpdateItemDto) {
    const current = await this.findItemById(itemId);

    const quantidade =
      payload.itemEstoqueQuantidade ?? current.itemEstoqueQuantidade.toNumber();
    const reservada =
      payload.itemEstoqueReservada ?? current.itemEstoqueReservada.toNumber();

    if (reservada > quantidade) {
      throw new UnprocessableEntityException(
        'A quantidade reservada não pode exceder o saldo em estoque',
      );
    }

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

    return plainToInstance(ItemEstoque, item);
  }

  async deleteById(itemId: string) {
    try {
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
    } catch (error) {}
  }
}
