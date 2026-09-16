# 05 — Módulos `customers` e `identity` (F3 Hermando / F4)

```text
Implemente os módulos customers e identity conforme docs/01-requisitos/PRD-001 e PRD-005, docs/03-ddd/linguagem-ubiqua.md
§3 e §5, docs/04-arquitetura/contrato-api.md §3.1–3.2 e docs/05-qualidade-e-seguranca/seguranca.md, na estrutura Clean
de docs/04-arquitetura/estrutura-do-repositorio.md. Decisões em votação: {{AUTH}} (ADR-004), {{IDS}} (ADR-009).

CUSTOMERS
1. domain/: Customer (customerType INDIVIDUAL|COMPANY, Document, name, Email, Phone, active), Vehicle (customerId,
   LicensePlate, brand, model, year 1900..atual+1, color, active); document e licensePlate imutáveis (placa alterável só
   por MANAGER via use case próprio).
2. application/: RegisterCustomer/UpdateCustomer/DeactivateCustomer/FindCustomerByDocument, RegisterVehicle/UpdateVehicle/
   DeactivateVehicle/FindVehicleByLicensePlate; unicidade de documento/placa entre ativos; bloqueio de inativação com OS em
   aberto (porta para o módulo service-orders); porta exposta CustomerLookup (findCustomerById/ByDocument,
   findVehicleById/ByLicensePlate, vehicleBelongsToCustomer).
3. adapters/ + infrastructure/: gateways com índices parciais únicos; controllers/presenters/DTOs conforme o contrato;
   máscara de documento/placa em logs; testes de integração (201, 409 duplicado, 422 documento/placa inválidos, 204,
   409 com OS aberta).

IDENTITY (se ainda não feito no esqueleto — prompt 02)
1. User (name, email único, passwordHash bcrypt, roles ATTENDANT|MECHANIC|MANAGER, active).
2. AuthenticateUserUseCase (401 genérico), IssueAccessTokenUseCase (claims sub, roles, iss, aud=admin, iat, exp 60 min),
   ValidateAccessToken; RegisterUser e CRUD de usuários restrito a MANAGER (Should).
3. Guard de autenticação/autorização em shared/adapters; rotas públicas em allowlist; rate limit/atraso progressivo no
   login (Should).
4. Testes: unit do token service (assinatura inválida, expirado, aud errado); integração 200/401/403.

Gere também test/support/fixtures com geradores de dados fictícios válidos (validCpf, validCnpj, oldLicensePlate,
mercosulLicensePlate) e use-os nos seeds.
```
