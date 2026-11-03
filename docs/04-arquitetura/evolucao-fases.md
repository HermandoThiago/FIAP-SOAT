# Evolução futura — intenções, não implementação

Intenções, não requisitos confirmados das próximas fases.

## Ponto de partida real

Monólito NestJS em camadas, quatro módulos de negócio, um PostgreSQL com FKs compartilhadas, Prisma chamado diretamente pelos serviços e transações envolvendo OS/estoque. JWT próprio, notificação simulada e execução local via Compose. Ver [visão atual](visao-geral.md).

## Possibilidades a avaliar quando necessárias

| Evolução | Trabalho ainda necessário |
|---|---|
| Deploy/cloud e Kubernetes | Infraestrutura, configuração/segredos, TLS, probes reais, limites e pipeline de deploy |
| Observabilidade | Logs estruturados, correlação/requestId, métricas e tracing; não existem endpoints operacionais próprios hoje |
| Arquitetura mais desacoplada | Encapsular persistência e invariantes, avaliar repositórios/VOs com testes; não são camadas já prontas |
| Notificação real | Adaptador de entrega, retentativas e política segura de distribuição do token |
| Identidade gerenciada | Migrar credenciais, claims e regras de autorização conforme necessidade |
| Extração de serviços | Redesenhar relações/FKs e transações compartilhadas, contratos, consistência eventual, idempotência e compensações |
| Mensageria/CQRS | Projetar publicação confiável/outbox e read models; não há barramento ou handlers implementados |

Módulos identificados e testes ajudam a evolução, mas não tornam a separação de bancos automática.
