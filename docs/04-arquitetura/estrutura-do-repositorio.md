# Estrutura do repositório — implementação atual

Descreve os arquivos efetivamente presentes; as ADRs registram a intenção.

```text
src/main.ts                    bootstrap, Helmet, CORS, validação, Swagger
src/app.module.ts              composição do monólito
src/modules/
  customers/                   clientes e veículos
  catalog/                     serviços, itens e movimentações de estoque
  service-orders/              OS, orçamento, acompanhamento e métricas
  identity/                    usuários, perfis, autenticação e autorização
src/shared/                    DatabaseService/Prisma e configuração Swagger
src/scripts/seed.ts            dados fictícios de demonstração
prisma/schema.prisma           modelo relacional
prisma/migrations/             migrações, índices e constraints adicionais
test/unit/                     domínio, DTOs, controllers e Swagger
test/services/                 serviços com persistência simulada
test/integration/              API com PostgreSQL/Testcontainers
docs/                          requisitos, decisões, DDD e entrega
```

## Camadas e responsabilidades

| Camada | Implementação |
|---|---|
| Apresentação | `controllers/` e `dtos/` (ou DTOs dentro de controllers): HTTP, validação e metadados de papel/Swagger |
| Aplicação | `services/`: coordenação dos casos de uso, consultas e transações; acessa `DatabaseService` diretamente |
| Regras de domínio | `domain/`: política de transições, cálculo de orçamento/tempo, estoque, validadores e classes de dados |
| Infraestrutura | Prisma/PostgreSQL pelo serviço compartilhado; guards e serviços JWT em `identity` |

Fluxo real: controller → service → DatabaseService/Prisma; o service também usa funções/políticas de domínio e serviços exportados de outros módulos. Não existe camada separada `repositories/`, barramento de eventos, conjunto de VOs `Money/Document/Quantity` nem agregados ricos com todos os comandos encapsulados nas entidades.

## Dependências e consistência

Os módulos exportam serviços para colaboração em processo. Entretanto, o banco é compartilhado, há relações Prisma/FKs entre os conceitos e transações que alcançam OS e estoque. Não há isolamento físico por contexto nem proibição de consultas cruzadas.

Transições usam atualização condicionada ao status esperado; efeitos e histórico ficam na mesma transação. Estoque usa bloqueio de linhas `FOR UPDATE` em ordem fixa e constraints de saldo. Não há coluna `version`/ETag nem verificador automático de dependências entre camadas.

Ver [visão geral](visao-geral.md), [modelo de dados](modelo-de-dados.md), [modelagem DDD](../ddd/agregados.md) e [divergências registradas](../02-adr/decisoes-leves.md).
