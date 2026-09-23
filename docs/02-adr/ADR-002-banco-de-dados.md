# ADR-002 — Banco de dados do MVP (com justificativa exigida no enunciado)

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-05 encerrada em 16/09/2026 |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-05** |
| Data | 2026-09-14 |
| Relacionadas | ADR-001, ADR-003, ADR-012, `docs/04-arquitetura/modelo-de-dados.md` |

## Contexto e problema

"A escolha do banco de dados é livre, mas é necessário **justificar** a preferência." O domínio tem entidades
relacionadas (cliente → veículos → OS → itens), **transações** com invariantes (aprovar orçamento + reservar estoque
atomicamente; finalizar + baixar), consultas agregadas (tempo médio) e valores monetários. Na Fase 4 o curso apresenta bancos documentais,
colunares e de grafos, com "um banco por microsserviço" — o monólito de agora deve facilitar essa separação.

## Critérios de decisão

1. Integridade transacional e consistência (estoque, status, orçamento) — peso 5
2. Suporte maduro na linguagem escolhida (ORM/migrações/Testcontainers) — peso 4
3. Facilidade de subir no `docker-compose` e de rodar testes — peso 4
4. Caminho na AWS nas próximas fases (RDS/Aurora, custo, Free Tier) — peso 3
5. Justificativa fácil de defender no vídeo — peso 3

## Opções consideradas

### Opção A — PostgreSQL 16

- **Prós:** relacional + ACID; tipos ricos (`numeric` para dinheiro, `uuid`, `jsonb` para snapshots/flexibilidade,
  `timestamptz`); constraints/checks garantem invariantes (estoque ≥ 0); consultas agregadas simples; excelente em todos
  os ORMs; Testcontainers oficial; RDS/Aurora PostgreSQL na AWS (Fase 2+); gratuito e padrão de mercado.
- **Contras:** nenhum relevante para o MVP; exige modelar bem (é o que queremos).
- **Fases futuras:** um *schema* por módulo hoje → um banco por microsserviço amanhã; suporte a réplicas/leitura.

### Opção B — MySQL 8 / MariaDB

- **Prós:** relacional, ACID (InnoDB), amplamente conhecido; RDS.
- **Contras:** tipagem mais frouxa (modo estrito precisa ser configurado), menos recursos (sem `jsonb` indexável, CTEs mais limitadas em versões antigas), `DECIMAL` ok.
- **Fases futuras:** equivalente a A, com ferramental um pouco menor.

### Opção C — MongoDB

- **Prós:** flexibilidade de esquema; a OS como documento (itens embutidos) é natural; DocumentDB/Atlas na AWS.
- **Contras:** transações multi-documento existem, mas o domínio é essencialmente relacional (cliente/veículo/catálogo/estoque
  referenciados); integridade referencial e agregações de métrica ficam no código; justificativa mais difícil frente a
  "controle de estoque" e "orçamento".
- **Fases futuras:** pode ser a escolha para **um** contexto (ex.: acompanhamento/leitura) na Fase 4, não para o monólito inteiro.

### Opção D — SQL Server (se ADR-001 = .NET)

- **Prós:** integração excelente com EF Core; relacional/ACID.
- **Contras:** imagem Docker pesada (~1,5 GB), licença em produção; RDS SQL Server mais caro; menos neutro para outras linguagens.

## Recomendação (não vinculante)

**PostgreSQL 16.** Justificativa pronta para README/vídeo:

> "Escolhemos PostgreSQL porque o domínio da oficina é relacional e transacional: a aprovação do orçamento precisa mudar o
> status da OS e reservar o estoque na mesma transação (e a finalização, baixá-lo); `NUMERIC` evita erros de arredondamento em valores monetários;
> constraints garantem invariantes como estoque nunca negativo e documento único; consultas agregadas (tempo médio de
> execução) são SQL simples. É gratuito, roda em um contêiner no docker-compose, tem Testcontainers para testes de
> integração e um caminho direto para RDS/Aurora nas próximas fases, quando cada microsserviço poderá ter seu próprio
> banco — o monólito já separa as tabelas por módulo para isso."

## Decisão

**PostgreSQL 16** (Opção A), resultado da enquete E-05. A justificativa da seção *Recomendação* passa a ser o texto
oficial para README e vídeo. Imagem no compose: `postgres:16-alpine`, com volume nomeado e healthcheck.

## Consequências

- Migrações versionadas com Prisma Migrate (E-17) desde o primeiro PR.
- Um *schema* por módulo (`customers`, `catalog`, `service_orders`, `identity`); **sem JOIN entre módulos** no código de domínio (só via aplicação) — prepara a Fase 4.
- `docker-compose.yml` sobe o banco com volume nomeado e seed de demonstração.

## Enquete (texto para o Discord)

> **Enquete E-05 — ADR-002 Banco de dados** (prazo 48 h) — precisamos justificar no vídeo/README
> 🐘 PostgreSQL · 🐬 MySQL · 🍃 MongoDB · 🟦 SQL Server
