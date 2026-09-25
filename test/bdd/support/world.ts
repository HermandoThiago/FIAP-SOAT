import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { type Server } from 'node:http';

import { type INestApplication } from '@nestjs/common';
import request, { type Agent, type Response } from 'supertest';

// Aplicação compartilhada entre os cenários (uma instância por execução — hooks.ts). O World não pode recebê-la por
// `worldParameters` (só JSON), então os hooks a registram aqui antes do primeiro cenário.
let sharedApp: INestApplication | undefined;

export function registerApp(app: INestApplication): void {
  sharedApp = app;
}

export function releaseApp(): void {
  sharedApp = undefined;
}

// World do Cucumber-js (ADR-006; estrategia-de-testes.md §5): um cliente HTTP (supertest) sobre a API real e a última
// resposta recebida, que os steps comuns (steps/api.steps.ts) verificam.
export class ApiWorld extends World {
  readonly app: INestApplication;
  readonly agent: Agent;
  lastResponse?: Response;

  constructor(options: IWorldOptions) {
    super(options);
    if (!sharedApp) {
      throw new Error('A aplicação de teste não foi iniciada: verifique o BeforeAll em test/bdd/support/hooks.ts');
    }
    this.app = sharedApp;
    this.agent = request(sharedApp.getHttpServer() as Server);
  }

  get response(): Response {
    if (!this.lastResponse) {
      throw new Error('Nenhuma requisição foi enviada neste cenário ainda');
    }
    return this.lastResponse;
  }

  async get(path: string, token?: string): Promise<Response> {
    const req = this.agent.get(path);
    this.lastResponse = await (token ? req.set('Authorization', `Bearer ${token}`) : req);
    return this.lastResponse;
  }

  async post(path: string, body: unknown, token?: string): Promise<Response> {
    const req = this.agent.post(path).send(body as object);
    this.lastResponse = await (token ? req.set('Authorization', `Bearer ${token}`) : req);
    return this.lastResponse;
  }
}

setWorldConstructor(ApiWorld);
