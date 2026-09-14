# ADR-009 — Identificadores, validação e proteção de dados sensíveis (CPF/CNPJ/placa)

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 2) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-11** |
| Data | 2026-09-14 |
| Relacionadas | PRD-001, PRD-005, ADR-011, `docs/03-ddd/agregados.md` |

## Contexto e problema

O enunciado exige "validação dos dados sensíveis (CPF/CNPJ, placa de veículo)". Também precisamos escolher o tipo de
identificador das entidades: ids sequenciais expostos na API facilitam enumeração (OWASP A01) e atrapalham a futura
separação em microsserviços (ids gerados por serviço). A Fase 5 traz LGPD — tratar PII com cuidado agora evita retrabalho.

## Parte 1 — Identificadores

### Opção A — UUID (v4) como chave primária + **número legível** para a OS (`OS-2026-000123`)

- **Prós:** não enumerável; gerado na aplicação (útil em microsserviços/eventos); número legível para humanos no vídeo/atendimento.
- **Contras:** índices maiores; UUID v4 fragmenta índices B-tree (irrelevante no MVP).

### Opção B — Auto-incremento

- **Prós:** simples, compacto, legível.
- **Contras:** enumerável na API (`/ordens-servico/1,2,3…`), acoplado ao banco; ruim para microsserviços.

### Opção C — UUID **v7** (ordenável por tempo) + número legível

- **Prós:** todos os de A + índices amigáveis; suportado em libs modernas (Java `uuid-creator`, Node `uuid` v7, Python `uuid6`, .NET 9 `Guid.CreateVersion7`, Go `google/uuid`).
- **Contras:** dependência extra em algumas linguagens.

## Parte 2 — Validação e proteção (proposta única, sem opções)

| Dado | Validação | Armazenamento | Exposição |
|---|---|---|---|
| CPF | 11 dígitos; rejeita todos iguais; dígitos verificadores (mod 11) | só dígitos, único entre ativos | admin: completo; cliente/logs: `***.982.247-**` |
| CNPJ | 14 dígitos; dígitos verificadores; (formato alfanumérico da Receita: Could) | só dígitos, único | admin: completo; logs: `**.***.174/0001-**` |
| Placa | `^[A-Z]{3}[0-9]{4}$` (antiga) ou `^[A-Z]{3}[0-9][A-Z][0-9]{2}$` (Mercosul); normalizar maiúsculas/sem hífen | normalizada, única entre ativos | admin: completa; cliente/logs: `ABC1***` |
| E-mail | formato RFC básico; máx. 254 | minúsculas | completo (admin) |
| Telefone | 10–11 dígitos com DDD | só dígitos | mascarado em logs |
| Senhas | tamanho mínimo 8; hash bcrypt/argon2 | hash | nunca |

Implementação: **Value Objects** (`Documento` = `CPF` \| `CNPJ`, `Placa`, `Email`, `Telefone`) no `shared`/`domain`, com
testes unitários exaustivos; validação também nos DTOs de entrada (422 padronizado com o campo).

## Recomendação (não vinculante)

**Opção C** (ou A se a lib não estiver disponível) + a tabela de validação acima.

## Decisão

> Preencher após a enquete E-11.

## Consequências

- Todos os agregados geram id na aplicação (porta `GeradorDeId`), testável e independente de banco.
- Número da OS: sequência por ano (`OS-AAAA-NNNNNN`) — sequência no banco ou tabela de contadores com lock; único.
- Logs estruturados com máscara centralizada (função `mascarar(...)`).

## Enquete (texto para o Discord)

> **Enquete E-11 — ADR-009 Identificadores** (prazo 48 h)
> 🆔 UUID v4 + número legível da OS · 🔢 Auto-incremento · 🆔🔢 UUID v7 + número legível (recomendada)
