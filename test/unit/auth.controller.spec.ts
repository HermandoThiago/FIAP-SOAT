import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  Role,
} from '../../src/modules/identity/auth';
import { AuthController } from '../../src/modules/identity/controllers/auth.controller';
import { LoginDto, RegisterUserDto } from '../../src/modules/identity/dtos';
import { AuthService } from '../../src/modules/identity/services';

describe('AuthController', () => {
  let controller: AuthController;
  const reflector = new Reflector();
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('register', () => {
    it('deve delegar ao AuthService e retornar o usuário criado quando o payload é válido', async () => {
      const payload = { usuarioEmail: 'a@oficina.local' } as RegisterUserDto;
      const created = { usuarioId: 'user-id' };
      authService.register.mockResolvedValue(created);

      await expect(controller.register(payload)).resolves.toBe(created);
      expect(authService.register).toHaveBeenCalledWith(payload);
    });

    it('deve propagar o erro quando o AuthService rejeita', async () => {
      const error = new Error('forbidden');
      authService.register.mockRejectedValue(error);

      await expect(controller.register({} as RegisterUserDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('login', () => {
    it('deve retornar o par de tokens quando as credenciais são válidas', async () => {
      const payload: LoginDto = { email: 'a@oficina.local', senha: 'secret' };
      const tokens = {
        accessToken: 'a',
        refreshToken: 'r',
        tokenType: 'Bearer',
      };
      authService.login.mockResolvedValue(tokens);

      await expect(controller.login(payload)).resolves.toBe(tokens);
      expect(authService.login).toHaveBeenCalledWith(payload);
    });

    it('deve propagar o erro quando as credenciais são inválidas', async () => {
      const error = new Error('unauthorized');
      authService.login.mockRejectedValue(error);

      await expect(controller.login({ email: 'a', senha: 'b' })).rejects.toBe(
        error,
      );
    });
  });

  describe('refresh', () => {
    it('deve repassar ao AuthService apenas a string do refresh token', async () => {
      const tokens = { accessToken: 'a2', refreshToken: 'r2' };
      authService.refresh.mockResolvedValue(tokens);

      await expect(controller.refresh({ refreshToken: 'r1' })).resolves.toBe(
        tokens,
      );
      expect(authService.refresh).toHaveBeenCalledWith('r1');
    });

    it('deve propagar o erro quando o refresh token é inválido', async () => {
      const error = new Error('invalid');
      authService.refresh.mockRejectedValue(error);

      await expect(controller.refresh({ refreshToken: 'x' })).rejects.toBe(
        error,
      );
    });
  });

  describe('logout', () => {
    it('deve chamar o AuthService e não retornar nada', async () => {
      authService.logout.mockResolvedValue(undefined);

      await expect(
        controller.logout({ refreshToken: 'r1' }),
      ).resolves.toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith('r1');
    });
  });

  describe('metadados de proteção das rotas', () => {
    const meta = <T>(key: string, name: keyof AuthController) =>
      reflector.getAllAndOverride<T>(key, [
        AuthController.prototype[name] as () => unknown,
        AuthController,
      ]);

    it('deve manter o controller privado por padrão', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, AuthController),
      ).toBeUndefined();
    });

    it('deve tornar somente o login público', () => {
      expect(meta(IS_PUBLIC_KEY, 'login')).toBe(true);
      expect(meta(IS_PUBLIC_KEY, 'register')).toBeUndefined();
      expect(meta(IS_PUBLIC_KEY, 'refresh')).toBeUndefined();
      expect(meta(IS_PUBLIC_KEY, 'logout')).toBeUndefined();
    });

    it('deve restringir o register a ADMIN e ATTENDANT', () => {
      expect(meta(ROLES_KEY, 'register')).toEqual([Role.ADMIN, Role.ATTENDANT]);
    });
  });
});
