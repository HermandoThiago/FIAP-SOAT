# Validação HTTP integrada com PostgreSQL

Data: 03/11/2026. Ambiente: `docker compose up --build` (PostgreSQL 16, migrações, seed e API), `.env` criado a partir do `.env.example`. Os testes automatizados de HTTP usam serviços simulados; esta validação usa o banco real.

## Fluxo executado (script HTTP + conferência manual no Swagger)

| Etapa | Resultado |
|---|---|
| Login Admin, Mecânico e Cliente (usuários do seed) | 200 |
| Rota protegida sem token | 401 |
| Cliente em `GET /customers`; Mecânico em `POST /services` | 403 |
| Cliente com CPF válido; CPF inválido; CPF duplicado | 201; 400; 409 |
| Veículo com placa válida e inválida | 201; 400 |
| Serviço e item de estoque; movimento de entrada | 201 |
| OS criada por CPF; serviço e peça incluídos | 201 |
| Peça acima do estoque | 422 |
| Enviar orçamento antes do diagnóstico | 409 |
| Diagnóstico, envio do orçamento (gera token de acompanhamento) | 200 |
| `GET /tracking/...` sem token; com token de acompanhamento | 401; 200 |
| Iniciar execução antes da aprovação | 409 |
| Aprovação do orçamento pelo token de acompanhamento | 200 |
| Estoque após a aprovação | 15 em estoque, 2 reservados |
| Início da execução, finalização | 200 |
| Estoque após a finalização | 13 em estoque, 0 reservados |
| Entrega, histórico de status, listagem, detalhe e tempo médio de execução | 200 |

Resultado: 44 verificações automáticas, 0 falhas.

## Achado corrigido

O `POST /itens` aparecia no Swagger sem corpo de exemplo (`readOnly: true` em todos os campos) e com preço `10.5` para um campo inteiro em centavos. Corrigido em `src/modules/catalog/controllers/dtos/create-item.dto.ts` (sem `readOnly`, exemplo `4550`, enums e descrição do preço). Confirmado no `/docs-json` e no Swagger.

## Observação

Erros de validação de entrada (DTO) retornam 400; 422 é usado em regra de negócio, como estoque insuficiente (`docs/04-arquitetura/contrato-api.md`, §5).
