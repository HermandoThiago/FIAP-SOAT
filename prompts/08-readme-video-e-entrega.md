# 08 — README, vídeo e entrega (F5 — Hermando: README/execução · Shirley: roteiro e PDF)

```text
Com base em docs/06-entrega/*, docs/02-adr/README.md (decisões aceitas), no enunciado atualizado
(docs/00-guia-do-grupo/enunciado-fase-1-tech-challenge.pdf) e no estado atual do repositório:

1. Escreva o README.md final (em português) com, no mínimo, os itens exigidos pelo enunciado, nesta ordem: objetivo do
   projeto; descrição resumida da solução; arquitetura utilizada (camadas clássicas por módulo + C4 nível 2 em Mermaid);
   tecnologias utilizadas; pré-requisitos; instruções para execução (`docker compose up --build`, URLs de Swagger e
   health); instruções para execução dos testes (unitários, integração, BDD, cobertura); instruções para acesso ao
   Swagger/OpenAPI; decisão e justificativa do banco (ADR-002); usuários e credenciais de demonstração (seed por env,
   token de acompanhamento em dev) sem nenhum dado real; estrutura dos principais diretórios; link para a documentação
   DDD (Miro acessível sem pedir permissão + docs/ddd/); link para o vídeo público no YouTube; grupo 49 e integrantes
   (nome, RM, Discord). Todos os comandos devem ter sido executados e funcionar.
2. Gere um script scripts/demo.sh (curl + jq) que executa o fluxo do vídeo (blocos 6–9) contra localhost:8080 e imprime
   status/orçamento/estoque (reservado e baixado) a cada passo — é o "ensaio" da gravação.
3. Ajuste docs/06-entrega/roteiro-do-video.md ao que realmente existe (rotas, nomes, tempos), mantendo ≤ 15 min, com a
   identificação dos integrantes e do commit/tag da entrega na abertura, e gere as falas curtas (2–3 frases) por bloco.
4. Preencha docs/06-entrega/documento-de-entrega-template.md (PDF único): primeira página com curso, fase, número do
   grupo (49), nomes, RMs, usernames do Discord, linguagem/tecnologias; links do repositório (público), branch + hash do
   commit da entrega (tag v1.0.0), vídeo (YouTube público), Miro e docs/ddd/. Liste o que ainda falta para o grupo.
5. Rode a "revisão cruzada final" de docs/06-entrega/checklist-de-entrega.md §5 e reporte item a item: links em janela
   anônima, repositório público, vídeo público, Miro sem pedido de permissão, commit do PDF = commit do vídeo.
```
