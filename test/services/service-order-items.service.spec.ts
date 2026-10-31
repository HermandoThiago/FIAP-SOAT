import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  StatusOrcamento,
  StatusOrdemServico,
} from '../../src/generated/prisma/enums';
import { ItemService } from '../../src/modules/catalog/services';
import { ServiceOrderItemsService } from '../../src/modules/service-orders/services';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('ServiceOrderItemsService', () => {
  const orderId = 'order-id';
  const partId = 'part-id';
  const part = {
    itemEstoqueId: partId,
    itemEstoqueNome: 'Filtro de óleo',
    itemEstoquePrecoVenda: 3500,
    itemEstoqueQuantidade: 20,
    itemEstoqueReservada: 5,
  };
  const orcamento = {
    orcamentoId: 'quote-id',
    orcamentoVersao: 1,
    orcamentoStatus: StatusOrcamento.RASCUNHO,
    orcamentoEnviadoEm: null,
  };
  const storedItem = {
    osItemId: 'item-1',
    itemEstoqueId: partId,
    osItemQuantidade: '2.000',
    osItemPrecoUnitario: 3500,
    itemEstoque: { itemEstoqueNome: 'Filtro de óleo' },
  };

  const tx = {
    ordemServico: { findUnique: jest.fn() },
    ordemServicoItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    orcamento: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const db = {
    ordemServico: { findUnique: jest.fn() },
    ordemServicoItem: { findMany: jest.fn() },
    orcamento: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const itemService = { findItemById: jest.fn() };
  let service: ServiceOrderItemsService;

  const orderIn = (status: StatusOrdemServico) =>
    tx.ordemServico.findUnique.mockResolvedValueOnce({
      ordemServicoStatus: status,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    itemService.findItemById.mockResolvedValue(part);
    // A checagem de estoque usa `select` (nada na OS ainda); o recálculo e o orçamento leem os itens.
    tx.ordemServicoItem.findMany.mockImplementation(
      (args: { select?: unknown }) =>
        Promise.resolve(args.select ? [] : [storedItem]),
    );
    tx.orcamento.upsert.mockResolvedValue(orcamento);
    tx.orcamento.findUnique.mockResolvedValue(orcamento);

    service = new ServiceOrderItemsService(
      { db } as unknown as DatabaseService,
      itemService as unknown as ItemService,
    );
  });

  describe('addPartItem', () => {
    it.each([StatusOrdemServico.RECEBIDA, StatusOrdemServico.EM_DIAGNOSTICO])(
      'should add the part with a price snapshot and recalculate the quote when the order is %s',
      async (status) => {
        orderIn(status);

        const quote = await service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 2,
        });

        expect(tx.ordemServicoItem.create).toHaveBeenCalledWith({
          data: {
            ordemServicoId: orderId,
            orcamentoId: 'quote-id',
            itemEstoqueId: partId,
            osItemQuantidade: 2,
            osItemPrecoUnitario: 3500,
          },
        });
        expect(tx.orcamento.updateMany).toHaveBeenCalledWith({
          where: { ordemServicoId: orderId, orcamentoVersao: 1 },
          data: expect.objectContaining({
            orcamentoValorTotal: 7000,
          }) as unknown,
        });
        expect(quote.orcamentoValorTotal).toBe(7000);
        expect(quote.itens).toHaveLength(1);
      },
    );

    it('should throw UnprocessableEntityException when the requested quantity exceeds the available stock', async () => {
      orderIn(StatusOrdemServico.RECEBIDA);

      // disponível = 20 - 5 = 15
      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 16,
        }),
      ).rejects.toThrow('Estoque insuficiente');
      expect(tx.ordemServicoItem.create).not.toHaveBeenCalled();
    });

    it('should count the quantity already in the order against the available stock', async () => {
      orderIn(StatusOrdemServico.RECEBIDA);
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([
        { osItemQuantidade: '14.000' },
      ]);

      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 2,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should accept exactly the available quantity', async () => {
      orderIn(StatusOrdemServico.RECEBIDA);

      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 15,
        }),
      ).resolves.toBeDefined();
    });

    it.each([
      StatusOrdemServico.AGUARDANDO_APROVACAO,
      StatusOrdemServico.AGUARDANDO_EXECUCAO,
      StatusOrdemServico.EM_EXECUCAO,
      StatusOrdemServico.FINALIZADA,
      StatusOrdemServico.ENTREGUE,
      StatusOrdemServico.ORCAMENTO_RECUSADO,
      StatusOrdemServico.CANCELADA,
    ])(
      'should throw ConflictException when the order is %s',
      async (status) => {
        orderIn(status);

        await expect(
          service.addPartItem(orderId, {
            itemEstoqueId: partId,
            osItemQuantidade: 1,
          }),
        ).rejects.toThrow(ConflictException);
        expect(tx.ordemServicoItem.create).not.toHaveBeenCalled();
      },
    );

    it('should throw NotFoundException when the order does not exist', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 1,
        }),
      ).rejects.toThrow('Ordem de serviço não encontrada');
    });

    it('should throw NotFoundException when the part does not exist', async () => {
      itemService.findItemById.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 1,
        }),
      ).rejects.toThrow('Peça não encontrada');
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when the part is inactive', async () => {
      itemService.findItemById.mockRejectedValueOnce(
        new BadRequestException('Item Filtro se encontra inativo!'),
      );

      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 1,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should rethrow unexpected errors from the catalog', async () => {
      itemService.findItemById.mockRejectedValueOnce(new Error('boom'));

      await expect(
        service.addPartItem(orderId, {
          itemEstoqueId: partId,
          osItemQuantidade: 1,
        }),
      ).rejects.toThrow('boom');
    });
  });

  describe('removePartItem', () => {
    it('should remove the item and recalculate the quote', async () => {
      orderIn(StatusOrdemServico.EM_DIAGNOSTICO);
      tx.ordemServicoItem.deleteMany.mockResolvedValueOnce({ count: 1 });

      const quote = await service.removePartItem(orderId, 'item-1');

      expect(tx.ordemServicoItem.deleteMany).toHaveBeenCalledWith({
        where: { osItemId: 'item-1', ordemServicoId: orderId },
      });
      expect(quote.ordemServicoId).toBe(orderId);
      expect(tx.orcamento.updateMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when the item is not in the order', async () => {
      orderIn(StatusOrdemServico.RECEBIDA);
      tx.ordemServicoItem.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.removePartItem(orderId, 'x')).rejects.toThrow(
        'Item não encontrado na OS',
      );
    });

    it('should throw ConflictException when the quote was already sent', async () => {
      orderIn(StatusOrdemServico.AGUARDANDO_APROVACAO);

      await expect(service.removePartItem(orderId, 'item-1')).rejects.toThrow(
        ConflictException,
      );
      expect(tx.ordemServicoItem.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('findQuote', () => {
    it('should return an empty draft when the order has no items yet', async () => {
      db.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoId: orderId,
      });
      db.orcamento.findUnique.mockResolvedValueOnce(null);
      db.ordemServicoItem.findMany.mockResolvedValueOnce([]);

      const quote = await new ServiceOrderItemsService(
        { db: { ...db } } as unknown as DatabaseService,
        itemService as unknown as ItemService,
      ).findQuote(orderId);

      expect(quote.orcamentoStatus).toBe(StatusOrcamento.RASCUNHO);
      expect(quote.orcamentoValorTotal).toBe(0);
      expect(quote.itens).toEqual([]);
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      db.ordemServico.findUnique.mockResolvedValueOnce(null);

      await expect(service.findQuote(orderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
