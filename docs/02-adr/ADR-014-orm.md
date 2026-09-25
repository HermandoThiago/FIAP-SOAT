# ADR-014 — ORM do projeto (com justificativa exigida no enunciado)

| Campo | Valor |
|---|---|
| Status | Proposta — aguardando enquete E-02 |
| Tipo | Tipo 1 |
| Decisores | Grupo |
| Data | 2026-09-23 |
| Relacionadas | ADR-002 (PostgreSQL), `docs/02-adr/ADR-002-banco-de-dados.md` |

## Contexto e problema

O backend já está definido como **NestJS**, com **PostgreSQL** como banco. Falta decidir como a aplicação vai acessar o banco: usando um ORM completo, um query builder, ou SQL puro com um driver (`pg`) direto. Essa escolha impacta a velocidade de desenvolvimento, a segurança de tipos entre o schema do banco e o código TypeScript, a forma de versionar o schema (migrations) e a curva de aprendizado do grupo dentro do prazo do curso.

## Critérios de decisão

1. Segurança de tipos entre schema do banco e código TypeScript (evitar bugs de campo/typo em produção) — peso 5
2. Produtividade e velocidade de desenvolvimento (CRUD, relacionamentos, queries comuns) — peso 5
3. Gerenciamento de migrations (versionamento, histórico, rollback) — peso 4
4. Integração com NestJS e com PostgreSQL especificamente (ADR-002) — peso 4
5. Familiaridade do grupo e curva de aprendizado dentro do prazo do curso — peso 3
6. Facilidade de testar (Testcontainers, mocks, seed de dados) — peso 3

## Opções consideradas

### Opção A — Prisma

- **Prós:** Prisma Client é **totalmente tipado** e gerado a partir do `schema.prisma`, com autocomplete real no editor e erros de tipo em tempo de compilação; `prisma migrate` versiona e aplica migrations de forma simples, com histórico automático; `schema.prisma` funciona como fonte única de verdade do modelo de dados, fácil de ler mesmo por quem não escreveu o código; Prisma Studio ajuda a inspecionar dados durante o desenvolvimento; documentação oficial usa PostgreSQL como banco de referência, o que casa diretamente com a ADR-002; curva de aprendizado baixa para quem já conhece TypeScript.
- **Contras:** menos flexível que SQL puro para queries muito complexas (embora resolva a maioria dos casos com `queryRaw` quando necessário); é uma camada adicional entre o código e o banco, com sua própria versão do Node/engine para gerenciar.
- **Fases futuras:** schema centralizado facilita dividir modelos por módulo hoje e migrar para bancos por microsserviço depois; migrations versionadas facilitam auditoria e rollback em produção.

### Opção B — TypeORM

- **Prós:** integração "nativa" com NestJS via `@nestjs/typeorm`; suporta padrão Active Record e Data Mapper; decorators (`@Entity`, `@Column`) ficam próximos das classes de domínio; maduro, usado há bastante tempo na comunidade Node.
- **Contras:** tipagem menos estrita que o Prisma em alguns cenários (relações e queries mais complexas podem escapar da checagem de tipos); geração/sincronização automática de schema (`synchronize: true`) é arriscada em produção e exige disciplina do time para não usar; API de migrations é mais verbosa e menos amigável que o `prisma migrate`; histórico do projeto tem relatos recorrentes de bugs e manutenção mais lenta em comparação com ferramentas mais recentes.
- **Fases futuras:** funciona bem com PostgreSQL, mas exige mais configuração manual para manter os mesmos benefícios de tipagem e histórico de migrations que o Prisma oferece por padrão.

### Opção C — SQL puro (driver `pg` ou query builder como Knex)

- **Prós:** controle total sobre a query executada, sem abstrações; zero "mágica" de geração de código; útil para relatórios/consultas muito específicas de performance crítica.
- **Contras:** nenhuma segurança de tipos entre schema e código sem ferramentas extras; controle de migrations manual (scripts SQL versionados à mão ou biblioteca separada tipo `node-pg-migrate`); produtividade menor para CRUD básico, que é a maior parte do sistema; maior risco de erros humanos (typos em nomes de coluna, SQL injection se não usar parâmetros corretamente) sem uma camada de proteção adicional; curva de aprendizado alta para quem não tem experiência prévia com SQL avançado.
- **Fases futuras:** exigiria reescrever o acesso a dados caso o time decida adotar um ORM mais tarde; não escala bem em produtividade conforme o número de entidades cresce.

## Recomendação (não vinculante)

**Prisma.** Justificativa pronta para README/vídeo:

> "Escolhemos o Prisma porque ele oferece o melhor equilíbrio entre segurança de tipos e produtividade dentro da stack NestJS + PostgreSQL já definida. O Prisma Client é gerado automaticamente a partir do `schema.prisma`, então qualquer divergência entre o modelo de dados e o código aparece em tempo de compilação, não em produção. O `prisma migrate` cuida do versionamento e histórico de migrations sem exigir scripts SQL manuais, o que acelera o desenvolvimento dentro do prazo do curso. Comparado ao TypeORM, o Prisma tem tipagem mais estrita e uma API de migrations mais simples; comparado a SQL puro, ganhamos produtividade e segurança sem perder a opção de usar `queryRaw` para os poucos casos que exigirem controle total da query."

## Decisão

> **Prisma** (Opção A)

## Consequências

- Todo o acesso a dados passa pelo **Prisma Client**, gerado a partir de `schema.prisma`.
- Migrations gerenciadas exclusivamente via `prisma migrate dev` (desenvolvimento) e `prisma migrate deploy` (produção/CI).
- `schema.prisma` se torna a fonte única de verdade do modelo de dados — mudanças de schema sempre passam por ele, nunca diretamente no banco.
- Casos de consulta muito específicos/performance crítica podem usar `prisma.$queryRaw`, documentando o motivo no PR.
- Testes de integração usam Testcontainers com PostgreSQL real, aplicando as migrations do Prisma antes de rodar a suíte.

