# 01 — Event storming para o Miro (F2)

```text
Com base em docs/ddd/event-storming.md, docs/ddd/domain-storytelling.md, docs/ddd/linguagem-ubiqua.md e nas
decisões aceitas ADR-010 (recusa → Cancelada), ADR-011 (token de acompanhamento ou login CUSTOMER) e ADR-012 (reserva na
aprovação, baixa na finalização, 422 sem estoque), produza o material para montar o board no Miro:

1. Lista de post-its por frame, na ordem de colocação, no formato
   "[COR] texto" — cores: LARANJA evento, AZUL comando, AMARELO ator, AMARELO-CLARO agregado, LILÁS política,
   VERDE modelo de leitura, ROSA sistema externo, VERMELHO hotspot.
   Frames: Legenda · Big picture (eventos em linha do tempo, pivotais marcados) · Fluxo 1 — Criação da OS (raias
   recepção/diagnóstico e orçamento/aprovação) · Fluxo 2 — Acompanhamento da OS (máquina de estados, execução,
   finalização, entrega, consulta do cliente) · Fluxo 3 — Gestão de peças e insumos · Hotspots (resolvidos, com a ADR) ·
   Domain storytelling · Context map · Agregados · Glossário — o enunciado (23/09) pede os três event stormings e a
   exportação em docs/ddd/event-storming.pdf e docs/ddd/diagramas.pdf, com o Miro acessível sem pedir permissão.
2. Para cada raia, a sequência "ator → comando → agregado → evento → política → próximo comando" já resolvida
   (sem hotspots pendentes: todos foram resolvidos pelas ADRs — mostre-os como resolvidos, com a ADR que resolveu).
3. Um texto de 8–10 linhas para a narração do bloco 5 do vídeo (docs/06-entrega/roteiro-do-video.md) explicando o
   processo (big picture → process modeling → software design) e os elementos de DDD usados.
4. Uma checklist de consistência: cada evento do event storming aparece em docs/ddd/agregados.md §4? Cada comando
   tem um endpoint em docs/04-arquitetura/contrato-api.md? Aponte divergências para corrigirmos os docs.

5. Um roteiro de exportação: quais frames vão para event-storming.pdf e quais para diagramas.pdf, e a checagem
   "documentação corresponde ao código entregue" item a item (docs/ddd/README.md).

Não invente regras novas: se faltar informação, liste como pergunta.
```
