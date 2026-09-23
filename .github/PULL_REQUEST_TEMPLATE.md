<!-- Base do PR: `develop` (GitFlow — ADR-008). Só `release/*` e `hotfix/*` apontam para `master`.
     Título em Conventional Commits (o CI valida): tipo(escopo): resumo — ex.: feat(service-orders): approve quote reserves stock -->

## O que este PR faz

<!-- 2–4 linhas. O que muda e por quê. -->

## Issue / PRD / ADR relacionados

- Closes #
- PRD: `docs/01-requisitos/PRD-00X-...md`
- ADR: `docs/02-adr/ADR-00X-...md` (se a mudança depende ou altera uma decisão)

## Como testar

```bash
# comandos para rodar localmente (docker compose up, testes, etc.)
```

## Checklist (Definition of Done)

- [ ] Base do PR = `develop` (ou `master` só para `release/*` / `hotfix/*`) e título em Conventional Commits
- [ ] Testes unitários/integrados cobrindo o fluxo (cobertura dos módulos críticos ≥ 80%)
- [ ] Swagger/OpenAPI (decorators) atualizado (se mudou API)
- [ ] Linguagem ubíqua respeitada (nomes do domínio conforme `docs/ddd/linguagem-ubiqua.md`)
- [ ] Camadas respeitadas: controller → service → repository; domínio sem Nest/Prisma; outro módulo só pelo serviço exportado
- [ ] Validação de dados sensíveis (CPF/CNPJ/placa) onde aplicável
- [ ] Sem segredos, senhas ou dados pessoais reais no código/commits
- [ ] README/docs atualizados (se mudou execução ou comportamento)
- [ ] Checklist de entrega atualizado (`docs/06-entrega/checklist-de-entrega.md`), se o PR cobre requisito do enunciado
- [ ] CI verde (build, testes, lint, scans)

## Evidências

<!-- prints do Swagger, saída dos testes, cobertura, etc. -->
