# Documentação DDD — pasta de entrega (`docs/ddd/`)

O enunciado pede a documentação DDD no Miro (acesso sem pedir permissão) e exportada para o repositório. Os arquivos abaixo descrevem o MVP implementado; o que era plano e não existe está marcado.

## Diagramas exportados (`diagramas/`)

Cada diagrama tem o `.drawio` editável e o `.png` exportado; `event-storming.pdf` reúne os diagramas 02 a 04 e `diagramas.pdf`, os demais. Representam o MVP implementado (revisão de 02/11/2026).

| Diagrama | Conteúdo |
|---|---|
| [`01-maquina-de-estados`](diagramas/01-maquina-de-estados.png) | nove status e transições permitidas, com comandos, atores e efeitos transacionais |
| [`02-event-storming-criacao-os`](diagramas/02-event-storming-criacao-os.png) | Event Storming da criação da OS |
| [`03-event-storming-acompanhamento-os`](diagramas/03-event-storming-acompanhamento-os.png) | Event Storming do acompanhamento da OS |
| [`04-event-storming-estoque`](diagramas/04-event-storming-estoque.png) | Event Storming da gestão de peças e insumos |
| [`05-bpmn-atendimento`](diagramas/05-bpmn-atendimento.png) | BPMN simplificado do atendimento (modelo de negócio, não executável) |
| [`06-mapa-de-contextos`](diagramas/06-mapa-de-contextos.png) | módulos do monólito e infraestrutura compartilhada |
| [`07-modelagem-usuarios-perfis-veiculos`](diagramas/07-modelagem-usuarios-perfis-veiculos.png) | recorte do schema: Perfil, Usuario, UsuarioSenha, SessaoRefresh e Veiculo |
| [`08-domain-storytelling`](diagramas/08-domain-storytelling.png) | história do atendimento (fluxo feliz) e variações: ator, atividade numerada, objeto de trabalho, estado da OS e anotações |
| [`09-agregados-entidades-vos`](diagramas/09-agregados-entidades-vos.png) | agregados, raízes, entidades, objetos de valor conceituais e referências entre agregados |

Os eventos dos Event Stormings são fatos conceituais de negócio; o código não publica eventos de domínio. O enunciado sugere também `event-storming.pdf` e `diagramas.pdf`; as imagens acima cumprem o pedido de "PDF ou imagens". Link público (pasta no Google Drive): <https://drive.google.com/drive/folders/1-5cyDTGdb8r-q7zIxAUV7Ahn6Kfzl2W4?usp=sharing>.

## Arquivos de texto

| Arquivo | Conteúdo |
|---|---|
| `event-storming.md` | Três fluxos com comandos, políticas, atores e fatos; hotspots e situação atual |
| `agregados.md` | Modelo conceitual × implementação, invariantes e onde cada uma vive |
| `contextos-delimitados.md` | Subdomínios, mapa de contextos, colaboração real entre módulos |
| `domain-storytelling.md` | Cinco histórias do domínio com os papéis e status reais |
| `linguagem-ubiqua.md` | Glossário com identificador no código e situação de cada termo |

## Relação documentação ↔ código

- Termo do glossário → identificador (`OrdemServico`, `ItemEstoque`…) e rota: `linguagem-ubiqua.md`.
- Status e transições: enum `StatusOrdemServico` + `StatusTransitionPolicy` (`01-maquina-de-estados`).
- Fatos do event storming → rastro real (histórico de status, orçamento, movimentações): `agregados.md` §3.
- Contexto → módulo → modelos Prisma: `contextos-delimitados.md` §4.

## Limites declarados do DDD tático

Não há agregados ricos, objetos de valor `Money`/`Document`/`Quantity`, eventos de domínio publicados, repositórios separados e o Domain Storytelling está desenhado em notação simplificada (sem os pictogramas do Egon.io). As regras vivem em funções e políticas puras de `domain/` e em serviços transacionais. Isso foi registrado como divergência em `docs/02-adr/decisoes-leves.md`; no vídeo, apresentar o DDD como estratégico (contextos, linguagem ubíqua, event storming) e o tático como parcial.

Regra do enunciado: *"documentação que não corresponda ao código não será considerada evidência completa"*. Antes de exportar, conferir o Miro contra o código (`docs/06-entrega/checklist-de-entrega.md`, itens E5–E10).
