# Estrutura alvo do repositório (agnóstica de linguagem)

> Concretizar após ADR-001 (linguagem) e ADR-003 (arquitetura). O prompt `prompts/02-esqueleto-do-projeto.md` gera o
> esqueleto real a partir desta estrutura.

```text
<repositorio>/                        # nome do repositório será trocado (issue #1, item 12)
├── README.md                         # objetivo, como executar, como testar, links dos entregáveis
├── docker-compose.yml                # api + banco (+ migrações/seed) — obrigatório
├── Dockerfile                        # multi-stage, usuário não-root, imagem slim — obrigatório
├── .env.example                      # todas as variáveis (sem valores reais)
├── .github/
│   ├── workflows/ci.yml              # build · lint · testes · cobertura (gate) · openapi.json
│   ├── workflows/security.yml        # semgrep · SCA · trivy · gitleaks · (zap manual)
│   ├── ISSUE_TEMPLATE/               # tarefa.md · decisao.md
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                             # esta documentação
├── prompts/
├── src/
│   ├── shared/                       # kernel compartilhado (pequeno!)
│   │   ├── domain/                   # Dinheiro, Quantidade, Documento(CPF/CNPJ), Placa, Email, Telefone, erros de domínio, evento base
│   │   ├── application/              # portas genéricas: Relogio, GeradorDeId, PublicadorDeEventos, UnitOfWork
│   │   └── infra/                    # config (env), logging (máscara), erros HTTP (Problem Details), auth (filtro JWT), barramento em processo
│   ├── modules/
│   │   ├── cadastro/
│   │   │   ├── domain/               # Cliente, Veiculo, repositórios (interfaces), eventos
│   │   │   ├── application/          # CadastrarCliente, AtualizarCliente, InativarCliente, CadastrarVeiculo, …, ConsultaCadastro (porta exposta)
│   │   │   └── adapters/
│   │   │       ├── in/rest/          # ClientesController, VeiculosController, DTOs, mapeadores, OpenAPI
│   │   │       └── out/persistence/  # entidades ORM / mapeamentos / repositórios
│   │   ├── catalogo-estoque/
│   │   │   ├── domain/               # Servico, Peca, MovimentacaoEstoque
│   │   │   ├── application/          # CRUDs, RegistrarEntrada, AjustarEstoque, BaixarEstoque, LiberarReserva, ConsultaCatalogo (porta exposta)
│   │   │   └── adapters/{in/rest,out/persistence}
│   │   ├── atendimento/
│   │   │   ├── domain/               # OrdemDeServico, ItemServico, ItemPeca, Orcamento, StatusOS, PoliticaDeTransicao, HistoricoStatus, eventos
│   │   │   ├── application/          # CriarOrdemDeServico, IniciarDiagnostico, IncluirItemNaOS, RemoverItem, EnviarOrcamento,
│   │   │   │                         # AprovarOrcamento, RecusarOrcamento, FinalizarExecucao, RegistrarEntrega, CancelarOS,
│   │   │   │                         # ConsultarAcompanhamento, ListarOS, CalcularTempoMedioExecucao
│   │   │   │                         # portas de saída: ConsultaCadastro, ConsultaCatalogo, MovimentacaoEstoque, NotificadorDeCliente, EmissorDeTokenAcompanhamento
│   │   │   └── adapters/
│   │   │       ├── in/rest/          # OrdensServicoController, AcompanhamentoController, MetricasController
│   │   │       └── out/              # persistence/, notificacao/LogNotificador, cadastro/ (adaptador que chama a aplicação do módulo cadastro), catalogo/
│   │   └── identidade/
│   │       ├── domain/               # Usuario, Papel, SenhaHash
│   │       ├── application/          # AutenticarUsuario, EmitirToken, ValidarToken, CRUD de usuários
│   │       └── adapters/{in/rest,out/{persistence,jwt,hash}}
│   └── main/                         # bootstrap: composição de dependências (DI), rotas, migrações, seed
├── tests/  (ou junto do código, conforme a linguagem)
│   ├── unit/                         # domínio + aplicação com fakes (rápidos, sem I/O)
│   ├── integration/                  # casos de uso + repositório real (Testcontainers) + HTTP
│   └── bdd/                          # features/*.feature (Gherkin) + steps
└── scripts/                          # seed, scans locais, geração do openapi.json
```

## Regras de dependência (verificáveis por lint de arquitetura)

1. `domain` não importa nada de `application`, `adapters`, `infra` ou frameworks.
2. `application` importa `domain` e `shared/application`; nunca `adapters`.
3. `adapters/in` importa `application`; `adapters/out` implementa interfaces de `domain`/`application`.
4. Um módulo só conhece outro pela **porta exposta** em `application` do outro (`ConsultaCadastro`, `ConsultaCatalogo`, `MovimentacaoEstoque`) — nunca por `domain` ou `adapters`.
5. `shared` é pequeno e estável; se crescer, é sinal de que algo deveria ser de um módulo.

## Mapeamento para os principais frameworks (referência rápida)

| Camada | Java/Spring | TS/NestJS | .NET | Python/FastAPI | Go |
|---|---|---|---|---|---|
| adapters/in | `@RestController` + DTO + springdoc | `@Controller` + DTO + `@nestjs/swagger` | Controllers/Minimal API + Swashbuckle | Routers + Pydantic | handlers + oapi-codegen/swaggo |
| application | `@Service`/classes puras + `@Transactional` | providers/use cases + transação do ORM | services + `DbContext` transaction | classes puras + sessão SQLAlchemy | structs + tx |
| domain | classes puras (sem anotação JPA) | classes puras | classes puras (records) | dataclasses/pydantic (puro) | structs + métodos |
| adapters/out | Spring Data JPA (entidades ORM separadas do domínio) | Prisma/TypeORM (mapeadores) | EF Core (configurações separadas) | SQLAlchemy imperative mapping | sqlc/GORM |
| lint de arquitetura | ArchUnit | dependency-cruiser / eslint-plugin-boundaries | NetArchTest | import-linter | go-arch-lint / depguard |
