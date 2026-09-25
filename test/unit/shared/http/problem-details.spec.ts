import { PROBLEM_TYPE_BASE, problemTypeFor } from '../../../../src/shared/http/problem-details';

// Problem Details (contrato-api.md §5): `type` com slug em inglês, `title` em português (ADR-013).
describe('problemTypeFor', () => {
  it.each([
    [400, 'bad-request', 'Requisição inválida'],
    [401, 'unauthorized', 'Não autenticado'],
    [403, 'forbidden', 'Acesso negado'],
    [404, 'not-found', 'Recurso não encontrado'],
    [405, 'method-not-allowed', 'Método não permitido'],
    [409, 'conflict', 'Conflito'],
    [413, 'payload-too-large', 'Corpo da requisição muito grande'],
    [415, 'unsupported-media-type', 'Tipo de conteúdo não suportado'],
    [422, 'validation', 'Dados inválidos'],
    [429, 'too-many-requests', 'Muitas requisições'],
    [500, 'internal', 'Erro interno'],
    [503, 'service-unavailable', 'Serviço indisponível'],
  ])('should map status %i to the %s problem type when the status is known', (status, slug, title) => {
    expect(problemTypeFor(status)).toEqual({ type: `${PROBLEM_TYPE_BASE}${slug}`, title });
  });

  it.each([418, 502, 0])('should fall back to the internal error type when the status %i is unknown', (status) => {
    expect(problemTypeFor(status)).toEqual({ type: `${PROBLEM_TYPE_BASE}internal`, title: 'Erro interno' });
  });

  it('should build absolute type URIs when the base is applied', () => {
    expect(problemTypeFor(422).type).toBe('https://oficina.local/errors/validation');
  });
});
