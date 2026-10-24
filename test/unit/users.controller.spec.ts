import { ParseUUIDPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  Role,
} from '../../src/modules/identity/auth';
import { UserController } from '../../src/modules/identity/controllers/users.controller';
import {
  ListUsersQueryDto,
  UpdateUserDto,
} from '../../src/modules/identity/dtos';
import { UsersService } from '../../src/modules/identity/services';

describe('UserController', () => {
  let controller: UserController;
  const reflector = new Reflector();
  const usersService = {
    findAll: jest.fn(),
    findUserById: jest.fn(),
    deleteUser: jest.fn(),
    updateUser: jest.fn(),
  };
  const userId = '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11';

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UserController);
  });

  describe('findAllUsers', () => {
    it('should delegate the query to UsersService and return the page', async () => {
      const query = { page: 1, pageSize: 10 } as ListUsersQueryDto;
      const page = { users: [], total: 0, page: 1, pageSize: 10 };
      usersService.findAll.mockResolvedValue(page);

      await expect(controller.findAllUsers(query)).resolves.toBe(page);
      expect(usersService.findAll).toHaveBeenCalledWith(query);
    });

    it('should propagate the error when UsersService rejects', async () => {
      const error = new Error('db down');
      usersService.findAll.mockRejectedValue(error);

      await expect(
        controller.findAllUsers({ page: 1, pageSize: 10 } as ListUsersQueryDto),
      ).rejects.toBe(error);
    });
  });

  describe('findUserById', () => {
    it('should return the user found by UsersService', async () => {
      const user = { usuarioId: userId };
      usersService.findUserById.mockResolvedValue(user);

      await expect(controller.findUserById(userId)).resolves.toBe(user);
      expect(usersService.findUserById).toHaveBeenCalledWith(userId);
    });

    it('should propagate the error when the user is not found', async () => {
      const error = new Error('not found');
      usersService.findUserById.mockRejectedValue(error);

      await expect(controller.findUserById(userId)).rejects.toBe(error);
    });
  });

  describe('deleteUserById', () => {
    it('should deactivate the user through UsersService and return nothing', async () => {
      usersService.deleteUser.mockResolvedValue(undefined);

      await expect(controller.deleteUserById(userId)).resolves.toBeUndefined();
      expect(usersService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should propagate the error when the user is not found', async () => {
      const error = new Error('not found');
      usersService.deleteUser.mockRejectedValue(error);

      await expect(controller.deleteUserById(userId)).rejects.toBe(error);
    });
  });

  describe('updateUser', () => {
    it('should delegate the id and payload to UsersService and return the updated user', async () => {
      const payload = { usuarioNome: 'Novo Nome' } as UpdateUserDto;
      const updated = { usuarioId: userId, usuarioNome: 'Novo Nome' };
      usersService.updateUser.mockResolvedValue(updated);

      await expect(controller.updateUser(userId, payload)).resolves.toBe(
        updated,
      );
      expect(usersService.updateUser).toHaveBeenCalledWith(userId, payload);
    });

    it('should propagate the error when the user is not found', async () => {
      const error = new Error('not found');
      usersService.updateUser.mockRejectedValue(error);

      await expect(
        controller.updateUser(userId, {} as UpdateUserDto),
      ).rejects.toBe(error);
    });
  });

  describe('route protection metadata', () => {
    const meta = <T>(key: string, name: keyof UserController) =>
      reflector.getAllAndOverride<T>(key, [
        UserController.prototype[name] as () => unknown,
        UserController,
      ]);

    it('should keep the controller private by default', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, UserController),
      ).toBeUndefined();
      expect(meta(IS_PUBLIC_KEY, 'findAllUsers')).toBeUndefined();
      expect(meta(IS_PUBLIC_KEY, 'findUserById')).toBeUndefined();
      expect(meta(IS_PUBLIC_KEY, 'deleteUserById')).toBeUndefined();
      expect(meta(IS_PUBLIC_KEY, 'updateUser')).toBeUndefined();
    });

    it('should restrict the listing and lookup to ADMIN and ATTENDANT', () => {
      expect(meta(ROLES_KEY, 'findAllUsers')).toEqual([
        Role.ADMIN,
        Role.ATTENDANT,
      ]);
      expect(meta(ROLES_KEY, 'findUserById')).toEqual([
        Role.ADMIN,
        Role.ATTENDANT,
      ]);
    });

    it('should restrict the deletion to ADMIN', () => {
      expect(meta(ROLES_KEY, 'deleteUserById')).toEqual([Role.ADMIN]);
    });

    it('should validate the userId param as UUID on every route with an id', () => {
      const paramTypes = (name: keyof UserController) =>
        Reflect.getMetadata(
          '__routeArguments__',
          UserController,
          name,
        ) as Record<string, { data: string; pipes: unknown[] }>;

      for (const name of [
        'findUserById',
        'deleteUserById',
        'updateUser',
      ] as const) {
        const params = Object.values(paramTypes(name)).filter(
          (arg) => arg.data === 'userId',
        );
        expect(params).toHaveLength(1);
        expect(params[0].pipes).toContain(ParseUUIDPipe);
      }
    });
  });
});
