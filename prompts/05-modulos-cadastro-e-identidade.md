# 05 — Módulos `cadastro` e `identidade` (F3/F4)

```text
Implemente os módulos cadastro e identidade conforme docs/01-requisitos/PRD-001 e PRD-005,
docs/04-arquitetura/contrato-api.md §3.1–3.2 e docs/05-qualidade-e-seguranca/seguranca.md. Decisões: {{AUTH}} (ADR-004),
{{IDS}} (ADR-009).

CADASTRO
1. Domínio: Cliente (tipoPessoa, Documento, nome, Email, Telefone, ativo), Veiculo (clienteId, Placa, marca, modelo,
   ano 1900..atual+1, cor, ativo); documento e placa imutáveis (placa alterável só por GERENTE via caso de uso próprio).
2. Aplicação: CRUDs com inativação; unicidade de documento/placa entre ativos; bloqueio de inativação com OS em aberto
   (porta para o módulo atendimento); porta exposta ConsultaCadastro (buscarClientePorId/Documento,
   buscarVeiculoPorId/Placa, veiculoPertenceAoCliente).
3. Adapters: persistência com índices parciais únicos; REST conforme contrato; máscara de documento/placa em logs;
   testes de integração (201, 409 duplicado, 422 documento/placa inválidos, 204, 409 com OS aberta).

IDENTIDADE (se ainda não feito no esqueleto — prompt 02)
1. Usuario (nome, email único, senhaHash, papeis ATENDENTE|MECANICO|GERENTE, ativo); hash bcrypt/argon2.
2. AutenticarUsuario (401 genérico), EmitirToken (claims sub, roles, iss, aud=admin, iat, exp 60 min), ValidarToken;
   CRUD de usuários restrito a GERENTE (Should).
3. Filtro de autenticação/autorização; rotas públicas em allowlist; rate limit/atraso progressivo no login (Should).
4. Testes: unit do emissor/validador (assinatura inválida, expirado, aud errado); integração 200/401/403.

Gere também o utilitário de dados fictícios válidos para testes (gerarCpfValido, gerarCnpjValido, gerarPlacaAntiga,
gerarPlacaMercosul) e use-o nos seeds.
```
