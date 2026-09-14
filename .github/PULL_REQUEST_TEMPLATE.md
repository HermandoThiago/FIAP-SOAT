<!-- Título sugerido: tipo(escopo): resumo curto  — ex.: feat(atendimento): criar ordem de serviço -->

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

- [ ] Testes unitários/integrados cobrindo o fluxo (cobertura dos módulos críticos ≥ 80%)
- [ ] Swagger/OpenAPI atualizado (se mudou API)
- [ ] Linguagem ubíqua respeitada (nomes do domínio conforme `docs/03-ddd/linguagem-ubiqua.md`)
- [ ] Validação de dados sensíveis (CPF/CNPJ/placa) onde aplicável
- [ ] Sem segredos, senhas ou dados pessoais reais no código/commits
- [ ] README/docs atualizados (se mudou execução ou comportamento)
- [ ] CI verde (build, testes, lint, scans)

## Evidências

<!-- prints do Swagger, saída dos testes, cobertura, etc. -->
