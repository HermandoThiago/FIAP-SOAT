# ADR-013 — Idioma do código e da API

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-07 encerrada em 16/09/2026 (Opção B, diferente da recomendação) |
| Tipo | Tipo 1 (renomear depois é caro) |
| Decisores | Grupo — enquete **E-07** |
| Data | 2026-09-14 |
| Relacionadas | ADR-003, `docs/03-ddd/linguagem-ubiqua.md`, `docs/04-arquitetura/contrato-api.md` |

## Contexto e problema

O enunciado exige "linguagem ubíqua aplicada". A linguagem ubíqua da oficina é em **português** (ordem de serviço,
orçamento, peça, insumo, diagnóstico). Se o código usa inglês, cada termo precisa de tradução consistente (glossário)
— e "Ordem de Serviço" vira `ServiceOrder`/`WorkOrder`, o que já gera ambiguidade. Por outro lado, termos técnicos
(`Repository`, `Controller`, `UseCase`) são universais em inglês.

## Opções consideradas

### Opção A — Domínio em português + termos técnicos em inglês

`OrdemDeServico`, `Orcamento`, `Peca`, `StatusOS.AGUARDANDO_APROVACAO`, `AprovarOrcamentoUseCase`,
`OrdemDeServicoRepository`, rotas `/ordens-servico`, `/pecas`. Sem acentos/cedilha em identificadores (`Orcamento`, `Peca`),
com acentos em strings/mensagens/docs.

- **Prós:** linguagem ubíqua aparece literalmente no código, nos testes e no Swagger (fácil de mostrar no vídeo); zero tradução.
- **Contras:** mistura de idiomas; identificadores sem acento ficam "feios"; libs de pluralização/inflexão em inglês não ajudam.

### Opção B — Tudo em inglês + glossário mapeando a linguagem ubíqua

`ServiceOrder`, `Quote`/`Estimate`, `Part`, `Supply`, `/service-orders`.

- **Prós:** convenção de mercado; consistente com frameworks.
- **Contras:** tradução gera ambiguidade (`Quote` × `Budget` × `Estimate`; `Part` × `Supply`); o vídeo precisa explicar o mapeamento; risco de desalinhar com o Miro em português.

### Opção C — Tudo em português, inclusive termos técnicos

`RepositorioDeOrdemDeServico`, `ControladorDeClientes`.

- **Prós:** consistência total.
- **Contras:** contraria convenções dos frameworks (anotações/decorators, geradores); estranho para revisores.

## Recomendação (não vinculante)

**Opção A.** Regra prática: *se a palavra está no glossário da linguagem ubíqua, escreve-se em português; se é um padrão
técnico, em inglês.* Rotas, campos JSON e enums em português (`snake_case`/`camelCase` conforme o framework), sem
acentos.

## Decisão

**Tudo em inglês com glossário mapeando a linguagem ubíqua** (Opção B), resultado da enquete E-07. Vale para classes,
métodos, campos, rotas, enums, tabelas/colunas, eventos, casos de uso, **nomes de módulo/pasta e escopos de commit**
(`customers`, `catalog`, `service-orders`, `identity`, `shared`). Continuam em português: documentação, Miro, vídeo,
mensagens de erro, `statusDescription` e cenários Gherkin (linguagem do negócio). O número da OS mantém o prefixo
`OS-`.

O glossário `docs/03-ddd/linguagem-ubiqua.md` é a **única** fonte das traduções (ex.: Orçamento = `Quote`, nunca
`Budget`/`Estimate`; Peça/Insumo = `Part` com `type`; Cadastro = módulo `customers`). Termo sem tradução no glossário
não entra no código.

## Consequências

- `linguagem-ubiqua.md` ganhou a coluna **Identificador (EN)** e a tabela de mapeamento de status (§7) — usar no vídeo
  para ligar os seis nomes do enunciado aos enums.
- Contrato da API, modelo de dados, agregados, fluxos, PRDs e prompts foram atualizados para os nomes em inglês
  (16/09/2026).
- Escopos de commit em inglês substituem os registrados na issue #1 (`decisoes-leves.md`, linha de 16/09).
- Revisão de PR checa "nomes conforme glossário"; tradução divergente é `[bloqueia]`.

## Enquete (texto para o Discord)

> **Enquete E-07 — ADR-013 Idioma do código/API** (prazo 48 h)
> 🇧🇷 Domínio em português + técnico em inglês (recomendada) · 🇺🇸 Tudo em inglês + glossário · 🇧🇷🇧🇷 Tudo em português
