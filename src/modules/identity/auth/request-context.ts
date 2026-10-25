import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AuthUser } from './auth.types';

interface Store {
  user?: AuthUser;
}

/**
 * Dá acesso ao usuário autenticado em qualquer service, sem passá-lo por parâmetro.
 * É preenchido pelo `RequestContextInterceptor` (depois dos guards) e vale só durante a requisição.
 */
@Injectable()
export class RequestContext {
  private readonly storage = new AsyncLocalStorage<Store>();

  run<T>(user: AuthUser | undefined, fn: () => T): T {
    return this.storage.run({ user }, fn);
  }

  /** Usuário logado, ou `undefined` em rota pública / fora de uma requisição. */
  get user(): AuthUser | undefined {
    return this.storage.getStore()?.user;
  }

  /** Id do usuário logado; lança 401 se não houver. */
  get userId(): string {
    return this.requireUser().userId;
  }

  requireUser(): AuthUser {
    const { user } = this;
    if (!user) throw new UnauthorizedException('Usuário não autenticado');
    return user;
  }
}
