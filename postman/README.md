# Artefatos Postman

Esta pasta concentra os contratos locais e as instruções auxiliares usadas para testar os workflows publicados do n8n.

## Estrutura

- `collections/curriculo/` contém a collection local em formato v3, com os cinco requests do fluxo de concessão e download.
- `environments/curriculo-local.environment.yaml` contém somente valores não sensíveis e placeholders para segredos locais.
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
