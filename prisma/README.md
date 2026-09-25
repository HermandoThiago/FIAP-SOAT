# `prisma/` — banco de dados (Prisma 7 + PostgreSQL 16)

Concretiza `docs/04-arquitetura/modelo-de-dados.md` (ADR-002, E-17): um schema PostgreSQL por módulo (`customers`,
`catalog`, `service_orders`, `identity`) via `multiSchema`; ids `@id @db.Uuid` **sem** `@default` (o id nasce no domínio,
ADR-009); referências entre módulos são colunas `uuid` com índice, nunca FK; `CHECK`s, índices parciais e a sequência
anual `service_orders.service_order_number_seq` ficam em SQL escrito à mão nas migrações.

| Arquivo | O que é |
|---|---|
| `schema.prisma` | Models por módulo (`@@schema`, `@@map`/`@map` em `snake_case`); gera o cliente em `src/generated/prisma` (ignorado no git) |
| `migrations/` | Prisma Migrate: `init_schemas` → `customers` → `catalog` → `service_orders` → `identity` (§6) |
| `seed.ts` | Dados de demonstração (§5), só em `APP_ENV=dev` |

A URL do banco (`DATABASE_URL`), a do banco shadow (`SHADOW_DATABASE_URL`, opcional) e o comando de seed ficam em
`prisma.config.ts` (raiz), que lê o `.env`.

## Nova migração (SQL editado à mão)

1. Altere `schema.prisma` (tabelas, colunas, índices, únicos).
2. `npx prisma migrate dev --create-only --name <modulo>_<descricao>` gera `migrations/<timestamp>_<nome>/migration.sql`
   **sem aplicar**.
3. Edite o SQL: acrescente `CHECK`s (com nome explícito, como nas migrações existentes), sequências e o que o Prisma não
   modela. Não altere o que ele gerou para tabelas/índices — é isso que o drift check compara.
4. `npx prisma migrate dev` aplica no banco local (e detecta drift com o banco shadow); depois `npx prisma generate`.
5. Migração já aplicada por outra pessoa não se edita: crie outra. Em ambientes que não são de desenvolvimento use só
   `npx prisma migrate deploy` (é o que o compose e os testes de integração rodam).

### Banco shadow (`SHADOW_DATABASE_URL`)

`migrate dev` e o drift check "pasta `migrations/` × `schema.prisma`" aplicam todas as migrações num banco **shadow**
vazio e comparam o resultado. O Prisma 7 removeu a flag `--shadow-database-url`: a URL vem de
`datasource.shadowDatabaseUrl` em `prisma.config.ts`, que lê `process.env.SHADOW_DATABASE_URL` **quando definida**
(`.env.example` traz `SHADOW_DATABASE_URL=postgresql://oficina:oficina@localhost:5432/oficina_shadow` — o banco
`oficina_shadow` é criado junto com `oficina` e `oficina_test`). Sem a variável, o Prisma cria e apaga um banco temporário
sozinho, o que funciona em desenvolvimento porque o usuário local `oficina` tem `CREATEDB`; num PostgreSQL sem esse
privilégio a variável é obrigatória. O shadow é descartável — o Prisma o **apaga e recria a cada uso** —, então nunca
aponte `SHADOW_DATABASE_URL` para um banco com dados. O Prisma também recusa qualquer comando (até `migrate deploy`) se
`DATABASE_URL` e `SHADOW_DATABASE_URL` apontarem para o mesmo banco; para rodar migrações **no** `oficina_shadow` de
propósito (ex.: validar a pasta `migrations/` do zero), sobrescreva `SHADOW_DATABASE_URL` com outro nome de banco na
mesma chamada.

## Verificar drift

```bash
# banco migrado (DATABASE_URL) × schema.prisma — exit 0 = sem diferença, 2 = drift, 1 = erro
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code

# pasta migrations × schema.prisma — aplica as migrações no banco shadow (SHADOW_DATABASE_URL, ver acima) e compara
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code

# como o Prisma enxerga o banco (útil para conferir predicados de índices parciais)
npx prisma db pull --print
```

O diff **ignora** `CHECK`s e sequências (o `db pull` só os lista como aviso) — por isso podem ficar só no SQL. Ele **não
ignora** índices parciais: se existirem no banco e não no schema, aparecem como `DROP INDEX`.

## Recomeçar o banco do zero

`npx prisma migrate reset` apaga **tudo** (dados, migrações aplicadas), reaplica `migrations/` e roda o seed (pule com
`--skip-seed`). Ele pede confirmação interativa e, em agentes/CI, consentimento explícito; o equivalente não interativo é:

```bash
PGPASSWORD=oficina psql -h localhost -U oficina -d oficina -c 'DROP SCHEMA IF EXISTS customers, catalog, service_orders, identity CASCADE; DROP TABLE IF EXISTS public._prisma_migrations;'
npx prisma migrate deploy && npx prisma generate && APP_ENV=dev npx prisma db seed
```

## Índices parciais (decisão)

Os índices parciais da §3 ficam declarados no `schema.prisma` com a preview `partialIndexes` (Prisma 7.10), para que o
schema continue sendo a fonte da verdade e o `migrate dev` funcione sem drift:

- `@@unique([document], where: { active: true })`, `@@unique([licensePlate], where: { active: true })` e
  `@@unique([customerId], where: { customerId: { not: null } })` — a preview só expressa igualdade e `not`.
- "1 OS aberta por veículo" (`status NOT IN ('DELIVERED','CANCELLED')`) não é expressável, então vai em
  `where: raw("...")`. O Prisma compara o texto do `raw()` **literalmente** com o predicado que o PostgreSQL devolve ao
  deparsear (o que `db pull --print` mostra); por isso o texto está na forma normalizada
  `(((status)::text <> 'DELIVERED'::text) AND ((status)::text <> 'CANCELLED'::text))`, idêntica no schema e na migração.
  Escrever `status NOT IN (...)` no `raw()` aparece como drift. Ao criar um `raw()` novo: aplique o SQL, rode
  `db pull --print` e copie o predicado de lá.
- Efeito no cliente: `document`, `licensePlate` e `customerId` entram no `WhereUniqueInput`, mas o `upsert` nativo
  (`INSERT … ON CONFLICT`) não casa com índice parcial. Use `upsert({ where: { document, active: true } })` (o Prisma
  passa a fazer select + update/insert), como o seed faz.

## Integridade referencial e nulidade (decisão)

- **FK só dentro do mesmo schema** (ADR-002/003); entre módulos a coluna é `uuid` indexada e a consistência é
  responsabilidade do serviço de aplicação — não há `ON DELETE` a escolher, e desativar cliente/veículo/peça não toca nas
  OS que os referenciam. Políticas `ON DELETE` das FKs internas:
  - `vehicles.customer_id → customers` e `stock_movements.part_id → parts`: **`RESTRICT`**. Cliente e peça nunca são
    apagados pela API (são desativados com `active = false`), e a movimentação é o razão imutável do estoque (ADR-012):
    apagar uma peça com histórico perderia a trilha. `ON UPDATE CASCADE` é o padrão do Prisma e é inócuo (o id nunca
    muda).
  - `service_order_service_items`, `service_order_part_items` e `service_order_status_history → service_orders`:
    **`CASCADE`**. Itens e histórico só existem dentro do agregado `ServiceOrder`; se a raiz sai (reset, limpeza dos
    testes de integração), os filhos vão junto. A API não apaga OS — cancelar é uma transição (ADR-010).
- **`stock_movements.user_id` é nulo** quando a movimentação nasce de uma ação do cliente: a `RESERVATION` da aprovação do
  orçamento chega por `/tracking` (token de acompanhamento ou login `CUSTOMER`, ADR-011), sem usuário de equipe; quem
  aprovou fica registrado em `service_order_status_history.actor = 'CUSTOMER'`. As demais movimentações (`INBOUND`,
  `OUTBOUND` na finalização, `RELEASE`, `ADJUSTMENT`) partem da equipe e carregam o usuário — regra do serviço de
  aplicação, não do banco (a coluna é nula para todos os tipos). `service_order_id` é nulo nas movimentações sem OS
  (entrada e ajuste).
- **`service_orders.number`** tem, além do `UNIQUE`, o `CHECK` `service_orders_number_format_check`
  (`^OS-[0-9]{4}-[0-9]{6}$`): defesa em profundidade do VO `ServiceOrderNumber` (ADR-009), junto com a sequência anual
  limitada a `999999`.

## Seed de demonstração

```bash
APP_ENV=dev npx prisma db seed   # exige DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD e SEED_PASSWORD (falha com mensagem clara)
```

- Em qualquer outro `APP_ENV` imprime um aviso e sai com código 0 sem tocar no banco.
- Determinístico (UUID v4 fixos, datas UTC fixas em 2026) e idempotente **sobre os próprios registros**: cada execução
  faz upsert por chave natural (e-mail, documento, placa, nome do serviço, SKU, número da OS; filhos e movimentações por
  id fixo) numa única transação. Ele **não** restaura o estado de demonstração: não apaga nem desfaz OS, movimentações
  de estoque, clientes ou usuários criados pela API depois — só reescreve os registros de demonstração. Consequências:
  (1) `stock_quantity`/`reserved_quantity` das peças de demonstração voltam ao valor do seed, mas as movimentações que
  a API registrou continuam no histórico e deixam de bater com o saldo; (2) se um registro de demonstração foi alterado
  de forma incompatível, o seed **pode falhar** numa constraint — ex.: cliente ou veículo de demonstração desativado pela
  API (o seed procura só entre ativos e tenta recriar com o mesmo id: viola a chave primária), OS de demonstração que
  avançou de status ou nova OS aberta para o mesmo veículo (índice "1 OS aberta por veículo"). Para voltar de fato ao
  estado de demonstração, recomece do zero (`npx prisma migrate reset` ou os comandos com `psql` acima) e rode o seed.
- **Senhas:** `password_hash` é gravado **só na criação** do usuário (`update` do upsert sem `passwordHash`). Uma senha
  alterada pela API sobrevive a novas execuções do seed; para restaurar a senha do `.env`, apague o usuário ou recomece o
  banco. Nome, papéis e `customer_id` continuam sendo reescritos.
- Conteúdo (modelo-de-dados.md §5): 4 usuários (`ADMIN_EMAIL` como `MANAGER`; `mechanic@oficina.local`,
  `attendant@oficina.local` e `customer@oficina.local` com `SEED_PASSWORD`, bcrypt custo 12), 3 clientes (2 CPF, 1 CNPJ
  fictícios com dígitos verificadores calculados e conferidos no próprio seed), 4 veículos (2 placas antigas, 2 Mercosul),
  6 serviços, 8 peças/insumos (2 abaixo do mínimo) com `INBOUND` inicial, e 4 OS: `OS-2026-000001` RECEIVED,
  `OS-2026-000002` AWAITING_APPROVAL (orçamento enviado; o usuário `customer@…` é o cliente dela — ADR-011),
  `OS-2026-000003` COMPLETED e `OS-2026-000004` DELIVERED (com `RESERVATION` + `OUTBOUND` coerentes: reservado volta a 0 e
  o estoque cai — ADR-012), todas com histórico completo. A sequência é posicionada em 4 (sem retroceder).

## `tracking_tokens`

Não criada. A ADR-011 usa JWT assinado (`aud=tracking`, `sub=serviceOrderId`, 7 dias) sem estado no banco; a tabela só
entraria para **revogação** de token (Could). Se for adotada, entra como migração própria no schema `service_orders`
(FK para `service_orders`, `token_hash` único, `expires_at`, `revoked_at`).
