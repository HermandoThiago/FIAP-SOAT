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

### E-02 · Frentes de trabalho — 🟢
> **Enquete E-02 — Confirmação das frentes** (prazo 72 h) — ver `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`
> Sugestão montada a partir das apresentações de cada um:
> • **Vi** — F1 Arquitetura & Repositório, como Tech Lead & Arquiteta (coordenação, ADRs, esqueleto, CI, revisão) + apoio em segurança
> • **Shirley** — F2 DDD & Documentação + Produto, como Product & DDD Lead (PRDs, event storming/Miro, Gherkin, checklist, roteiro, PDF) + facilitação do assíncrono
> • **Diego** — F3 Domínio & API, core `atendimento` + co-revisão de arquitetura
> • **Dan** — F3 `cadastro` e `catalogo-estoque` + F5 Infra & Entrega (Docker, compose, CI, README, Swagger)
> • **Hermando** — F4 Qualidade & Segurança (testes, cobertura, BDD, scans, relatório) + métrica de tempo médio
> 👍 topo assim · ✍️ quero trocar (diga qual frente prefere e por quê)

Resultado: `pendente`

### E-03 · Data oficial de entrega e cadência — 🟢
> **E-03 — Prazo e cadência** (prazo 72 h)
> 1) Alguém confirma a **data oficial de entrega** na plataforma? (o cronograma assume ~08/11).
> 2) Check-in assíncrono 3×/semana (seg/qua/sex) está ok? 👍 sim · 👎 prefiro 2× · 🗓️ prefiro diário
> 3) Uma call opcional de 30 min por semana: 👍 sim, qual dia? · 👎 100 % assíncrono

Resultado: sim

## Lote 1 — decisões estruturais (bloqueiam o código) — abrir 14/09, encerrar 17/09

### E-04 · ADR-001 Linguagem e framework — 🟢
> **Enquete E-04 — ADR-001 Linguagem/framework do back-end** (prazo 72 h) — `docs/02-adr/ADR-001-linguagem-e-framework.md`
> Critérios: familiaridade da maioria > produtividade em 6–8 semanas > ecossistema (testes, cobertura, OpenAPI, JWT) > fases futuras (K8s, Lambda).
> ☕ Java 21 + Spring Boot 3 · 🟦 TypeScript + NestJS · 🟪 C# .NET 8 · 🐍 Python + FastAPI · 🐹 Go
> **Responda também no chat: qual você usa no dia a dia hoje?**
> Contexto pelas apresentações: Vi = Nest/TS · Diego = .NET e Node · Dan = Go (e JS) · Hermando = generalista · Shirley = Python.
> Quem votar numa stack que só você domina assume revisar o código dos outros nela.

Resultado: `pendente`

### E-05 · ADR-002 Banco de dados — 🟢
> **Enquete E-05 — ADR-002 Banco de dados** (prazo 72 h) — `docs/02-adr/ADR-002-banco-de-dados.md`
> Precisamos justificar a escolha no vídeo/README.
> 🐘 PostgreSQL · 🐬 MySQL · 🍃 MongoDB · 🟦 SQL Server

Resultado: PostgreSQL

### E-06 · ADR-003 Estilo arquitetural do monólito — 🟢
> **Enquete E-06 — ADR-003 Arquitetura do monólito** (prazo 72 h) — `docs/02-adr/ADR-003-arquitetura-do-monolito.md`
> 🥞 Camadas clássica (controller/service/repository) · ⬡ Monólito modular + hexagonal (ports & adapters) · 🧅 Clean Architecture completa

Resultado: `pendente`

### E-07 · ADR-013 Idioma do código e da API — 🟢
> **Enquete E-07 — ADR-013 Idioma** (prazo 72 h) — `docs/02-adr/ADR-013-idioma-do-codigo-e-da-api.md`
> 🇧🇷 Domínio em português (OrdemDeServico, /ordens-servico) + termos técnicos em inglês (Repository, Controller)
> 🇺🇸 Tudo em inglês (ServiceOrder, /service-orders) com glossário mapeando a linguagem ubíqua
> 🇧🇷🇧🇷 Tudo em português, inclusive termos técnicos

Resultado: Tudo em inglês com glossário mapeando a linguagem ubíqua

## Lote 2 — decisões de plataforma — abrir 17/09, encerrar 20/09

### E-08 · ADR-004 Autenticação JWT — ⏳
> **Enquete E-08 — ADR-004 Autenticação** — `docs/02-adr/ADR-004-autenticacao-jwt.md`
> 🔑 JWT próprio (usuários no banco, bcrypt/argon2, HS256, papéis) · 🛡️ Keycloak no docker-compose (OIDC) · ☁️ Provedor externo (Cognito/Auth0)

### E-09 · ADR-005 Documentação da API — ⏳
> **Enquete E-09 — ADR-005 OpenAPI** — `docs/02-adr/ADR-005-documentacao-da-api.md`
> 🧩 Code-first (anotações geram o Swagger) · 📄 Design-first (openapi.yaml é a fonte; CI valida) · 🔀 Híbrido (contrato em `contrato-api.md` + code-first)

### E-10 · ADR-008 Fluxo Git e CI — ⏳
> **Enquete E-10 — ADR-008 Git/CI** — `docs/02-adr/ADR-008-fluxo-git-e-ci.md`
> 🌳 Trunk-based (master protegida, branches curtas, squash, 1 aprovação) · 🌊 GitFlow (develop/release/hotfix)
> Conventional Commits obrigatórios? 👍 / 👎

### E-11 · ADR-009 IDs e validação de dados sensíveis — ⏳
> **Enquete E-11 — ADR-009 Identificadores** — `docs/02-adr/ADR-009-identificadores-e-dados-sensiveis.md`
> 🆔 UUID como chave + número legível da OS (ex.: `OS-2026-000123`) · 🔢 Auto-incremento · 🆔🔢 UUID v7 (ordenável) + número legível

## Lote 3 — regras de domínio e qualidade — abrir 21/09, encerrar 24/09

### E-12 · ADR-006 Estratégia de testes — ⏳
> **Enquete E-12 — ADR-006 Testes** — `docs/02-adr/ADR-006-estrategia-de-testes-e-cobertura.md`
> Banco nos testes de integração: 🐳 Testcontainers/serviço do compose (banco real) · 💾 banco em memória (H2/SQLite)
> BDD (Gherkin) para os 3 fluxos principais: 👍 sim · 👎 não, só unit+integração

### E-13 · ADR-007 Análise de vulnerabilidades — ⏳
> **Enquete E-13 — ADR-007 Scans** — `docs/02-adr/ADR-007-analise-de-vulnerabilidades.md`
> Conjunto mínimo proposto: SAST (Semgrep ou SonarCloud) + SCA (auditoria de dependências / OWASP Dependency-Check) + imagem (Trivy) + segredos (gitleaks) + DAST (OWASP ZAP baseline). 👍 ok · 🔧 quero trocar algo (comente)

### E-14 · ADR-010 Máquina de estados da OS — ⏳
> **Enquete E-14 — ADR-010 Orçamento recusado** — `docs/02-adr/ADR-010-maquina-de-estados-da-os.md`
> O enunciado lista 6 status. Se o cliente **recusa** o orçamento:
> 🔁 OS volta para *Em diagnóstico* (revisar itens e reenviar) · 🚫 Criamos um 7º status *Cancelada* (terminal) · 🔁🚫 Volta para diagnóstico e existe *Cancelada* para desistência

### E-15 · ADR-011 Acesso do cliente (consulta e aprovação) — ⏳
> **Enquete E-15 — ADR-011 Como o cliente consulta/aprova sem login admin** — `docs/02-adr/ADR-011-acesso-do-cliente.md`
> 🔗 Token de acompanhamento assinado, gerado ao "enviar" o orçamento (simula link por e-mail/SMS) · 🪪 Número da OS + CPF/CNPJ (endpoint público com rate limit) · 👤 Login completo de cliente (JWT com papel CLIENTE)

### E-16 · ADR-012 Momento da baixa de estoque — ⏳
> **Enquete E-16 — ADR-012 Estoque** — `docs/02-adr/ADR-012-controle-de-estoque-na-os.md`
> ✅ Baixa na aprovação do orçamento (início da execução) · 📌 Reserva na aprovação + baixa na finalização · 🏁 Baixa só na finalização
> Peça sem estoque suficiente ao incluir na OS: ⛔ bloqueia · ⚠️ permite e sinaliza "aguardando peça"

## Registro de resultados

| Enquete | Encerrada em | Resultado | Registrado em |
|---|---|---|---|
| E-01 | | | README.md |
| E-02 | | | frentes-e-responsabilidades.md |
| E-03 | | | cronograma.md / como-trabalhamos.md |
| E-04 | | | ADR-001 |
| E-05 | | | ADR-002 |
| E-06 | | | ADR-003 |
| E-07 | | | ADR-013 |
| E-08 | | | ADR-004 |
| E-09 | | | ADR-005 |
| E-10 | | | ADR-008 |
| E-11 | | | ADR-009 |
| E-12 | | | ADR-006 |
| E-13 | | | ADR-007 |
| E-14 | | | ADR-010 |
| E-15 | | | ADR-011 |
| E-16 | | | ADR-012 |
