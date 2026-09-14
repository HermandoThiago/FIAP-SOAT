# Modelo de dados (relacional — assume ADR-002 = PostgreSQL; adaptável a MySQL/SQL Server)

> Um *schema* (ou prefixo) por módulo. **Sem chaves estrangeiras entre módulos** (apenas colunas de referência com
> índice) — o que permite separar os bancos na Fase 4 sem migração de esquema. Dentro do módulo, FKs normais.

## 1. Diagrama ER

```mermaid
erDiagram
    CLIENTES {
        uuid id PK
        varchar tipo_pessoa "PF | PJ"
        varchar documento UK "so digitos (11 ou 14)"
        varchar nome
        varchar email
        varchar telefone
        boolean ativo
        timestamptz criado_em
        timestamptz atualizado_em
    }
    VEICULOS {
        uuid id PK
        uuid cliente_id FK
        varchar placa UK "normalizada"
        varchar marca
        varchar modelo
        int ano
        varchar cor
        boolean ativo
        timestamptz criado_em
        timestamptz atualizado_em
    }
    SERVICOS {
        uuid id PK
        varchar nome UK
        text descricao
        numeric preco "12,2"
        int tempo_estimado_min
        boolean ativo
        timestamptz criado_em
        timestamptz atualizado_em
    }
    PECAS {
        uuid id PK
        varchar sku UK
        varchar nome
        varchar tipo "PECA | INSUMO"
        varchar unidade_medida
        numeric preco_unitario "12,2"
        numeric quantidade_estoque "10,3 >= 0"
        numeric quantidade_reservada "10,3 >= 0"
        numeric estoque_minimo "10,3"
        boolean ativo
        timestamptz criado_em
        timestamptz atualizado_em
    }
    MOVIMENTACOES_ESTOQUE {
        uuid id PK
        uuid peca_id FK
        varchar tipo "ENTRADA | SAIDA | RESERVA | LIBERACAO | AJUSTE"
        numeric quantidade "10,3"
        uuid ordem_servico_id "ref. atendimento (sem FK)"
        varchar motivo
        uuid usuario_id "ref. identidade (sem FK)"
        timestamptz ocorrido_em
    }
    ORDENS_SERVICO {
        uuid id PK
        varchar numero UK "OS-AAAA-NNNNNN"
        uuid cliente_id "ref. cadastro (sem FK)"
        uuid veiculo_id "ref. cadastro (sem FK)"
        text descricao_problema
        varchar status "RECEBIDA ... ENTREGUE | CANCELADA"
        numeric orcamento_valor_total "12,2"
        varchar orcamento_status "PENDENTE | ENVIADO | APROVADO | RECUSADO"
        timestamptz orcamento_enviado_em
        timestamptz orcamento_respondido_em
        varchar motivo_recusa_ou_cancelamento
        timestamptz recebida_em
        timestamptz diagnostico_iniciado_em
        timestamptz execucao_iniciada_em
        timestamptz finalizada_em
        timestamptz entregue_em
        uuid criado_por "ref. identidade (sem FK)"
        int versao "lock otimista"
        timestamptz criado_em
        timestamptz atualizado_em
    }
    OS_ITENS_SERVICO {
        uuid id PK
        uuid ordem_servico_id FK
        uuid servico_id "ref. catalogo (sem FK)"
        varchar nome_snapshot
        numeric preco_snapshot "12,2"
        int quantidade
    }
    OS_ITENS_PECA {
        uuid id PK
        uuid ordem_servico_id FK
        uuid peca_id "ref. catalogo (sem FK)"
        varchar nome_snapshot
        numeric preco_unitario_snapshot "12,2"
        numeric quantidade "10,3"
    }
    OS_HISTORICO_STATUS {
        uuid id PK
        uuid ordem_servico_id FK
        varchar de_status
        varchar para_status
        varchar autor "usuario id | CLIENTE | SISTEMA"
        varchar motivo
        timestamptz ocorrido_em
    }
    TOKENS_ACOMPANHAMENTO {
        uuid id PK
        uuid ordem_servico_id FK
        varchar token_hash UK
        timestamptz expira_em
        timestamptz revogado_em
    }
    USUARIOS {
        uuid id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        varchar papeis "ATENDENTE,MECANICO,GERENTE"
        boolean ativo
        timestamptz criado_em
        timestamptz atualizado_em
    }
    CLIENTES ||--o{ VEICULOS : possui
    PECAS ||--o{ MOVIMENTACOES_ESTOQUE : registra
    ORDENS_SERVICO ||--o{ OS_ITENS_SERVICO : contem
    ORDENS_SERVICO ||--o{ OS_ITENS_PECA : contem
    ORDENS_SERVICO ||--o{ OS_HISTORICO_STATUS : transiciona
    ORDENS_SERVICO ||--o{ TOKENS_ACOMPANHAMENTO : emite
    CLIENTES }o..o{ ORDENS_SERVICO : "referencia por id"
    VEICULOS }o..o{ ORDENS_SERVICO : "referencia por id"
    SERVICOS }o..o{ OS_ITENS_SERVICO : "snapshot"
    PECAS }o..o{ OS_ITENS_PECA : "snapshot"
```

`TOKENS_ACOMPANHAMENTO` só existe se a ADR-011 escolher tokens **opacos** persistidos; com JWT assinado (recomendado)
a tabela é opcional (útil para revogação — Could).

## 2. Schemas por módulo

| Schema | Tabelas |
|---|---|
| `cadastro` | `clientes`, `veiculos` |
| `catalogo` | `servicos`, `pecas`, `movimentacoes_estoque` |
| `atendimento` | `ordens_servico`, `os_itens_servico`, `os_itens_peca`, `os_historico_status`, `tokens_acompanhamento`, `os_numero_seq` (sequência anual) |
| `identidade` | `usuarios` |

## 3. Constraints que protegem invariantes (defesa em profundidade)

| Tabela | Constraint |
|---|---|
| `clientes` | `UNIQUE (documento) WHERE ativo` (índice parcial) · `CHECK (tipo_pessoa IN ('PF','PJ'))` · `CHECK (length(documento) IN (11,14))` |
| `veiculos` | `UNIQUE (placa) WHERE ativo` · `CHECK (ano BETWEEN 1900 AND 2100)` |
| `pecas` | `CHECK (quantidade_estoque >= 0)` · `CHECK (quantidade_reservada >= 0 AND quantidade_reservada <= quantidade_estoque)` · `CHECK (preco_unitario >= 0)` |
| `movimentacoes_estoque` | `CHECK (quantidade > 0)` · `CHECK (tipo IN (...))` |
| `ordens_servico` | `CHECK (status IN (...))` · `CHECK (orcamento_valor_total >= 0)` · `UNIQUE (numero)` · índice parcial "1 OS aberta por veículo" (Should): `UNIQUE (veiculo_id) WHERE status NOT IN ('ENTREGUE','CANCELADA')` |
| `os_itens_*` | `CHECK (quantidade > 0)` |
| `os_historico_status` | índice `(ordem_servico_id, ocorrido_em)` |
| `usuarios` | `UNIQUE (email)` |

## 4. Consultas de leitura relevantes

**Tempo médio de execução (geral, período):**

```sql
SELECT AVG(EXTRACT(EPOCH FROM (finalizada_em - execucao_iniciada_em)) / 60.0) AS media_minutos,
       COUNT(*) AS quantidade_os
FROM atendimento.ordens_servico
WHERE finalizada_em IS NOT NULL
  AND execucao_iniciada_em IS NOT NULL
  AND finalizada_em BETWEEN :de AND :ate;
```

**Tempo médio por serviço (OS que contêm o serviço):**

```sql
SELECT i.servico_id, i.nome_snapshot,
       AVG(EXTRACT(EPOCH FROM (o.finalizada_em - o.execucao_iniciada_em)) / 60.0) AS media_minutos,
       COUNT(DISTINCT o.id) AS quantidade_os
FROM atendimento.ordens_servico o
JOIN atendimento.os_itens_servico i ON i.ordem_servico_id = o.id
WHERE o.finalizada_em IS NOT NULL AND o.execucao_iniciada_em IS NOT NULL
  AND o.finalizada_em BETWEEN :de AND :ate
GROUP BY i.servico_id, i.nome_snapshot;
```

**Fila por status:** `SELECT ... FROM atendimento.ordens_servico WHERE status = :status ORDER BY recebida_em`.

## 5. Dados de demonstração (seed)

- 1 usuário por papel (`gerente@oficina.local`, `mecanico@…`, `atendente@…`) com senhas via env.
- 3 clientes (2 PF, 1 PJ) com documentos fictícios válidos; 4 veículos (2 placas antigas, 2 Mercosul).
- 6 serviços (troca de óleo, alinhamento, balanceamento, troca de pastilhas, revisão, diagnóstico eletrônico).
- 8 peças/insumos com estoque e mínimo; 2 com estoque baixo para demonstrar alerta.
- 4 OS em status diferentes, incluindo 2 **finalizadas** (para o tempo médio ≠ null) e 1 aguardando aprovação (para
  demonstrar a aprovação ao vivo no vídeo).

## 6. Migrações

Versionadas na ferramenta da linguagem (Flyway/Liquibase · Prisma Migrate/TypeORM migrations · EF Migrations · Alembic ·
golang-migrate). `V001__schemas.sql`, `V002__cadastro.sql`, `V003__catalogo.sql`, `V004__atendimento.sql`,
`V005__identidade.sql`, `V900__seed_dev.sql` (somente em `APP_ENV=dev`).
