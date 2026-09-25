# ADR-003 — Algoritmo de hashing de senhas (com justificativa exigida no enunciado)

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — encerrada em 23/09/2026  |
| Tipo | Tipo 1 |
| Decisores | Grupo |
| Data | 2026-09-23 |
| Relacionadas | ADR-002 Banco de Dados, ADR-014 ORM |

## Contexto e problema

O sistema armazena credenciais de usuário (login por e-mail/senha) na tabela de usuários, via Prisma + PostgreSQL. Senha nunca deve ser armazenada em texto puro nem com hash reversível ou "rápido demais" (ex.: `MD5`, `SHA-256` puro), pois esses algoritmos foram projetados para velocidade, não para resistir a ataques de força bruta/GPU. Precisamos escolher um algoritmo de hashing de senha adequado, adotado como boa prática atual pela comunidade de segurança (ex.: OWASP), equilibrando segurança, custo computacional no servidor e maturidade da biblioteca disponível para Node.js/NestJS.

## Critérios de decisão

1. Resistência a ataques de força bruta e a hardware especializado (GPU/ASIC/FPGA) — peso 5
2. Recomendação de referências de segurança reconhecidas (ex.: OWASP Password Storage Cheat Sheet) — peso 5
3. Maturidade e manutenção da biblioteca no ecossistema Node.js — peso 4
4. Custo computacional controlável (tempo, memória, paralelismo) sem inviabilizar o servidor da aplicação — peso 4
5. Facilidade de uso correto (API simples, poucos parâmetros para errar) — peso 3
6. Familiaridade do grupo e curva de aprendizado dentro do prazo do curso — peso 3

## Opções consideradas

### Opção A — Argon2id

- **Prós:** vencedor da *Password Hashing Competition* (2015) e algoritmo **recomendado como primeira opção** pelo OWASP Password Storage Cheat Sheet; a variante **id** combina resistência a ataques de canal lateral (side-channel, como a variante Argon2i) com resistência a ataques de GPU/ASIC via alto custo de memória (como a variante Argon2d), sendo a recomendação padrão para hashing de senha; parâmetros de custo ajustáveis (memória, iterações, paralelismo) permitem calibrar o algoritmo conforme o hardware do servidor; biblioteca `argon2` para Node.js é madura, mantida e usa bindings nativos (mais rápida que implementações puras em JS); salt e parâmetros de custo ficam embutidos no próprio hash de saída, simplificando o armazenamento (uma única coluna `String` no schema Prisma).
- **Contras:** exige mais memória por hash do que bcrypt, o que pode ser um fator a calibrar em ambientes com recursos muito limitados (não é um problema para o MVP); parâmetros mal configurados podem tanto enfraquecer a segurança quanto sobrecarregar o servidor — mitigado usando os valores recomendados pela OWASP como ponto de partida.
- **Fases futuras:** os parâmetros de custo podem ser aumentados gradualmente conforme o hardware de produção evolui, sem quebrar hashes já existentes (o algoritmo e os parâmetros usados ficam registrados no próprio hash).

### Opção B — bcrypt

- **Prós:** extremamente difundido, testado em produção há décadas; biblioteca `bcrypt`/`bcryptjs` madura no Node.js; API simples (`hash`, `compare`); ainda é uma opção aceitável segundo o OWASP quando Argon2 não está disponível.
- **Contras:** custo de memória fixo e baixo, o que o torna mais suscetível a paralelização em GPUs/ASICs do que o Argon2id; limite de 72 bytes na entrada (senhas muito longas são truncadas silenciosamente em algumas implementações, exigindo cuidado extra); o próprio OWASP recomenda Argon2id como primeira escolha, deixando bcrypt como alternativa secundária.
- **Fases futuras:** continua funcional, mas fica tecnicamente "datado" frente às recomendações atuais de resistência a hardware especializado.

### Opção C — PBKDF2

- **Prós:** disponível nativamente no módulo `crypto` do Node.js (sem dependência externa); aprovado pelo NIST e ainda aceito pelo OWASP como terceira opção quando FIPS-140 é exigido.
- **Contras:** não usa memória como fator de custo, o que o torna o mais vulnerável dos três a ataques com GPUs/ASICs especializados em paralelizar cálculos de hash; exige mais iterações para compensar essa fraqueza, aumentando o tempo de resposta sem ganhar a mesma resistência a hardware dedicado.
- **Fases futuras:** aceitável apenas em cenários de compliance específico (FIPS); não é a melhor escolha para um projeto sem essa exigência.


## Recomendação (não vinculante)

**Argon2id.** Justificativa pronta para README/vídeo:

> "Escolhemos Argon2id porque é o algoritmo de hashing de senha recomendado como primeira opção pelo OWASP Password Storage Cheat Sheet, vencedor da Password Hashing Competition. Diferente de hashes rápidos como SHA-256/MD5, o Argon2id foi desenhado para ser computacionalmente caro de propósito, com custo de memória configurável, o que dificulta ataques de força bruta mesmo com hardware especializado (GPU/ASIC). A variante 'id' combina resistência a ataques de canal lateral com resistência a ataques de paralelização, sendo mais robusta que bcrypt e PBKDF2 nesse quesito. A biblioteca `argon2` para Node.js é madura, usa bindings nativos para performance e tem API simples, o que reduz a chance de uso incorreto. Salt e parâmetros de custo ficam embutidos no hash gerado, simplificando o armazenamento no schema do Prisma e permitindo recalibrar o custo no futuro sem quebrar hashes já salvos."

## Decisão

> **Argon2id** (Opção A)

## Consequências

- Adicionar a dependência `argon2` (biblioteca com binding nativo) ao backend NestJS.
- Criar um serviço/provider dedicado (ex.: `PasswordHasherService`) para centralizar `hash()` e `verify()`, evitando chamar a biblioteca diretamente nos controllers/services de domínio.
- Definir e documentar os parâmetros de custo iniciais (memória, iterações, paralelismo) com base nas recomendações da OWASP, ajustáveis por variável de ambiente.
- Campo de senha no schema Prisma continua como `String` — o hash Argon2id já embute algoritmo, salt e parâmetros usados.
- Nunca logar, retornar em respostas de API ou serializar a senha em texto puro ou o hash em respostas desnecessárias.
- Testes de autenticação devem cobrir hash/verify (inclusive senha incorreta) sem expor timing que facilite ataques de enumeração de usuários.


