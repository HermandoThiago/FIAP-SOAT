# language: pt
Funcionalidade: Verificação de saúde da API
  Como operador da plataforma
  Quero consultar as rotas de saúde da API
  Para saber se o processo e o banco de dados respondem

  Cenário: Liveness informa que o processo está no ar
    Quando consulto "/health"
    Então a resposta é 200
    E o corpo contém "status" igual a "UP"

  Cenário: Readiness confirma que o banco de dados responde
    Quando consulto "/ready"
    Então a resposta é 200
    E o corpo contém "status" igual a "UP"

  Cenário: Rota inexistente devolve Problem Details 404
    Quando consulto "/api/v1/rota-inexistente"
    Então a resposta é 404
    E o corpo é um Problem Details com status 404
