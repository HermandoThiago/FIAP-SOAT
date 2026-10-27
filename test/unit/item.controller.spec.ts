import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ROLES_KEY, Role } from '../../src/modules/identity/auth';
import { ItemController } from '../../src/modules/catalog/controllers/item.controller';
import {
  CreateItemEstoqueDto,
  ListItensQueryDto,
  UpdateItemDto,
} from '../../src/modules/catalog/controllers/dtos';
import { ItemService } from '../../src/modules/catalog/services';
import {
  TipoItemEstoque,
  UnidadeMedida,
} from '../../src/generated/prisma/enums';

describe('ItemController', () => {
  let controller: ItemController;
  const reflector = new Reflector();
  const itemService = {
    createItem: jest.fn(),
    findAllItens: jest.fn(),
    findItemById: jest.fn(),
    updateItem: jest.fn(),
    deleteById: jest.fn(),
  };
  const itemId = 'a3f1c1b0-7c7e-4f0e-9b43-1f4b3d1c8a11';

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ItemController],
      providers: [{ provide: ItemService, useValue: itemService }],
    }).compile();

    controller = module.get(ItemController);
  });

  it('should restrict the controller to ADMIN and ATTENDANT roles', () => {
    expect(reflector.get(ROLES_KEY, ItemController)).toEqual([
      Role.ADMIN,
      Role.ATTENDANT,
    ]);
  });

  describe('createItem', () => {
    it('should delegate to the service and return the created item', async () => {
      const payload = {
        itemEstoqueTipo: TipoItemEstoque.PECA,
        itemEstoqueNome: 'Filtro de óleo',
        itemEstoqueUnidade: UnidadeMedida.UN,
        itemEstoquePrecoVenda: 30,
        itemEstoqueQuantidade: 5,
      } as CreateItemEstoqueDto;
      const created = { itemEstoqueId: itemId, ...payload };
      itemService.createItem.mockResolvedValue(created);

      await expect(controller.createItem(payload)).resolves.toBe(created);
      expect(itemService.createItem).toHaveBeenCalledWith(payload);
    });

    it('should propagate the error when the service fails', async () => {
      itemService.createItem.mockRejectedValue(new Error('boom'));

      await expect(
        controller.createItem({} as CreateItemEstoqueDto),
      ).rejects.toThrow('boom');
    });
  });

  describe('findAll', () => {
    it('should pass the query to the service and return the page', async () => {
      const query = { page: 2, pageSize: 10 } as ListItensQueryDto;
      const result = { items: [], total: 0, page: 2, pageSize: 10 };
      itemService.findAllItens.mockResolvedValue(result);

      await expect(controller.findAll(query)).resolves.toBe(result);
      expect(itemService.findAllItens).toHaveBeenCalledWith(query);
    });
  });

  describe('findItem', () => {
    it('should return the item found by id', async () => {
      const item = { itemEstoqueId: itemId };
      itemService.findItemById.mockResolvedValue(item);

      await expect(controller.findItem(itemId)).resolves.toBe(item);
      expect(itemService.findItemById).toHaveBeenCalledWith(itemId);
    });

    it('should propagate the error when the item does not exist', async () => {
      itemService.findItemById.mockRejectedValue(new Error('not found'));

      await expect(controller.findItem(itemId)).rejects.toThrow('not found');
    });
  });

  describe('updateItem', () => {
    it('should delegate id and payload to the service', async () => {
      const payload = { itemEstoqueReservada: 1 } as UpdateItemDto;
      itemService.updateItem.mockResolvedValue(undefined);

      await expect(
        controller.updateItem(itemId, payload),
      ).resolves.toBeUndefined();
      expect(itemService.updateItem).toHaveBeenCalledWith(itemId, payload);
    });
  });

  describe('deleteItem', () => {
    it('should delegate the deletion to the service', async () => {
      itemService.deleteById.mockResolvedValue(undefined);

      await expect(controller.deleteItem(itemId)).resolves.toBeUndefined();
      expect(itemService.deleteById).toHaveBeenCalledWith(itemId);
    });
  });
});
