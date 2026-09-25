// Formato único de erro da API — RFC 9457 Problem Details (contrato-api.md §5): chaves em inglês, textos em português.
export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  errors?: FieldError[];
  requestId?: string;
}

export const PROBLEM_TYPE_BASE = 'https://oficina.local/errors/';

const PROBLEM_BY_STATUS: Record<number, { slug: string; title: string }> = {
  400: { slug: 'bad-request', title: 'Requisição inválida' },
  401: { slug: 'unauthorized', title: 'Não autenticado' },
  403: { slug: 'forbidden', title: 'Acesso negado' },
  404: { slug: 'not-found', title: 'Recurso não encontrado' },
  405: { slug: 'method-not-allowed', title: 'Método não permitido' },
  409: { slug: 'conflict', title: 'Conflito' },
  413: { slug: 'payload-too-large', title: 'Corpo da requisição muito grande' },
  415: { slug: 'unsupported-media-type', title: 'Tipo de conteúdo não suportado' },
  422: { slug: 'validation', title: 'Dados inválidos' },
  429: { slug: 'too-many-requests', title: 'Muitas requisições' },
  500: { slug: 'internal', title: 'Erro interno' },
  503: { slug: 'service-unavailable', title: 'Serviço indisponível' },
};

export function problemTypeFor(status: number): { type: string; title: string } {
  const entry = PROBLEM_BY_STATUS[status] ?? PROBLEM_BY_STATUS[500];
  return { type: `${PROBLEM_TYPE_BASE}${entry.slug}`, title: entry.title };
}
