# Enquetes — decisões pendentes (texto pronto para o Discord)

> Como usar: copie o bloco da enquete para o Discord (recurso **Enquete** do canal), marque `@everyone`, prazo 72 h.
> Ao encerrar, registre o resultado aqui e na seção *Decisão* da ADR/PRD correspondente. Ordem = prioridade.

Legenda de status: 🟢 aberta · ✅ encerrada · ⏳ aguardando lote anterior.

## Lote 0 — organização (abrir hoje, junto com o Lote 1)

### E-01 · Nome do grupo e do sistema — 🟢
> **Enquete E-01 — Nome do grupo / sistema** (prazo 72 h)
> O PDF de entrega pede o nome do grupo. Sugestões (vote em uma ou proponha no chat):
> 🔧 Oficina Ágil · ⚙️ SGO — Sistema de Gestão da Oficina · 🚗 AutoOS · 🛠️ Boxe Digital · ✍️ outra (comente)

Resultado: `pendente`

### E-02 · Frentes de trabalho — ✅ (redistribuída em 16/09)
> **Enquete E-02 — Confirmação das frentes** (prazo 72 h) — ver `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`
> Sugestão montada a partir das apresentações de cada um:
> • **Vi** — F1 Arquitetura & Repositório, como Tech Lead & Arquiteta (coordenação, ADRs, esqueleto, CI, revisão) + apoio em segurança
> • **Shirley** — F2 DDD & Documentação + Produto, como Product & DDD Lead (PRDs, event storming/Miro, Gherkin, checklist, roteiro, PDF) + facilitação do assíncrono
> • **Diego** — F3 Domínio & API, core `atendimento` + co-revisão de arquitetura
> • **Dan** — F3 `cadastro` e `catalogo-estoque` + F5 Infra & Entrega (Docker, compose, CI, README, Swagger)
> • **Hermando** — F4 Qualidade & Segurança (testes, cobertura, BDD, scans, relatório) + métrica de tempo médio
> 👍 topo assim · ✍️ quero trocar (diga qual frente prefere e por quê)

Resultado: topo assim. **Atualização 16/09:** Daniel saiu da faculdade; a carga dele foi dividida — Vi assume a F5 Infra
(Docker, compose, CI, README, Swagger) e Hermando assume os módulos `customers` e `catalog` da F3, além da F4. Tabela
atual em `frentes-e-responsabilidades.md`; registro em `docs/02-adr/decisoes-leves.md`. **Atualização 22/09:** Vi saiu da
pós-graduação; em reunião, o grupo redistribuiu: modelagem do banco → Diego; estrutura do código + ADRs → Hermando;
documentação DDD → Shirley (majoritariamente), em conjunto com os dois.

### E-03 · Data oficial de entrega e cadência — ✅ (data oficial ainda a confirmar)
> **E-03 — Prazo e cadência** (prazo 72 h)
> 1) Alguém confirma a **data oficial de entrega** na plataforma? (o cronograma assume ~08/11).
> 2) Check-in assíncrono 3×/semana (seg/qua/sex) está ok? 👍 sim · 👎 prefiro 2× · 🗓️ prefiro diário
> 3) Uma call opcional de 30 min por semana: 👍 sim, qual dia? · 👎 100 % assíncrono

Resultado: Definir prazo de entrega da atividade 1 semana antes da oficial para revisões, check-in 3, call opcional de 30m por semana.

## Lote 1 — decisões estruturais (bloqueiam o código) — ✅ encerrado em 16/09 (E-06 revotada em 22/09)

### E-04 · ADR-001 Linguagem e framework — ✅
> **Enquete E-04 — ADR-001 Linguagem/framework do back-end** (prazo 72 h) — `docs/02-adr/ADR-001-linguagem-e-framework.md`
> Critérios: familiaridade da maioria > produtividade em 6–8 semanas > ecossistema (testes, cobertura, OpenAPI, JWT) > fases futuras (K8s, Lambda).
> ☕ Java 21 + Spring Boot 3 · 🟦 TypeScript + NestJS · 🟪 C# .NET 8 · 🐍 Python + FastAPI · 🐹 Go
> **Responda também no chat: qual você usa no dia a dia hoje?**
> Contexto pelas apresentações: Vi = Nest/TS · Diego = .NET e Node · Dan = Go (e JS) · Hermando = generalista · Shirley = Python.
> Quem votar numa stack que só você domina assume revisar o código dos outros nela.

Resultado: TypeScript + NestJS

### E-05 · ADR-002 Banco de dados — ✅
> **Enquete E-05 — ADR-002 Banco de dados** (prazo 72 h) — `docs/02-adr/ADR-002-banco-de-dados.md`
> Precisamos justificar a escolha no vídeo/README.
> 🐘 PostgreSQL · 🐬 MySQL · 🍃 MongoDB · 🟦 SQL Server

Resultado: PostgreSQL

### E-06 · ADR-003 Estilo arquitetural do monólito — ✅ (revotada em 22/09)
> **Enquete E-06 — ADR-003 Arquitetura do monólito** (prazo 72 h) — `docs/02-adr/ADR-003-arquitetura-do-monolito.md`
> 🥞 Camadas clássica (controller/service/repository) · ⬡ Monólito modular + hexagonal (ports & adapters) · 🧅 Clean Architecture completa

Resultado (16/09): Clean Architecture completa. **Revotação encerrada em 22/09: Camadas clássicas** — vale a decisão de
22/09; a ADR-003 registra as duas (seção *Histórico*). Modularidade por contexto e domínio rico continuam (vêm do DDD, não
do estilo de camadas).

### E-07 · ADR-013 Idioma do código e da API — ✅
> **Enquete E-07 — ADR-013 Idioma** (prazo 72 h) — `docs/02-adr/ADR-013-idioma-do-codigo-e-da-api.md`
> 🇧🇷 Domínio em português (OrdemDeServico, /ordens-servico) + termos técnicos em inglês (Repository, Controller)
> 🇺🇸 Tudo em inglês (ServiceOrder, /service-orders) com glossário mapeando a linguagem ubíqua
> 🇧🇷🇧🇷 Tudo em português, inclusive termos técnicos

Resultado: Tudo em inglês com glossário mapeando a linguagem ubíqua

## Lote 2 — decisões de plataforma — ✅ encerrado em 22/09

### E-08 · ADR-004 Autenticação JWT — ✅
> **Enquete E-08 — ADR-004 Autenticação** — `docs/02-adr/ADR-004-autenticacao-jwt.md`
> 🔑 JWT próprio (usuários no banco, bcrypt/argon2, HS256, papéis) · 🛡️ Keycloak no docker-compose (OIDC) · ☁️ Provedor externo (Cognito/Auth0)

Resultado: JWT próprio (usuários no banco, bcrypt, HS256, papéis).

### E-09 · ADR-005 Documentação da API — ✅
> **Enquete E-09 — ADR-005 OpenAPI** — `docs/02-adr/ADR-005-documentacao-da-api.md`
> 🧩 Code-first (anotações geram o Swagger) · 📄 Design-first (openapi.yaml é a fonte; CI valida) · 🔀 Híbrido (contrato em `contrato-api.md` + code-first)

Resultado: Code-first (`@nestjs/swagger` gera tudo).

### E-10 · ADR-008 Fluxo Git e CI — ✅
> **Enquete E-10 — ADR-008 Git/CI** — `docs/02-adr/ADR-008-fluxo-git-e-ci.md`
> 🌳 Trunk-based (master protegida, branches curtas, squash, 1 aprovação) · 🌊 GitFlow (develop/release/hotfix)
> Conventional Commits obrigatórios? 👍 / 👎

Resultado: (a) **GitFlow** (`develop` / `release` / `hotfix`); (b) Conventional Commits **obrigatórios** (o CI checa).

### E-11 · ADR-009 IDs e validação de dados sensíveis — ✅
> **Enquete E-11 — ADR-009 Identificadores** — `docs/02-adr/ADR-009-identificadores-e-dados-sensiveis.md`
> 🆔 UUID como chave + número legível da OS (ex.: `OS-2026-000123`) · 🔢 Auto-incremento · 🆔🔢 UUID v7 (ordenável) + número legível

Resultado: UUID v4 + número legível da OS (`OS-2026-000123`).

### E-17 · ORM e migrações no NestJS — ✅ (adendo ao Lote 2)
> **Enquete E-17 — ORM e migrações no NestJS** — decisão leve (Tipo 2) aberta ao grupo porque define o esqueleto (prompt 02)
> 🔷 Prisma (schema declarativo, Prisma Migrate) · 🟠 TypeORM (mapeamento explícito, migrations SQL)

Resultado: Prisma (schema declarativo, Prisma Migrate). Registrado em `docs/02-adr/decisoes-leves.md` e na ADR-001.

## Lote 3 — regras de domínio e qualidade — ✅ encerrado em 22/09

### E-12 · ADR-006 Estratégia de testes — ✅
> **Enquete E-12 — ADR-006 Testes** — `docs/02-adr/ADR-006-estrategia-de-testes-e-cobertura.md`
> Banco nos testes de integração: 🐳 Testcontainers/serviço do compose (banco real) · 💾 banco em memória (H2/SQLite)
> BDD (Gherkin) para os 3 fluxos principais: 👍 sim · 👎 não, só unit+integração

Resultado: (a) Testcontainers (Postgres real); (b) sim, BDD com Cucumber-js nos 3 fluxos principais.

### E-13 · ADR-007 Análise de vulnerabilidades — ✅
> **Enquete E-13 — ADR-007 Scans** — `docs/02-adr/ADR-007-analise-de-vulnerabilidades.md`
> Conjunto mínimo proposto: SAST (Semgrep ou SonarCloud) + SCA (auditoria de dependências / OWASP Dependency-Check) + imagem (Trivy) + segredos (gitleaks) + DAST (OWASP ZAP baseline). 👍 ok · 🔧 quero trocar algo (comente)

Resultado: OK — conjunto mínimo aprovado: Semgrep + `npm audit`/Trivy fs + Trivy image + gitleaks + OWASP ZAP.

### E-14 · ADR-010 Máquina de estados da OS — ✅
> **Enquete E-14 — ADR-010 Orçamento recusado** — `docs/02-adr/ADR-010-maquina-de-estados-da-os.md`
> O enunciado lista 6 status. Se o cliente **recusa** o orçamento:
> 🔁 OS volta para *Em diagnóstico* (revisar itens e reenviar) · 🚫 Criamos um 7º status *Cancelada* (terminal) · 🔁🚫 Volta para diagnóstico e existe *Cancelada* para desistência

Resultado: novo status **Cancelada** (terminal) — recusa e cancelamento levam a OS para Cancelada; sem volta para diagnóstico.

### E-15 · ADR-011 Acesso do cliente (consulta e aprovação) — ✅
> **Enquete E-15 — ADR-011 Como o cliente consulta/aprova sem login admin** — `docs/02-adr/ADR-011-acesso-do-cliente.md`
> 🔗 Token de acompanhamento assinado, gerado ao "enviar" o orçamento (simula link por e-mail/SMS) · 🪪 Número da OS + CPF/CNPJ (endpoint público com rate limit) · 👤 Login completo de cliente (JWT com papel CLIENTE)

Resultado: **mesclar** — token de acompanhamento gerado ao enviar o orçamento **e** login completo de cliente (JWT com papel `CUSTOMER`).

### E-16 · ADR-012 Momento da baixa de estoque — ✅
> **Enquete E-16 — ADR-012 Estoque** — `docs/02-adr/ADR-012-controle-de-estoque-na-os.md`
> ✅ Baixa na aprovação do orçamento (início da execução) · 📌 Reserva na aprovação + baixa na finalização · 🏁 Baixa só na finalização
> Peça sem estoque suficiente ao incluir na OS: ⛔ bloqueia · ⚠️ permite e sinaliza "aguardando peça"

Resultado: (a) reserva na aprovação + baixa na finalização; (b) bloqueia (HTTP 422 `estoque insuficiente`).

## Registro de resultados

| Enquete | Encerrada em | Resultado | Registrado em |
| --- | --- | --- | --- |
| E-01 | Indefinido | Indefinido | README.md |
| E-02 | 16/09 · 22/09 | Aprovado; redistribuído em 16/09 (saída do Daniel) e em 22/09 (saída da Vi: banco → Diego; estrutura + ADRs → Hermando; DDD → Shirley) | frentes-e-responsabilidades.md · decisoes-leves.md |
| E-03 | Data da commit | Definir prazo de entrega da atividade 1 semana antes da oficial para revisões, check-in 3x semana, call opcional de 30m por semana a combinar. | cronograma.md / como-trabalhamos.md |
| E-04 | 16/09 | TypeScript + NestJS | ADR-001 ✅ Aceita |
| E-05 | 16/09 | PostgreSQL | ADR-002 ✅ Aceita |
| E-06 | 16/09 · revotada 22/09 | 16/09: Clean Architecture completa → **22/09: Camadas clássicas** | ADR-003 ✅ Aceita (Opção A) · estrutura-do-repositorio.md |
| E-07 | 16/09 | Tudo em inglês com glossário mapeando a linguagem ubíqua | ADR-013 ✅ Aceita · linguagem-ubiqua.md |
| E-08 | 22/09 | JWT próprio (usuários no banco, bcrypt, HS256, papéis) | ADR-004 ✅ Aceita |
| E-09 | 22/09 | Code-first (`@nestjs/swagger`) | ADR-005 ✅ Aceita |
| E-10 | 22/09 | GitFlow (`develop`/`release`/`hotfix`) + Conventional Commits obrigatórios | ADR-008 ✅ Aceita · como-trabalhamos.md §4 |
| E-11 | 22/09 | UUID v4 + número legível da OS | ADR-009 ✅ Aceita |
| E-12 | 22/09 | Testcontainers + BDD (Cucumber-js) nos 3 fluxos | ADR-006 ✅ Aceita · estrategia-de-testes.md |
| E-13 | 22/09 | Conjunto mínimo de scans aprovado | ADR-007 ✅ Aceita · plano-analise-vulnerabilidades.md |
| E-14 | 22/09 | Novo status Cancelada (terminal) | ADR-010 ✅ Aceita · PRD-004 §2 |
| E-15 | 22/09 | Token de acompanhamento + login de cliente (`CUSTOMER`) | ADR-011 ✅ Aceita · contrato-api.md §1/§3.5 |
| E-16 | 22/09 | Reserva na aprovação + baixa na finalização; bloqueia sem estoque (422) | ADR-012 ✅ Aceita · PRD-002 |
| E-17 | 22/09 | Prisma (Prisma Migrate) | decisoes-leves.md · ADR-001 · estrutura-do-repositorio.md §5 |
