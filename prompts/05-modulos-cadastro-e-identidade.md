# 05 — Módulos `customers` e `identity` (F3 Hermando / F4)

```text
Implemente os módulos customers e identity conforme docs/01-requisitos/PRD-001 e PRD-005, docs/03-ddd/linguagem-ubiqua.md
§3 e §5, docs/04-arquitetura/contrato-api.md §3.1–3.2 e docs/05-qualidade-e-seguranca/seguranca.md, na estrutura de
camadas clássicas de docs/04-arquitetura/estrutura-do-repositorio.md. Decisões aceitas: ADR-004 (JWT próprio HS256,
bcrypt), ADR-009 (UUID v4), ADR-011 (login de cliente com papel CUSTOMER). Nada está em votação.

CUSTOMERS
1. domain/: Customer (customerType INDIVIDUAL|COMPANY, Document, name, Email, Phone, active), Vehicle (customerId,
   LicensePlate, brand, model, year 1900..atual+1, color, active); document e licensePlate imutáveis (placa alterável
   só por MANAGER via método próprio do service).
2. services/: CustomersService (register/update/deactivate/findById/findByDocument) e VehiclesService (register/update/
   deactivate/findById/findByLicensePlate/belongsToCustomer); unicidade de documento/placa entre ativos; bloqueio de
   inativação com OS em aberto consultando o ServiceOrdersService exportado (use forwardRef() para o import circular
   CustomersModule ↔ ServiceOrdersModule); os dois services exportados pelo CustomersModule (usados por service-orders
   e identity).
3. repositories/ + controllers/ + dto/: repositórios Prisma com índices parciais únicos; controllers/DTOs conforme o
   contrato; máscara de documento/placa em logs; testes de integração (201, 409 duplicado, 422 documento/placa
   inválidos, 204, 409 com OS aberta).

IDENTITY (se ainda não feito no esqueleto — prompt 02)
1. User (name, email único, passwordHash bcrypt custo 12, roles ATTENDANT|MECHANIC|MANAGER|CUSTOMER, customerId
   obrigatório se e só se CUSTOMER, active).
2. AuthService (login com 401 genérico; JWT com claims sub, roles, iss, aud=api, iat, exp 60 min e customerId quando
   CUSTOMER; validateToken), TrackingTokenService (issue/validate com aud=tracking e sub=serviceOrderId, 7 dias),
   UsersService (register — equipe só por MANAGER; CUSTOMER por ATTENDANT/MANAGER, validando o cliente pelo
   CustomersService; CRUD restante Should).
3. Guards em shared/auth: JwtAuthGuard global com allowlist de rotas públicas (@Public()), @Roles(),
   TrackingAuthGuard (token de acompanhamento ou login CUSTOMER; rejeita JWT de equipe); CUSTOMER em rota
   administrativa → 403; rate limit/atraso progressivo no login (Should).
4. Testes: unit dos tokens (assinatura inválida, expirado, aud errado, customerId ausente para CUSTOMER); integração
   200/401/403, criação de usuário CUSTOMER (404 cliente inexistente).

Gere também test/support/fixtures com geradores de dados fictícios válidos (validCpf, validCnpj, oldLicensePlate,
mercosulLicensePlate) e use-os nos seeds.
```
