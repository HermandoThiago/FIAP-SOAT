import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TipoMovimentacaoEstoque as Tipo } from '../../src/generated/prisma/enums';
import { StockService } from '../../src/modules/catalog/services';
import { RequestContext } from '../../src/modules/identity/auth';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('StockService', () => {
  const itemA = '00000000-0000-4000-8000-00000000000a';
  const itemB = '00000000-0000-4000-8000-00000000000b';
  const orderId = 'order-id';

  const rowOf = (
    id: string,
    quantidade: number,
    reservada: number,
    nome = 'Filtro',
  ) => ({
    item_estoque_id: id,
    item_estoque_nome: nome,
    item_estoque_quantidade: quantidade,
    item_estoque_reservada: reservada,
  });

  const tx = {
    $queryRaw: jest.fn(),
    itemEstoque: { update: jest.fn() },
    movimentacaoEstoque: { create: jest.fn() },
  };
  const db = {
    itemEstoque: { findUnique: jest.fn() },
    movimentacaoEstoque: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const ctx = { userId: 'user-id' };
  let service: StockService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    tx.movimentacaoEstoque.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ movimentacaoId: 'mov-id', ...data }),
    );
    service = new StockService(
      { db } as unknown as DatabaseService,
      ctx as unknown as RequestContext,
    );
  });

  describe('registerMovement', () => {
    it('should add an ENTRADA to the balance and register the movement with the user', async () => {
      tx.$queryRaw.mockResolvedValue([rowOf(itemA, 10, 2)]);

      const result = await service.registerMovement(itemA, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 5,
        movimentacaoMotivo: 'Compra',
      });

      expect(tx.itemEstoque.update).toHaveBeenCalledWith({
        where: { itemEstoqueId: itemA },
        data: expect.objectContaining({
          itemEstoqueQuantidade: 15,
          itemEstoqueReservada: 2,
        }) as unknown,
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: {
          itemEstoqueId: itemA,
          ordemServicoId: undefined,
          usuarioId: 'user-id',
          movimentacaoTipo: Tipo.ENTRADA,
          movimentacaoQuantidade: 5,
          movimentacaoMotivo: 'Compra',
        },
      });
      expect(result.saldo).toEqual({
        quantidade: 15,
        reservada: 2,
        disponivel: 13,
      });
    });

    it('should take a SAIDA only from the available quantity', async () => {
      tx.$queryRaw.mockResolvedValue([rowOf(itemA, 10, 8)]);

      await expect(
        service.registerMovement(itemA, {
          movimentacaoTipo: 'SAIDA',
          movimentacaoQuantidade: 3,
        }),
      ).rejects.toThrow('Estoque insuficiente');
      expect(tx.itemEstoque.update).not.toHaveBeenCalled();
      expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
    });

    it('should register an AJUSTE with the absolute difference and the direction in the reason', async () => {
      tx.$queryRaw.mockResolvedValue([rowOf(itemA, 10, 0)]);

      const result = await service.registerMovement(itemA, {
        movimentacaoTipo: 'AJUSTE',
        movimentacaoQuantidade: 7,
        movimentacaoMotivo: 'Contagem de inventário',
      });

      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          movimentacaoTipo: Tipo.AJUSTE,
          movimentacaoQuantidade: 3,
          movimentacaoMotivo:
            'Ajuste de inventário (10 → 7): Contagem de inventário',
        }) as unknown,
      });
      expect(result.saldo.quantidade).toBe(7);
    });

    it('should require a reason on AJUSTE', async () => {
      tx.$queryRaw.mockResolvedValue([rowOf(itemA, 10, 0)]);

      await expect(
        service.registerMovement(itemA, {
          movimentacaoTipo: 'AJUSTE',
          movimentacaoQuantidade: 7,
        }),
      ).rejects.toThrow('exige um motivo');
    });

    it('should refuse an AJUSTE below the reserved quantity', async () => {
      tx.$queryRaw.mockResolvedValue([rowOf(itemA, 10, 6)]);

      await expect(
        service.registerMovement(itemA, {
          movimentacaoTipo: 'AJUSTE',
          movimentacaoQuantidade: 5,
          movimentacaoMotivo: 'x',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should throw NotFoundException when the item does not exist', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.registerMovement(itemA, {
          movimentacaoTipo: 'ENTRADA',
          movimentacaoQuantidade: 1,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should propagate unexpected errors untouched', async () => {
      const error = new Error('db down');
      tx.$queryRaw.mockResolvedValue([rowOf(itemA, 10, 0)]);
      tx.itemEstoque.update.mockRejectedValue(error);

      await expect(
        service.registerMovement(itemA, {
          movimentacaoTipo: 'ENTRADA',
          movimentacaoQuantidade: 1,
        }),
      ).rejects.toBe(error);
    });
  });

  describe('findMovements', () => {
    it('should list the history, newest first, with the filters', async () => {
      db.itemEstoque.findUnique.mockResolvedValue({ itemEstoqueId: itemA });
      db.movimentacaoEstoque.findMany.mockResolvedValue([
        { movimentacaoId: 'm1', movimentacaoQuantidade: 5 },
      ]);
      db.movimentacaoEstoque.count.mockResolvedValue(1);

      const result = await service.findMovements(itemA, {
        page: 2,
        pageSize: 10,
        movimentacaoTipo: Tipo.RESERVA,
        ordemServicoId: orderId,
      });

      expect(db.movimentacaoEstoque.findMany).toHaveBeenCalledWith({
        where: {
          itemEstoqueId: itemA,
          movimentacaoTipo: Tipo.RESERVA,
          ordemServicoId: orderId,
        },
        orderBy: [{ movimentacaoCriadaEm: 'desc' }, { movimentacaoId: 'desc' }],
        take: 10,
        skip: 10,
      });
      expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 });
    });

    it('should throw NotFoundException when the item does not exist', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(null);

      await expect(
        service.findMovements(itemA, { page: 1, pageSize: 20 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('recordInitialBalance', () => {
    it('should register an ENTRADA for the initial balance', async () => {
      await service.recordInitialBalance(tx as never, itemA, 12);

      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          movimentacaoTipo: Tipo.ENTRADA,
          movimentacaoQuantidade: 12,
          movimentacaoMotivo: 'Saldo inicial',
        }) as unknown,
      });
    });

    it('should register nothing when the initial balance is zero', async () => {
      await service.recordInitialBalance(tx as never, itemA, 0);

      expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
    });
  });

  describe('reserveForServiceOrder', () => {
    it('should reserve each item and register a RESERVA movement linked to the order', async () => {
      tx.$queryRaw
        .mockResolvedValueOnce([rowOf(itemA, 10, 1)])
        .mockResolvedValueOnce([rowOf(itemB, 4, 0)]);

      await service.reserveForServiceOrder(
        tx as never,
        orderId,
        'customer-id',
        [
          { itemEstoqueId: itemA, quantidade: 3 },
          { itemEstoqueId: itemB, quantidade: 4 },
        ],
      );

      expect(tx.itemEstoque.update).toHaveBeenNthCalledWith(1, {
        where: { itemEstoqueId: itemA },
        data: expect.objectContaining({
          itemEstoqueQuantidade: 10,
          itemEstoqueReservada: 4,
        }) as unknown,
      });
      expect(tx.itemEstoque.update).toHaveBeenNthCalledWith(2, {
        where: { itemEstoqueId: itemB },
        data: expect.objectContaining({
          itemEstoqueQuantidade: 4,
          itemEstoqueReservada: 4,
        }) as unknown,
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ordemServicoId: orderId,
          usuarioId: 'customer-id',
          movimentacaoTipo: Tipo.RESERVA,
        }) as unknown,
      });
    });

    it('should sum repeated items and lock the rows in a fixed order', async () => {
      tx.$queryRaw
        .mockResolvedValueOnce([rowOf(itemA, 10, 0)])
        .mockResolvedValueOnce([rowOf(itemB, 10, 0)]);

      await service.reserveForServiceOrder(tx as never, orderId, 'u', [
        { itemEstoqueId: itemB, quantidade: 1 },
        { itemEstoqueId: itemA, quantidade: 1 },
        { itemEstoqueId: itemB, quantidade: 2 },
      ]);

      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledTimes(2);
      const created = tx.movimentacaoEstoque.create.mock.calls.map(
        ([arg]) =>
          (
            arg as {
              data: { itemEstoqueId: string; movimentacaoQuantidade: number };
            }
          ).data,
      );
      expect(
        created.map((c) => [c.itemEstoqueId, c.movimentacaoQuantidade]),
      ).toEqual([
        [itemA, 1],
        [itemB, 3],
      ]);
    });

    it('should throw 422 naming the item and the available quantity when the stock is short', async () => {
      tx.$queryRaw.mockResolvedValueOnce([
        rowOf(itemA, 5, 3, 'Pastilha de freio'),
      ]);

      await expect(
        service.reserveForServiceOrder(tx as never, orderId, 'u', [
          { itemEstoqueId: itemA, quantidade: 3 },
        ]),
      ).rejects.toThrow(
        'Estoque insuficiente para Pastilha de freio: disponível 2',
      );
      expect(tx.movimentacaoEstoque.create).not.toHaveBeenCalled();
    });

    it('should do nothing when the order has no parts', async () => {
      await service.reserveForServiceOrder(tx as never, orderId, 'u', []);

      expect(tx.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('withdrawReservedForServiceOrder', () => {
    it('should lower the balance and the reservation together and register a SAIDA linked to the order', async () => {
      tx.$queryRaw.mockResolvedValueOnce([rowOf(itemA, 10, 4)]);

      await service.withdrawReservedForServiceOrder(
        tx as never,
        orderId,
        'mechanic-id',
        [{ itemEstoqueId: itemA, quantidade: 4 }],
      );

      expect(tx.itemEstoque.update).toHaveBeenCalledWith({
        where: { itemEstoqueId: itemA },
        data: expect.objectContaining({
          itemEstoqueQuantidade: 6,
          itemEstoqueReservada: 0,
        }) as unknown,
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ordemServicoId: orderId,
          usuarioId: 'mechanic-id',
          movimentacaoTipo: Tipo.SAIDA,
          movimentacaoQuantidade: 4,
        }) as unknown,
      });
    });

    it('should refuse to withdraw what was never reserved', async () => {
      tx.$queryRaw.mockResolvedValueOnce([rowOf(itemA, 10, 1)]);

      await expect(
        service.withdrawReservedForServiceOrder(tx as never, orderId, 'u', [
          { itemEstoqueId: itemA, quantidade: 4 },
        ]),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('releaseForServiceOrder', () => {
    it('should lower the reservation, keep the balance and register a LIBERACAO_RESERVA', async () => {
      tx.$queryRaw.mockResolvedValueOnce([rowOf(itemA, 10, 4)]);

      await service.releaseForServiceOrder(tx as never, orderId, 'u', [
        { itemEstoqueId: itemA, quantidade: 4 },
      ]);

      expect(tx.itemEstoque.update).toHaveBeenCalledWith({
        where: { itemEstoqueId: itemA },
        data: expect.objectContaining({
          itemEstoqueQuantidade: 10,
          itemEstoqueReservada: 0,
        }) as unknown,
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          movimentacaoTipo: Tipo.LIBERACAO_RESERVA,
        }) as unknown,
      });
    });
  });
});
