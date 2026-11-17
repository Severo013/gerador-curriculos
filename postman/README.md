# Artefatos Postman

Esta pasta concentra os contratos locais e as instruções auxiliares usadas para testar os workflows publicados do n8n.

## Estrutura

- `collections/curriculo/` contém a collection local em formato v3, com os cinco requests do fluxo de concessão e download.
- `environments/curriculo-local.environment.yaml` contém somente valores não sensíveis e placeholders para segredos locais.
- `simulations/openai-resume/` contém os cenários locais de sucesso, HTTP 429, HTTP 503 e timeout da dependência OpenAI.
- `.dependencies/mocks/OpenAI API/` contém o mock verificado referenciado por `.postman/resources.yaml`; não contém credenciais do projeto.
- `skills/` foi instalado pelo `postman init` e fornece as instruções que o agente deve seguir para tarefas de API.
- `.postman/resources.yaml` vincula o projeto ao workspace Postman utilizado pela equipe.

## Teste local

Preencha o valor secreto do Header Auth apenas na execução local, sem gravá-lo no arquivo versionado:

```powershell
postman collection run `
  postman/collections/curriculo `
  -e postman/environments/curriculo-local.environment.yaml `
  --env-var download_auth_token=<valor-local> `
  --output tmp/postman-run `
  --no-report-events
```

O resultado esperado é uma execução com cinco requests e sete asserções aprovadas. Os artefatos gerados em `tmp/` são ignorados pelo Git.

## Simulação da OpenAI

Inicie o cenário desejado em uma porta local e aponte temporariamente o HTTP Request do rascunho para o endereço do membro `openai`:

```powershell
postman simulation run `
  postman/simulations/openai-resume/openai-resume.sim.yaml `
  --port 4010 `
  --no-history
```

No Docker Desktop, o endereço usado pelo n8n é `http://host.docker.internal:4010/openai/v1/responses`. Os arquivos com sufixos `rate-limit`, `overloaded` e `timeout` mantêm o mesmo endereço e substituem somente o comportamento da dependência. Depois do teste, restaure o endpoint parametrizado pela variável do n8n `OPENAI_BASE_URL`.
