# 08 — README, vídeo e entrega (F5)

```text
Com base em docs/06-entrega/*, docs/02-adr/README.md (decisões aceitas) e no estado atual do repositório:

1. Escreva o README.md final (em português) com: objetivo e contexto do Tech Challenge; grupo e usernames do Discord;
   arquitetura resumida (diagrama Mermaid do C4 nível 2 e da estrutura de módulos); justificativa do banco (ADR-002);
   como executar do zero (pré-requisitos, .env, `docker compose up --build`, URLs de Swagger/health, credenciais seed
   por env); como obter um token JWT e chamar uma rota protegida (curl); roteiro de demonstração do fluxo completo
   em 10 chamadas (curl ou Swagger) com os dados do seed; como rodar testes e ver cobertura; como rodar os scans;
   links para docs/, Miro, relatório de vulnerabilidades; licença/uso acadêmico. Todos os comandos devem ter sido
   executados e funcionar.
2. Gere um script scripts/demo.sh (curl + jq) que executa o fluxo do vídeo (blocos 6–9) contra localhost:8080 e imprime
   os status/orçamento/estoque a cada passo — é o "ensaio" da gravação.
3. Ajuste docs/06-entrega/roteiro-do-video.md ao que realmente existe (rotas, nomes, tempos), mantendo ≤ 15 min, e
   gere as falas curtas (2–3 frases) por bloco para cada responsável.
4. Preencha docs/06-entrega/documento-de-entrega-template.md com os dados reais e liste o que ainda falta
   (links, nomes, RMs) para o grupo completar.
5. Rode a "revisão cruzada final" de docs/06-entrega/checklist-de-entrega.md §5 e reporte o resultado item a item.
```
