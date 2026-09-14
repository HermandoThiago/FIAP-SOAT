# Documento de entrega — Tech Challenge Fase 1 (template do PDF)

> Gerar o PDF a partir deste Markdown (ex.: VS Code + extensão *Markdown PDF*, ou Google Docs). Conferir todos os links em
> janela anônima antes de enviar.

---

# FIAP Pós Tech — Software Architecture (SOAT)
## Tech Challenge — Fase 1

**Nome do grupo:** `<nome escolhido na E-01>`

**Turma / período:** `<preencher>`

**Data de entrega:** `<DD/MM/AAAA>`

### Participantes

| Nome completo | RM | Username no Discord | E-mail (opcional) |
|---|---|---|---|
| Daniel Henrique `<sobrenome>` | `<RM>` | `<@username>` | |
| Shirley Balbino | `<RM>` | `<@username>` | |
| Victor H. C. Reis Santos | RM377398 | `<@username>` | |
| `<demais integrantes>` | | | |

### Links

| Item | Link |
|---|---|
| Documentação DDD (Miro) — event storming, context map, agregados, linguagem ubíqua | `<link público ou compartilhado>` |
| Repositório privado (GitHub) — acesso concedido a `soat-architecture` | `<https://github.com/…>` |
| Vídeo (≤ 15 min) | `<link YouTube não listado / Drive>` |
| Documentação no repositório (PRDs, ADRs, arquitetura) | `<link para /docs>` |
| Relatório de análise de vulnerabilidades | `<link para o PDF/MD>` (também anexo abaixo) |

### Resumo da solução (1 parágrafo)

`<Sistema de gestão da oficina: back-end monolítico modular (hexagonal) com os contextos cadastro, catálogo/estoque,
atendimento e identidade; APIs REST documentadas em Swagger; PostgreSQL; JWT; testes ≥ 80 % nos domínios críticos;
docker-compose para execução local.>`

### Como executar (resumo — detalhes no README)

```bash
git clone <repo> && cd <repo>
cp .env.example .env
docker compose up --build
# Swagger: http://localhost:8080/swagger
# Login: POST /api/v1/auth/login  { "email": "<ADMIN_EMAIL>", "senha": "<ADMIN_PASSWORD>" }
```

### Relatório com análise de vulnerabilidades

`<Colar aqui o conteúdo do relatorio-de-vulnerabilidades (preenchido) ou anexar como seção final do PDF.>`

---
