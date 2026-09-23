# Documentação DDD — pasta de entrega (`docs/ddd/`)

O enunciado atualizado (23/09/2026) pede a documentação DDD no Miro (**acessível sem solicitação de permissão**) **e**
exportada para o repositório, preferencialmente nesta estrutura:

| Arquivo | O que é | Quando existe |
|---|---|---|
| `event-storming.pdf` | Exportação dos frames de event storming do Miro: criação da OS, acompanhamento da OS, gestão de peças e insumos | M5 (30/10) — F2 |
| `diagramas.pdf` | Exportação dos demais diagramas da disciplina: domain storytelling, context map, agregados/entidades/value objects, máquina de estados | M5 — F2 |
| `linguagem-ubiqua.md` | Glossário do domínio com a tradução oficial para o código (fonte da verdade dos nomes — ADR-013) | já existe |

Os demais arquivos desta pasta são as **versões versionadas (Mermaid)** a partir das quais o Miro é montado:

| Arquivo | Conteúdo | Elementos exigidos pelo enunciado |
|---|---|---|
| `event-storming.md` | 3 fluxos (criação, acompanhamento, peças/insumos): eventos, comandos, políticas, atores, agregados, modelos de leitura, hotspots resolvidos | Event storming dos 3 fluxos; eventos de domínio; comandos; políticas/regras de negócio; atores |
| `agregados.md` | Agregados, entidades, value objects, invariantes, eventos, serviços | Agregados; entidades; objetos de valor |
| `contextos-delimitados.md` | Subdomínios, context map, regras de integração, mapeamento contexto → módulo → schema | Bounded contexts |
| `domain-storytelling.md` | Histórias do domínio (Egon.io/Miro) | Diagramas solicitados na disciplina |
| `linguagem-ubiqua.md` | Glossário PT → identificador EN, status, eventos, serviços de aplicação | Linguagem ubíqua; glossário; **relação entre a documentação e a implementação** |

**Relação documentação ↔ código** (o enunciado exige evidência disso): cada termo do glossário tem o identificador usado
no código; cada evento do event storming tem o nome em código (`event-storming.md` §6); cada agregado tem seu módulo e
schema (`contextos-delimitados.md` §4); a máquina de estados da PRD-004 é o enum `ServiceOrderStatus` +
`StatusTransitionPolicy`. O vídeo (bloco 5) mostra esse caminho: post-it → glossário → classe/rota no Swagger.

Regra do enunciado: *"diagramas genéricos, exemplos de aula ou documentação que não corresponda ao código não serão
considerados como evidência completa"* — antes de exportar, F2 confere o Miro contra o código entregue
(`docs/06-entrega/checklist-de-entrega.md`, itens E5–E10).
