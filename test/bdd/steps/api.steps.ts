import assert from 'node:assert/strict';

import { Then, When } from '@cucumber/cucumber';

import { problemTypeFor } from '../../../src/shared/http/problem-details';
import { type ApiWorld } from '../support/world';

// Steps comuns em português, reutilizáveis pelas features dos 3 fluxos principais (estrategia-de-testes.md §5).
// Com "# language: pt" nas features, Quando/Então/E mapeiam para When/Then do pacote.

When('consulto {string}', async function (this: ApiWorld, path: string) {
  await this.get(path);
});

When('envio POST {string} com o corpo:', async function (this: ApiWorld, path: string, body: string) {
  await this.post(path, JSON.parse(body));
});

Then('a resposta é {int}', function (this: ApiWorld, status: number) {
  assert.equal(this.response.status, status, `Resposta esperada ${status}, recebida ${this.response.status}`);
});

Then('o corpo contém {string} igual a {string}', function (this: ApiWorld, key: string, expected: string) {
  const body = this.response.body as Record<string, unknown>;
  assert.ok(key in body, `O corpo não contém a chave "${key}"`);
  assert.equal(String(body[key]), expected);
});

// Problem Details (RFC 9457; contrato-api.md §5): content-type próprio, type/title da tabela oficial e instance da rota.
Then('o corpo é um Problem Details com status {int}', function (this: ApiWorld, status: number) {
  const body = this.response.body as Record<string, unknown>;
  const expected = problemTypeFor(status);
  assert.match(String(this.response.headers['content-type']), /application\/problem\+json/);
  assert.equal(body.status, status);
  assert.equal(body.type, expected.type);
  assert.equal(body.title, expected.title);
  assert.equal(typeof body.instance, 'string');
});
