import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ItemService } from '../../src/modules/catalog/services/item.service';
import { ItemEstoque } from '../../src/modules/catalog/domain/entities';
import { CreateItemEstoqueDto } from '../../src/modules/catalog/controllers/dtos';
import { RequestContext } from '../../src/modules/identity/auth';
import { DatabaseService } from '../../src/shared/database/database.service';
import {
  TipoItemEstoque,
  UnidadeMedida,
} from '../../src/generated/prisma/enums';

describe('ItemService', () => {
  const db = {
    itemEstoque: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: ItemService;

  const row = (overrides: Record<string, unknown> = {}) => ({
    itemEstoqueId: 'item-id',
    itemEstoqueTipo: TipoItemEstoque.PECA,
    itemEstoqueCodigo: 'PC-AAAA-BBBB',
    itemEstoqueNome: 'Filtro de óleo',
    itemEstoqueDescricao: null,
    itemEstoqueUnidade: UnidadeMedida.UN,
    itemEstoquePrecoVenda: 30,
    itemEstoqueQuantidade: 10,
    itemEstoqueReservada: 2,
    itemEstoqueAtivo: true,
    itemEstoqueCriadoEm: new Date(),
    itemEstoqueAtualizadoEm: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ItemService(
      { db } as unknown as DatabaseService,
      {} as RequestContext,
    );
  });

  describe('createItem', () => {
    const payload = {
      itemEstoqueTipo: TipoItemEstoque.PECA,
      itemEstoqueNome: 'Filtro de óleo',
      itemEstoqueDescricao: 'Filtro',
      itemEstoqueUnidade: UnidadeMedida.UN,
      itemEstoquePrecoVenda: 30,
      itemEstoqueQuantidade: 10,
    } as CreateItemEstoqueDto;

    it('should create a PECA item with a PC- prefixed code', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(null);
      db.itemEstoque.create.mockResolvedValue(row());

      const result = await service.createItem(payload);

      expect(db.itemEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemEstoqueNome: 'Filtro de óleo',
          itemEstoqueCodigo: expect.stringMatching(
            /^PC-[A-Z2-9]{4}-[A-Z2-9]{4}$/,
          ),
        }),
      });
      expect(result.itemEstoqueId).toBe('item-id');
      expect(result).toBeInstanceOf(ItemEstoque);
    });

    it('should use the INS- prefix when the item is an INSUMO', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(null);
      db.itemEstoque.create.mockResolvedValue(row());

      await service.createItem({
        ...payload,
        itemEstoqueTipo: TipoItemEstoque.INSUMO,
      });

      expect(db.itemEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemEstoqueCodigo: expect.stringMatching(/^INS-/),
        }),
      });
    });

    it('should retry code generation when the code already exists', async () => {
      db.itemEstoque.findUnique
        .mockResolvedValueOnce({ itemEstoqueId: 'x' })
        .mockResolvedValueOnce(null);
      db.itemEstoque.create.mockResolvedValue(row());

      await service.createItem(payload);

      expect(db.itemEstoque.findUnique).toHaveBeenCalledTimes(2);
      expect(db.itemEstoque.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when no unique code is found in 5 attempts', async () => {
      db.itemEstoque.findUnique.mockResolvedValue({ itemEstoqueId: 'x' });

      await expect(service.createItem(payload)).rejects.toThrow(
        ConflictException,
      );
      expect(db.itemEstoque.findUnique).toHaveBeenCalledTimes(5);
      expect(db.itemEstoque.create).not.toHaveBeenCalled();
    });
  });

  describe('findItemById', () => {
    it('should return the item when it exists and is active', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(row());

      const result = await service.findItemById('item-id');

      expect(db.itemEstoque.findUnique).toHaveBeenCalledWith({
        where: { itemEstoqueId: 'item-id' },
      });
      expect(result.itemEstoqueNome).toBe('Filtro de óleo');
    });

    it('should throw NotFoundException when the item does not exist', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(null);

      await expect(service.findItemById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when the item is inactive', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(
        row({ itemEstoqueAtivo: false }),
      );

      await expect(service.findItemById('item-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllItens', () => {
    it('should return a paginated list of active items', async () => {
      db.itemEstoque.findMany.mockResolvedValue([row()]);
      db.itemEstoque.count.mockResolvedValue(21);

      const result = await service.findAllItens({
        page: 3,
        pageSize: 10,
        itemEstoqueTipo: TipoItemEstoque.PECA,
      });

      expect(db.itemEstoque.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { itemEstoqueAtivo: true, itemEstoqueTipo: 'PECA' },
          take: 10,
          skip: 20,
        }),
      );
      expect(db.itemEstoque.count).toHaveBeenCalledWith({
        where: { itemEstoqueAtivo: true, itemEstoqueTipo: 'PECA' },
      });
      expect(result).toMatchObject({ total: 21, page: 3, pageSize: 10 });
      expect(result.items).toHaveLength(1);
    });

    it('should return an empty page when there are no items', async () => {
      db.itemEstoque.findMany.mockResolvedValue([]);
      db.itemEstoque.count.mockResolvedValue(0);

      const result = await service.findAllItens({ page: 1, pageSize: 20 });

      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    });
  });

  describe('updateItem', () => {
    it('should update the item when reserved does not exceed the stock', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(row());
      db.itemEstoque.update.mockResolvedValue(undefined);

      await expect(
        service.updateItem('item-id', {
          itemEstoqueQuantidade: 8,
          itemEstoqueReservada: 8,
        }),
      ).resolves.toBeUndefined();

      expect(db.itemEstoque.update).toHaveBeenCalledWith({
        where: { itemEstoqueId: 'item-id' },
        data: expect.objectContaining({
          itemEstoqueQuantidade: 8,
          itemEstoqueReservada: 8,
          itemEstoqueAtualizadoEm: expect.any(Date),
        }),
      });
    });

    it('should compare against the current stock when quantity is not sent', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(
        row({ itemEstoqueQuantidade: 10 }),
      );

      await expect(
        service.updateItem('item-id', { itemEstoqueReservada: 11 }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(db.itemEstoque.update).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when the new quantity is below the reserved amount', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(
        row({ itemEstoqueReservada: 5 }),
      );

      await expect(
        service.updateItem('item-id', {
          itemEstoqueQuantidade: 3,
          itemEstoqueReservada: 5,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw NotFoundException when the item does not exist', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem('missing', { itemEstoqueReservada: 0 }),
      ).rejects.toThrow(NotFoundException);
      expect(db.itemEstoque.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('should soft delete the item by deactivating it', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(row());
      db.itemEstoque.update.mockResolvedValue(undefined);

      await expect(service.deleteById('item-id')).resolves.toBeUndefined();

      expect(db.itemEstoque.update).toHaveBeenCalledWith({
        where: { itemEstoqueId: 'item-id' },
        data: {
          itemEstoqueAtivo: false,
          itemEstoqueAtualizadoEm: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when the item does not exist', async () => {
      db.itemEstoque.findUnique.mockResolvedValue(null);

      await expect(service.deleteById('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(db.itemEstoque.update).not.toHaveBeenCalled();
    });
  });
});
