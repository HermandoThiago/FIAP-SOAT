# Fluxos principais — diagramas de sequência

> Um por bloco do vídeo. Participantes = camadas/módulos do monólito (ADR-003).

## 1. Criação da OS (com identificação do cliente por documento)

```mermaid
sequenceDiagram
    autonumber
    actor At as Atendente
    participant API as REST /ordens-servico
    participant UC as CriarOrdemDeServico (aplicação)
    participant CAD as Porta ConsultaCadastro (módulo cadastro)
    participant OS as OrdemDeServico (domínio)
    participant REP as Repositório OS
    At->>API: POST {documentoCliente, placa, descricaoProblema} + JWT
    API->>API: valida JWT (papel ATENDENTE+) e DTO (422)
    API->>UC: executar(comando)
    UC->>CAD: buscarClientePorDocumento(doc)
    CAD-->>UC: cliente (ou 404)
    UC->>CAD: buscarVeiculoPorPlaca(placa)
    CAD-->>UC: veículo (ou 404)
    UC->>UC: veículo pertence ao cliente? (409 se não)
    UC->>OS: criar(clienteId, veiculoId, descrição, número gerado)
    OS-->>UC: OS RECEBIDA + evento OrdemDeServicoRecebida + histórico
    UC->>REP: salvar(OS)
    REP-->>UC: ok
    UC-->>API: OS
    API-->>At: 201 Location /ordens-servico/{id}
```

## 2. Diagnóstico, inclusão de itens e orçamento automático

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    participant API as REST
    participant UC as IncluirItemNaOS
    participant CAT as Porta ConsultaCatalogo (catalogo-estoque)
    participant OS as OrdemDeServico
    Me->>API: POST /ordens-servico/{id}/diagnostico
    API->>OS: iniciarDiagnostico()
    OS-->>API: EM_DIAGNOSTICO
    Me->>API: POST /ordens-servico/{id}/itens/pecas {pecaId, quantidade: 2}
    API->>UC: executar
    UC->>CAT: obterPeca(pecaId)
    CAT-->>UC: {nome, precoUnitario, disponivel, ativo}
    UC->>UC: ativo? disponivel ≥ 2? (422 estoque insuficiente — ADR-012)
    UC->>OS: incluirPeca(snapshot{nome, preço}, 2)
    OS->>OS: status permite? recalcula orçamento (Σ itens)
    OS-->>UC: OS com orçamento 330.00 + evento OrcamentoRecalculado
    UC-->>API: OS
    API-->>Me: 201 OS (orçamento atualizado)
```

## 3. Envio do orçamento e aprovação pelo cliente (2 módulos, 1 transação)

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    actor Cl as Cliente
    participant API as REST
    participant ENV as EnviarOrcamento
    participant TOK as EmissorDeToken (aud=cliente)
    participant NOT as Notificador (log)
    participant APR as AprovarOrcamento (transacional)
    participant OS as OrdemDeServico
    participant EST as Porta MovimentacaoEstoque (catalogo-estoque)
    Me->>API: POST /ordens-servico/{id}/orcamento/enviar
    API->>ENV: executar
    ENV->>OS: enviarOrcamento()
    OS-->>ENV: AGUARDANDO_APROVACAO, itens congelados
    ENV->>TOK: emitir(osId, exp 7d)
    TOK-->>ENV: token
    ENV->>NOT: notificar(cliente, link com token)
    NOT-->>ENV: (log) "orçamento enviado"
    ENV-->>API: OS + acompanhamento{url, token(dev)}
    API-->>Me: 200
    Cl->>API: GET /acompanhamento/ordens-servico/{id} (Bearer token)
    API-->>Cl: 200 status + orçamento (dados mascarados)
    Cl->>API: POST /acompanhamento/ordens-servico/{id}/orcamento/aprovar
    API->>API: valida token (aud, osId)
    API->>APR: executar
    activate APR
    APR->>OS: aprovarOrcamento()
    OS-->>APR: EM_EXECUCAO + evento OrcamentoAprovado
    APR->>EST: baixar(itensPeca, osId)
    EST-->>APR: movimentações SAIDA (ou falha → rollback)
    APR->>APR: commit (OS + estoque)
    deactivate APR
    APR-->>API: acompanhamento atualizado
    API-->>Cl: 200 EM_EXECUCAO
```

## 4. Execução, finalização, entrega e métrica

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    actor At as Atendente
    actor Ge as Gerente
    participant API as REST
    participant OS as OrdemDeServico
    participant MET as CalcularTempoMedioExecucao (leitura)
    Me->>API: POST /ordens-servico/{id}/finalizar
    API->>OS: finalizar()
    OS-->>API: FINALIZADA (finalizadaEm) + evento ExecucaoFinalizada
    At->>API: POST /ordens-servico/{id}/entregar
    API->>OS: entregar()
    OS-->>API: ENTREGUE (entregueEm), imutável
    Ge->>API: GET /metricas/tempo-medio-execucao?de=&ate=
    API->>MET: consultar(período)
    MET-->>API: {mediaMinutos: 90.0, quantidadeOs: 2, porServico: [...]}
    API-->>Ge: 200
```

## 5. Autenticação administrativa

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário admin
    participant API as REST /auth/login
    participant AUT as AutenticarUsuario
    participant REP as Repositório Usuário
    participant H as Hash (bcrypt/argon2)
    participant J as EmissorDeToken (JWT)
    U->>API: POST {email, senha}
    API->>AUT: executar
    AUT->>REP: buscarPorEmail
    REP-->>AUT: usuário (ou não)
    AUT->>H: verificar(senha, hash)
    H-->>AUT: ok / falha (401 genérico)
    AUT->>J: emitir(sub, roles, exp 60min)
    J-->>AUT: accessToken
    AUT-->>API: token
    API-->>U: 200 {accessToken, expiresIn}
    U->>API: GET /clientes (Bearer)
    API->>API: filtro valida assinatura/exp/roles → 200 / 401 / 403
```

## 6. Gestão de estoque (entrada e baixa)

```mermaid
sequenceDiagram
    autonumber
    actor Ge as Gerente
    participant API as REST /pecas
    participant UC as RegistrarEntradaDeEstoque
    participant P as Peca (domínio)
    participant REP as Repositório Peça
    Ge->>API: POST /pecas/{id}/movimentacoes {tipo: ENTRADA, quantidade: 10}
    API->>UC: executar
    UC->>P: registrarEntrada(10)
    P->>P: estoque += 10 e nova MovimentacaoEstoque(ENTRADA)
    P-->>UC: ok (+ evento EntradaDeEstoqueRegistrada)
    UC->>REP: salvar
    UC-->>API: movimentação
    API-->>Ge: 201
    Note over P: Baixa: ver fluxo 3 — política "sempre que o orçamento é aprovado"
```
