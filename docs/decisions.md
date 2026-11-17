# Decisões do projeto

Este arquivo registra decisões que outra sessão precisa conhecer para retomar o desenvolvimento.

## 2026-11-16 — Idioma do projeto

- Código e artefatos técnicos usam inglês. Isso inclui nomes de arquivos técnicos, variáveis, funções, nodes do n8n, campos, estados, tabelas, colunas e chaves de configuração.
- Arquivos e conteúdos destinados à leitura humana usam português do Brasil. Isso inclui documentação, decisões, instruções, comentários explicativos, mensagens do bot e textos de interface.
- Nomes exigidos por ferramentas e padrões externos são preservados.
- Identificadores técnicos antigos em português serão normalizados quando a área correspondente for alterada e puder ser migrada e testada na mesma etapa.

## 2026-11-16 — Desenvolver primeiro com conversa simulada

- A integração real com a Meta e os envios reais ficam para uma etapa solicitada explicitamente.
- As primeiras entregas usam o webhook de laboratório do n8n e perfis fictícios.
- A sequência local é: conversa persistida, revisão, redação assistida, PDF e só depois canal real e deploy.
- O workflow permanece como rascunho durante o desenvolvimento local.

## 2026-11-16 — PostgreSQL mantém o estado da conversa

- O laboratório usa a tabela `sessions` criada por `migrations/001_sessions.sql`.
- Cada `sender_id` representa uma conversa independente.
- A fila durável, a deduplicação e a proteção do identificador serão adicionadas antes de conectar o webhook real da Meta.

## 2026-11-16 — Exports versionados são sanitizados

- A versão testada do workflow fica em `workflows/service.json`.
- Referências a credenciais da instância, metadados locais e dados fixados de teste não entram no arquivo versionado.
- Ao importar o JSON, a credencial PostgreSQL precisa ser selecionada novamente nos cinco nodes de banco: `Load Session`, `Save Session`, `Save PDF Metadata`, `Save PDF Artifact` e `Load PDF Artifact`.
- O MCP disponível não possui uma operação de export reimportável. Quando houver uma alteração estrutural, o workflow `local-service` deve ser baixado pela interface e revisado antes do commit.

## 2026-11-16 — Representação de contato e objetivo

- `draft.contact` é um objeto com `type`, `value` e `normalized`.
- Telefones brasileiros aceitos são persistidos também no formato normalizado `+55` com DDD; o valor digitado é preservado para conferência humana.
- E-mails são preservados como digitados e normalizados para minúsculas.
- O objetivo aceita de 2 a 160 caracteres. Quando a pessoa responde `pular`, a propriedade `draft.objective` é omitida.
- Estados e campos novos usam inglês. Registros legados com `inicio`, `nome`, `contato` e `draft.nome` são convertidos quando a conversa volta a ser processada.

## 2026-11-16 — Representação de experiências

- Relatos de experiência são preservados literalmente em `draft.experiences` como objetos `{ id, description }`.
- Os IDs seguem a sequência `exp-1`, `exp-2` e assim por diante; eles servem para vincular futuras redações sem inventar fatos.
- `first_job=true` representa uma declaração explícita de primeiro emprego. A lista de experiências permanece vazia.
- A etapa `experience_more` pergunta se a pessoa quer adicionar outro relato antes de seguir para `education`.
- O fluxo não deduz cargo, empresa, datas, resultados ou categoria profissional a partir do relato.

## 2026-11-17 — Escolaridade, cursos e habilidades

- A etapa `education` aceita uma resposta livre de 2 a 160 caracteres e salva o texto original em `draft.education`.
- A etapa `courses` aceita uma resposta livre de 2 a 300 caracteres e salva uma lista em `draft.courses`. Nesta etapa, a lista contém o relato original e ainda não classifica cursos.
- A etapa `skills` aceita uma resposta livre de 2 a 300 caracteres e salva uma lista em `draft.skills`. Nesta etapa, a lista contém o relato original e ainda não normaliza habilidades.
- Nas três etapas, `pular`, `não tenho` e `nao tenho` deixam o campo ausente e avançam para a próxima etapa.
- Depois de habilidades, o estado `review_data` é apenas um marcador. A conferência, correção e confirmação dos dados serão implementadas na próxima etapa.

## 2026-11-17 — Revisão e confirmação dos dados

- `review_data` apresenta um resumo determinístico dos fatos coletados; não há geração por IA nem enriquecimento automático.
- A correção é iniciada por `corrigir`, `editar` ou `alterar` seguido de um campo. O campo pendente fica em `draft.pending_review_field` apenas durante a edição.
- Correções de contato usam as mesmas validações e a normalização da coleta inicial.
- `pular` remove campos opcionais durante uma correção; nome e contato continuam obrigatórios.
- A confirmação salva `draft.review_status=confirmed` e avança para `ready_for_drafting`. A redação permanece separada e será a próxima etapa.

## 2026-11-17 — Rascunho determinístico antes do PDF

- A primeira redação usa o método técnico `deterministic_template_v1` para manter a etapa reproduzível sem credenciais de LLM.
- O texto gerado usa somente fatos presentes no `draft` confirmado; campos ausentes aparecem como `Não informado`.
- O preview fica em `draft.generated_resume` com `status=preview`; a aprovação muda para `status=approved` e o estado `draft_approved`.
- Qualquer correção após a geração invalida o preview e exige nova revisão e confirmação.
- A integração com LLM será uma decisão posterior, depois que o contrato factual e a geração de PDF estiverem verificados.

## 2026-11-17 — PDF local com Gotenberg

- A primeira etapa de PDF usa HTML determinístico e o endpoint interno do serviço `gotenberg`; não há chamada a LLM nem a canal externo.
- O HTML é montado somente com `draft.generated_resume.text`, com escape de caracteres antes de entrar no documento.
- O pedido é representado por `pdf_status=requested`, `pdf_filename` e pelos campos transitórios `pdf_html` e `pdf_requested`. O HTML também é convertido em binário `pdf_html_file` com o nome `index.html`.
- O workflow usa um node `If` para não chamar o conversor quando a mensagem não pede PDF. O node HTTP espera o binário em `data`.
- A primeira tentativa real usou multipart montado manualmente e falhou porque o n8n reescreveu o boundary do cabeçalho. A correção usa `contentType=multipart-form-data` e um campo `formBinaryData`.
- A execução MCP sem pin data retornou um PDF real em `data`, com MIME `application/pdf`; a visualização foi conferida manualmente e considerada correta.

## 2026-11-17 — Validação visual do PDF

- O PDF real foi baixado e conferido manualmente pelo usuário; conteúdo e formatação foram considerados corretos.
- A próxima etapa é persistir o artefato localmente e registrar metadados de recuperação. Não haverá envio por Meta ou outro canal externo nessa etapa.

## 2026-11-17 — Persistência do PDF no PostgreSQL local

- O armazenamento primário do PDF é a tabela técnica `resume_artifacts`, com o conteúdo em `bytea` e chave `artifact_id`.
- O identificador combina segmentos sanitizados de `sender_id`, `message_id` e `pdf_filename`; mensagens diferentes produzem artefatos diferentes.
- `draft.pdf_storage_path` é uma URI lógica `db://resume_artifacts/<artifact_id>`, não um caminho do sistema de arquivos.
- A migração oficial é `migrations/002_resume_artifacts.sql`. O node `Save PDF Artifact` também usa `CREATE TABLE IF NOT EXISTS` para permitir testes em uma base local ainda não migrada.
- O n8n armazena binários grandes fora do JSON de execução; por isso o Code node usa `this.helpers.getBinaryDataBuffer(0, 'data')` e entrega Base64 parametrizado ao PostgreSQL. Não se deve usar `$binary.data.data` como se fosse o conteúdo.
- O node `Save PDF Artifact` devolve tanto `reply` quanto `response`; isso mantém a mensagem humana disponível para `Save PDF Metadata` e para a resposta final do webhook.
- A tentativa com `Read/Write Files from Disk` foi abandonada porque o ambiente atual não possui diretório gravável/montado para esse node. A decisão evita depender de montagem manual e mantém o artefato recuperável no banco local.
- A etapa não publica o workflow e não envia o PDF a canais externos. A próxima decisão será o contrato de recuperação/download.

## 2026-11-17 — Recuperação controlada do PDF

- A recuperação usa o comando humano `baixar pdf` e reutiliza o `draft.pdf_artifact_id` da sessão; não aceita um identificador arbitrário vindo de outra sessão.
- A consulta exige simultaneamente `artifact_id` e `sender_id`, evitando que uma conversa leia o artefato de outra.
- O node `Prepare PDF Download` devolve o binário em `binary.data`, com MIME, nome e tamanho do registro persistido.
- A recuperação não reconverte o currículo e não altera o artefato armazenado. O contrato de entrega por Meta ou outro canal fica para uma etapa posterior.

## 2026-11-17 — Endpoint HTTP separado para entrega do PDF

- O download HTTP foi colocado no workflow `pdf-download`, separado do `local-service`, para não misturar resposta binária com a resposta conversacional.
- O contrato de laboratório é `POST /webhook/curriculo-pdf-dev` com `sender_id` e `artifact_id` no corpo JSON.
- A consulta filtra pelos dois identificadores. Registro ausente ou pertencente a outro remetente produz 404, sem revelar se o artefato existe para outra sessão.
- O ramo de sucesso usa `Respond to Webhook` com binário, `Content-Type` do registro e `Content-Disposition` de anexo; o ramo de erro responde JSON em português.
- Naquele momento o endpoint permanecia sem autenticação por estar limitado ao laboratório local. Antes de expor a rede, ficou decidido adicionar Header Auth, URL assinada ou mecanismo equivalente.
- A versão testada foi `019cb06f-299a-41de-adcf-e64dbf353e48`; o espelho sanitizado fica em `workflows/pdf-download.json`. O MCP não oferece export oficial reimportável, então o download oficial deve ser feito pela interface do workflow `pdf-download` quando necessário.
- Ao importar o espelho em outra instância, a única configuração manual do workflow é selecionar a credencial PostgreSQL no node `Load PDF Artifact`.

## 2026-11-17 — Header Auth no endpoint de download

- O webhook `PDF Download Webhook` passou a exigir `Header Auth` antes de aceitar o corpo do pedido.
- A credencial deve ser criada manualmente na interface porque a instância não possui uma credencial `httpHeaderAuth` e o MCP disponível não cria credenciais desse tipo.
- O nome recomendado do cabeçalho de laboratório é `X-Download-Token`. O valor é local, não deve entrar no export sanitizado e não deve ser publicado em documentação ou commit.
- Execuções manuais pelo MCP não exercitam a autenticação HTTP; elas servem apenas para verificar que o grafo continua retornando o PDF e os erros depois da alteração.
- A versão testada dessa alteração é `ae9e0da6-e51e-47eb-b2a5-321e8fd9dab8`. A validação efetiva do token deve ser feita pela Test URL após associar a credencial.

## 2026-11-17 — Concessões temporárias de download

- A emissão de acesso foi separada no workflow `pdf-grant`; o endpoint de recuperação ainda não foi alterado nesta etapa.
- A tabela `download_grants` mantém o vínculo entre `sender_id`, `artifact_id`, hash do token e `expires_at`, além de reservar `revoked_at` e `used_at` para o ciclo de vida.
- O token é gerado pelo PostgreSQL com `pgcrypto`, não pelo sandbox JavaScript do n8n. O primeiro ensaio com `crypto.randomUUID()` falhou e foi removido.
- O token bruto só aparece na resposta 201 da emissão. O banco armazena apenas o hash SHA-256; pedidos 404 não geram token na saída.
- O TTL aceito é limitado a 60–3600 segundos. Valores menores ou maiores são ajustados antes da persistência.
- A concessão usa a mesma credencial Header Auth do laboratório e permanece em rascunho. Nenhuma publicação ou entrega externa ocorre nesta decisão.
- A próxima alteração deve ser no workflow `pdf-download`: receber `X-Download-Grant`, comparar o hash com a concessão, exigir validade temporal e filtrar por remetente/artefato.

## 2026-11-17 — Validação da concessão no download

- O workflow `pdf-download` mantém o `Header Auth` do laboratório e adiciona o header `X-Download-Grant` como segunda barreira.
- A consulta compara o hash SHA-256 do token com `download_grants` e exige simultaneamente `sender_id`, `artifact_id`, `revoked_at IS NULL` e `expires_at > now()`.
- A concessão é reutilizável até expirar. Não há atualização de `used_at` nesta etapa para preservar reintentos seguros do download.
- Falhas de concessão retornam 403 genérico antes de consultar o conteúdo do PDF; o endpoint não diferencia publicamente token ausente, inválido, expirado ou revogado.
- A versão testada é `417f4a22-e394-4f79-a81e-4688c16c8972`; o export sanitizado está em `workflows/pdf-download.json`.
- A próxima decisão será implementar revogação explícita e limpeza de concessões expiradas. O consumo único só será adotado se o canal real exigir esse comportamento.

## 2026-11-17 — Revogação explícita de concessões

- A revogação foi separada no workflow `pdf-revoke-grant`, sem misturar a operação administrativa com o download do PDF.
- A solicitação exige `grant_id`, `sender_id` e o token no header `X-Download-Grant`; o SQL só atualiza a linha quando os três valores correspondem ao hash persistido.
- Token incorreto, remetente divergente e concessão inexistente compartilham HTTP 404 para não confirmar a existência de uma concessão.
- A operação usa `COALESCE(revoked_at, now())` e é idempotente: reintentos válidos não alteram o instante original da revogação.
- O workflow continua inativo e não publicado. A credencial Header Auth e a credencial PostgreSQL são as mesmas já usadas nos workflows de concessão e download.
- A versão testada é `caeb63b7-af6a-4325-83fd-69504618771f`; o espelho sanitizado está em `workflows/pdf-revoke-grant.json`.
- A próxima etapa deve limpar concessões expiradas ou revogadas de forma agendada, mantendo a política de retenção explícita antes de remover dados.

## 2026-11-17 — Limpeza agendada de concessões

- A limpeza foi isolada no workflow `pdf-grant-cleanup`, separado dos endpoints de emissão, revogação e download.
- O agendamento é diário e a retenção padrão é de sete dias após `expires_at` ou `revoked_at`.
- A consulta retorna um resumo agregado mesmo sem linhas elegíveis, facilitando auditoria e monitoramento posterior.
- Concessões válidas e revogações recentes não são removidas; o intervalo de retenção evita apagar registros imediatamente após o uso.
- O workflow permanece inativo e não publicado. A única configuração manual é selecionar a credencial PostgreSQL já usada pelos demais workflows, caso o espelho seja importado em outra instância.
- A execução de teste com retenção zero removeu seis concessões fictícias antigas do banco local; esse override não está no workflow nem no export.
- A versão testada é `3466f49c-ef39-4ebd-985c-e9a1c38bda68`; o espelho sanitizado está em `workflows/pdf-grant-cleanup.json`.
- Antes da ativação, os três endpoints devem ser conferidos pela Test URL com Header Auth e dados fictícios.

## 2026-11-17 — Coleção Postman para os endpoints de concessão

- A collection `curriculo` foi mantida no workspace `Gabriel Severo's Workspace` e recebeu requests para emissão, download válido, revogação, download revogado e download sem concessão.
- O ambiente `curriculo-local` usa variáveis para base URL, remetente, artefato, `grant_id` e token de concessão; o valor do Header Auth fica em variável secreta do Postman.
- O request de emissão atualiza automaticamente `grant_id` e `download_grant` no ambiente para encadear os requests seguintes.
- Não foi gravado segredo no repositório. A collection usa `{{download_auth_token}}` no header `X-Download-Token`.
- A tentativa HTTP pela Test URL retornou 404 porque os workflows permanecem inativos e nenhum listener de teste estava aberto. O teste completo exige iniciar o listener no editor do n8n para cada webhook.
- A conexão MCP do Postman disponibilizada nesta sessão permite gerenciar collections, mas não expõe o runner `runCollection`; a execução final deverá ser feita pelo runner/interface do Postman enquanto o listener estiver ativo.

## 2026-11-17 — Nova tentativa dos testes de contrato

- A execução manual pelo MCP do n8n confirmou novamente o contrato funcional: emissão 201, download válido 200, revogação 200 e download revogado 403.
- A validação de Header Auth não foi considerada aprovada por esses ensaios, porque o modo manual do n8n ignora a barreira de entrada do webhook.
- A Test URL respondeu 404 enquanto nenhum workflow estava escutando; isso não foi interpretado como falha do contrato.
- O runner `runCollection` não está disponível como ferramenta chamável nesta conexão Postman. O Postman CLI foi instalado depois (`1.90.0`) e autenticou com a conta do workspace, mas as operações cloud para carregar collection/environment retornaram `AggregateError`; por isso a execução reproduzível foi feita a partir de exports locais temporários.
- A execução local da collection comprovou o runner e as asserções: 5 requests foram enviados, 7 testes falharam porque os endpoints Test URL responderam 404 (`webhook ... is not registered`). Isso confirma a limitação operacional atual (workflows inativos/sem listener), não uma falha do runner.

## 2026-11-17 — Teste autônomo dos workflows publicados

- O `postman init` instalou as instruções em `postman/skills/` e criou os metadados em `.postman/`. O workspace local foi vinculado ao workspace Postman da equipe.
- A collection local v3 foi materializada em `postman/collections/curriculo/`; o ambiente versionado contém apenas valores não sensíveis e placeholders para os segredos.
- Como os workflows foram publicados, as cinco requests passaram de `/webhook-test/` para `/webhook/`. A collection remota `curriculo` foi alinhada pelo MCP do Postman, sem alterar scripts, credenciais ou variáveis.
- O Postman CLI executou a collection publicada com dados fictícios: 5 requests, 7 asserções, exit code 0. Foram observados 201 (emissão), 200 com `application/pdf` (download válido), 200 (revogação) e 403 (download revogado e sem concessão).
- O Header Auth foi fornecido apenas por override de execução; nenhum valor secreto foi gravado nos arquivos locais ou no repositório.
- Um ensaio isolado com token inválido retornou HTTP 403 e passou a asserção explícita de rejeição. O comando unitário do CLI encerra com código 1 para respostas 4xx esperadas; esse código não representa falha da asserção nesse caso.

## 2026-11-17 — Orquestração interna da concessão após persistência do PDF

- O workflow `local-service` agora chama o endpoint publicado `pdf-grant` depois de `Save PDF Metadata`, usando a credencial Header Auth já existente e TTL fixo de 900 segundos para esta etapa.
- O novo node `Prepare Delivery Response` transforma a resposta interna em metadados seguros: `delivery_status`, `artifact_id`, `grant_id`, `grant_expires_at`, `download_endpoint_path` e `reply`. O `download_token` não é repassado nem salvo na sessão.
- A primeira execução da alteração falhou porque o HTTP Request referenciava `$('Mark PDF Stored')` sem item pareado. A correção fez `Save PDF Metadata` retornar `sender_id` e passou a usar somente o item corrente.
- A URL interna usa `http://localhost:5678/webhook/curriculo-grant-dev`, adequada ao laboratório atual. Antes de mover o n8n para outro ambiente, essa base deve virar uma variável de configuração.
- A alteração ficou no rascunho do `local-service`; não houve nova publicação nem envio externo.
- O espelho sanitizado da versão testada está em `workflows/service.json`, sem credenciais, tokens, `pinData` ou `webhookId`.
