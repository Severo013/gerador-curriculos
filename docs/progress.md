# Progresso de implementação

## Baseline — concluída em 2026-11-16

### Escopo

- Workflow n8n: `local-service`
- ID da instância local: `cys1lKVvdyjMlcVL`
- Versão testada: `faf176c4-d60d-46c5-85a9-3ce249d37f01`
- Estado de publicação: rascunho, sem versão publicada

### Alterações

- O node `Input` foi padronizado para `Entrada` na instância n8n.
- A referência do Code node foi atualizada para `$('Entrada')`.
- O JSON local foi sincronizado e sanitizado.

### Testes fictícios via MCP

| Execução | Entrada | Resultado observado |
|---|---|---|
| `10` | `baseline-a-20261116` envia `Oi` | Estado `nome`; pede o nome. |
| `11` | O mesmo remetente envia `Joana Teste` | Estado `contato`; `draft.nome` contém `Joana Teste`. |
| `12` | `baseline-b-20261116` envia `Oi` | Estado `nome` com rascunho vazio, independente do primeiro remetente. |

As três execuções terminaram com status `success`. Os dados são inteiramente fictícios e nenhuma entrega externa foi realizada.

### Como reproduzir

1. Confirme que a migração `migrations/001_sessions.sql` foi aplicada.
2. No MCP n8n, execute o workflow `cys1lKVvdyjMlcVL` a partir do node `Webhook`.
3. Forneça pin data no formato `{ "body": { "sender_id": "teste-unico", "message_id": "m01", "text": "Oi" } }`.
4. Repita com o mesmo `sender_id`, outro `message_id` e o texto `Joana Teste`.
5. Use um segundo `sender_id` e confirme que ele começa no estado `nome` com rascunho vazio.

### Próxima entrega sugerida

Persistir o PDF gerado em armazenamento local e registrar metadados suficientes para recuperá-lo, sem ainda enviar por canais externos.

## Contato e objetivo — concluída em 2026-11-16

### Escopo

- Workflow n8n: `local-service`
- Versão testada: `895e3c1f-376e-4593-87c1-c6219deac636`
- Estado de publicação: rascunho, sem versão publicada

### Alterações

- Nodes técnicos foram normalizados para `Input`, `Load Session`, `Process Conversation` e `Save Session`.
- Estados técnicos foram normalizados para `start`, `name`, `contact`, `objective` e `experience`.
- Telefone brasileiro com DDD e e-mail passaram a ser validados e normalizados.
- Contatos inválidos permanecem na etapa `contact` sem alterar o rascunho.
- Objetivos entre 2 e 160 caracteres são persistidos; entradas inválidas permanecem em `objective`.
- O comando `pular` ignora o objetivo e avança para `experience`.
- Estados e o campo de nome da baseline em português são migrados durante a leitura.

### Testes fictícios via MCP

| Execuções | Caminho | Resultado observado |
|---|---|---|
| `13`–`14` | Início e nome de Ana Fictícia | Avançou de `name` para `contact`. |
| `15`–`16` | Telefone curto e e-mail incompleto | Permaneceu em `contact`, sem contato salvo. |
| `17` | Telefone `(11) 98765-4321` | Avançou para `objective`; normalizado para `+5511987654321`. |
| `18` | Objetivo com um caractere | Permaneceu em `objective`, sem objetivo salvo. |
| `19` | Objetivo `Atendimento ao cliente` | Avançou para `experience` com o objetivo salvo. |
| `20`–`22` | Início, nome e e-mail de Bruno Exemplo | E-mail validado e normalizado para minúsculas; avançou para `objective`. |
| `23` | Comando `PULAR` | Avançou para `experience` sem propriedade `objective`. |
| `24` | Sessão legada em `contato` com `draft.nome` | Migrou para `objective` com `draft.name` e preservou o nome. |

Todas as 12 execuções terminaram com status `success`. Os dados são fictícios e nenhuma API externa foi chamada.

### Como reproduzir

1. Use um `sender_id` novo e envie `Oi`, um nome e depois contatos inválidos como `12345` e `ana@exemplo`.
2. Confirme que o estado continua em `contact` e que `draft.contact` não existe.
3. Envie um telefone brasileiro com DDD e confirme o estado `objective` e o campo normalizado.
4. Envie um objetivo com um caractere e confirme que o estado não muda.
5. Envie um objetivo válido e confirme o estado `experience`.
6. Com outro `sender_id`, avance usando um e-mail válido e responda `PULAR`; confirme que não existe `draft.objective`.

## Experiências — concluída em 2026-11-16

### Escopo

- Workflow n8n: `local-service`
- Versão testada: `8756df6d-2dca-4df3-ba5b-0b7ef00c61fe`
- Estado de publicação: rascunho, sem versão publicada

### Alterações

- Relatos válidos são salvos literalmente em `draft.experiences` com IDs `exp-1`, `exp-2` etc.
- `primeiro emprego` e `pular` registram `first_job=true`, uma lista vazia e avançam para `education`.
- Relatos com menos de 5 ou mais de 1000 caracteres permanecem em `experience`.
- Após um relato, `sim` permite adicionar outra experiência; `não` avança para `education`.
- O relato não é classificado nem enriquecido com cargo, empresa, datas ou resultados.

### Testes fictícios via MCP

| Execuções | Caminho | Resultado observado |
|---|---|---|
| `25`–`29` | Primeiro emprego de Carla Primeiro | Avançou até `education` com `first_job=true` e `experiences=[]`. |
| `30`–`33` | Início, nome, telefone e objetivo de Diego Experiência | Chegou a `experience` com os fatos anteriores preservados. |
| `34` | Relato `x` | Permaneceu em `experience` e não criou experiência. |
| `35` | Primeiro relato informal | Criou `exp-1` preservando o texto original. |
| `36` | Comando `sim` | Abriu `experience_additional`. |
| `37` | Segundo relato informal | Criou `exp-2` preservando o texto original. |
| `38` | Comando `não` | Avançou para `education`. |

Todas as 14 execuções terminaram com status `success`. Os dados são fictícios e nenhuma API externa foi chamada.

### Como reproduzir

1. Use um `sender_id` novo e avance até `experience`.
2. Envie `primeiro emprego` e confirme `first_job=true`, `experiences=[]` e estado `education`.
3. Em outra sessão, envie um relato curto e confirme que ele é rejeitado.
4. Envie um relato com pelo menos 5 caracteres e confirme `exp-1`.
5. Responda `sim`, envie outro relato e confirme `exp-2`.
6. Responda `não` e confirme o estado `education`.

## Escolaridade, cursos e habilidades — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão de rascunho testada: `06510899-843d-4acc-94c9-0f864cc66cc4`
- Versão publicada preservada: `8756df6d-2dca-4df3-ba5b-0b7ef00c61fe`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- A etapa `education` agora coleta escolaridade opcional e preserva o texto em `draft.education`.
- A etapa `courses` coleta um curso opcional em `draft.courses`.
- A etapa `skills` coleta habilidades opcionais em `draft.skills`.
- Entradas curtas são rejeitadas sem alterar o rascunho.
- `pular`, `não tenho` e `nao tenho` avançam sem criar o campo correspondente.
- O fluxo termina em `review_data`, que ainda é um placeholder para a revisão da próxima etapa.

### Testes fictícios via MCP

| Execuções | Caminho | Resultado observado |
|---|---|---|
| `55`–`62` | Marina Pula informa nome e e-mail, pula objetivo, primeiro emprego, escolaridade, cursos e habilidades | Todas terminaram com `success`; o estado final foi `review_data`, com `first_job=true` e campos opcionais ausentes. |
| `63`–`73` | Rafael Estudos percorre o caminho com valores e entradas inválidas `x` | `68` permaneceu em `education`, `70` em `courses` e `72` em `skills`; os valores válidos foram preservados e `73` terminou em `review_data`. |
| `74`–`81` | Beatriz Alternativa usa `não tenho`, `nao tenho` e `pular` nas etapas opcionais | Os três comandos foram aceitos como pular; `79` avançou para `courses`, `80` para `skills` e `81` terminou em `review_data`. |

Todas as 27 execuções foram feitas com dados fictícios e terminaram com status `success`. Não houve chamadas a Meta, OpenAI, Gotenberg ou outros serviços externos.

### Como reproduzir

1. Use um `sender_id` novo e avance até `education`.
2. Envie `x` e confirme que o estado permanece em `education`; depois envie uma escolaridade válida.
3. Em `courses`, repita com `x` e depois um curso válido.
4. Em `skills`, repita com `x` e depois uma lista de habilidades.
5. Confirme que o último retorno está em `review_data` e que o rascunho contém `education`, `courses` e `skills`.
6. Para o caminho opcional, responda `pular` nas três perguntas e confirme que os campos são omitidos.

## Revisão e confirmação dos dados — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão de rascunho testada: `94d2c08a-57c7-40ae-b02a-8bc3a58dd14d`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- O estado `review_data` mostra um resumo em português com nome, contato, objetivo, experiência, escolaridade, cursos e habilidades.
- `corrigir <campo>`, `editar <campo>` e `alterar <campo>` abrem a edição de `nome`, `contato`, `objetivo`, `experiência`, `escolaridade`, `cursos` ou `habilidades`.
- Cada correção reutiliza as validações do campo; contatos continuam sendo normalizados.
- Campos opcionais podem ser removidos respondendo `pular` durante a correção.
- `confirmar`, `confirmado`, `sim` ou `ok` registram `draft.review_status=confirmed` e avançam para `ready_for_drafting`.
- A redação do currículo ainda não é executada nesta etapa.

### Testes fictícios via MCP

| Execuções | Caminho | Resultado observado |
|---|---|---|
| `93`–`103` | Renata Revisão chega ao resumo, corrige `cursos` e confirma | `100` mostrou o resumo; `101` abriu `review_edit`; `102` salvou `Curso de Excel avançado`; `103` terminou em `ready_for_drafting` com `review_status=confirmed`. |
| `104`–`109` | A mesma sessão tenta corrigir contato com `x`, envia telefone válido, remove objetivo e confirma novamente | `105` permaneceu em `review_edit`; `106` normalizou o telefone para `+5511988887777`; `108` removeu o objetivo; `109` confirmou novamente. |

Todas as 17 execuções finais terminaram com status `success` e usaram dados fictícios. O primeiro ensaio `82`–`92` foi interrompido por um erro de sintaxe no alias `e-mail`; o alias foi corrigido, validado e não houve persistência dessas execuções.

### Como reproduzir

1. Use um `sender_id` novo e avance até `review_data`.
2. Confirme que o bot exibe o resumo e aceita `corrigir cursos`.
3. Envie um valor inválido para um contato durante `review_edit` e confirme que a etapa não avança.
4. Envie um telefone válido e confirme a normalização.
5. Responda `corrigir objetivo` e depois `pular` para remover o campo.
6. Responda `confirmar` e confirme o estado `ready_for_drafting` e `draft.review_status=confirmed`.

## Rascunho determinístico do currículo — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão de rascunho testada: `89f1aaf4-c36d-49c3-a243-6943b1b97238`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- `ready_for_drafting` aceita `gerar currículo`, `gerar`, `redigir` e variações sem acento.
- O estado `draft_ready` salva `draft.generated_resume` com texto, método `deterministic_template_v1` e status `preview`.
- O texto usa somente os campos confirmados, com seções de objetivo, experiência, escolaridade, cursos e habilidades.
- `aprovar`, `aprovado` ou `confirmar` mudam o estado para `draft_approved`.
- Uma correção após a geração remove o rascunho gerado e retorna ao fluxo de revisão.
- Esta etapa não chama LLM, OpenAI, Meta, Gotenberg ou qualquer serviço externo; é uma simulação determinística para validar o contrato do conteúdo.

### Testes fictícios via MCP

| Execuções | Caminho | Resultado observado |
|---|---|---|
| `110`–`111` | Renata Revisão solicita `gerar currículo` e aprova | `110` criou `draft_ready` com texto factual; `111` mudou para `draft_approved` com `generated_resume.status=approved`. |
| `112`–`115` | Corrige habilidades, reconfirma e gera novamente usando `gerar` | `112` retornou a `review_edit`; `113` atualizou habilidades; `114` reconfirmou; `115` gerou novo preview sem o texto antigo. |

Todas as 6 execuções terminaram com status `success` e usaram dados fictícios.

### Como reproduzir

1. Use uma sessão confirmada em `ready_for_drafting`.
2. Envie `gerar currículo` e confirme o estado `draft_ready`.
3. Verifique `draft.generated_resume.text` e confirme que ele contém apenas os dados coletados.
4. Envie `aprovar` e confirme o estado `draft_approved`.
5. Opcionalmente, envie `corrigir habilidades`, altere o campo, confirme novamente e use `gerar`.

## Solicitação de PDF local — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão de rascunho testada: `5f8a84c2-71bd-419e-a6af-db5e5e581cd4`
- Versão publicada preservada: `8756df6d-2dca-4df3-ba5b-0b7ef00c61fe`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- O estado `draft_approved` aceita `pdf`, `gerar PDF`, `criar PDF` e variações sem acento.
- O Code node gera HTML determinístico escapado a partir de `draft.generated_resume.text` e cria o binário `pdf_html_file` com o nome `index.html`.
- O pedido salva `draft.pdf_status=requested` e um nome de arquivo seguro, como `renata-revisao.pdf`.
- O node `Check PDF Request` separa os pedidos de PDF do caminho de resposta normal.
- O node `Convert PDF with Gotenberg` envia `pdf_html_file` como campo binário `files` em multipart para `http://gotenberg:3000/forms/chromium/convert/html` e espera um arquivo binário em `data`.
- O JSON versionado em `workflows/service.json` contém o espelho sanitizado da versão testada e não contém credenciais, dados fixados de execução ou metadados locais.

### Testes fictícios via MCP

| Execução | Caminho | Resultado observado |
|---|---|---|
| `116` | `aprovar` em um rascunho aprovado | Terminou com `success`; `Check PDF Request` seguiu pela saída falsa e nenhum conversor foi executado. |
| `117` | `gerar pdf` no estado `draft_approved`, com pin data | Terminou com `success`; o caminho foi validado, mas a saída do conversor era simulada. |
| `118`–`119` | Conversão real com corpo multipart montado manualmente | Falharam com `Invalid form data: form file 'index.html' is required`; o n8n reescrevia o boundary do cabeçalho e o corpo continuava usando o boundary fixo. |
| `120` | Conversão real com arquivo binário multipart | Terminou com `success`; Gotenberg retornou `application/pdf` em `data`, com aproximadamente 13,5 kB e nome UUID. |

O retorno de `117` foi fixado pelo pin data do MCP como `simulated_pdf_conversion=true`. A execução `120` removeu essa simulação e comprovou a conversão real pelo Gotenberg. A inspeção visual foi conferida pelo usuário e considerada em ordem em 2026-11-17.

### Como reproduzir

1. Use uma sessão em `draft_approved` com `draft.generated_resume.status=approved`.
2. Execute o workflow pelo node `Webhook` com `{ "body": { "sender_id": "teste-pdf", "message_id": "pdf-01", "text": "gerar pdf" } }`.
3. Confira em `Process Conversation` o estado `pdf_requested`, `pdf_filename`, `pdf_html` e o binário `pdf_html_file` com nome `index.html`.
4. Confira que `Check PDF Request` saiu pela porta verdadeira e que `Convert PDF with Gotenberg` retornou o binário `data` com MIME `application/pdf`.
5. Para repetir a conversão real, execute o workflow manualmente sem pin data e mantenha o Gotenberg em execução.

### Validação visual

O PDF da execução real foi baixado e conferido manualmente; o conteúdo e a formatação foram considerados corretos. Essa conferência não foi automatizada pelo MCP.

## Próxima etapa proposta — persistência local do artefato PDF

### Escopo sugerido

- Adicionar um armazenamento local explícito para os PDFs gerados.
- Salvar o binário com caminho determinístico por `sender_id`, revisão e nome seguro.
- Registrar no `draft` o estado `pdf_status=stored`, o caminho lógico, o MIME e o tamanho.
- Manter a resposta sem envio externo; a entrega por Meta ou outro canal fica para depois.

### Critério de aceite

Uma execução fictícia em `draft_approved` deve gerar um PDF, persistir exatamente um artefato recuperável no armazenamento local e salvar no estado da sessão os metadados correspondentes. Uma segunda solicitação deve produzir um artefato identificável sem sobrescrever silenciosamente o anterior.

## Persistência do artefato PDF no PostgreSQL — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão de rascunho testada: `83bac21a-2618-45d5-929e-931d212de473`
- Versão publicada preservada: `8756df6d-2dca-4df3-ba5b-0b7ef00c61fe`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- A persistência deixou de usar `Read/Write Files from Disk`, pois a instância n8n não expõe um diretório gravável para esse node no ambiente atual.
- A migração `migrations/002_resume_artifacts.sql` cria a tabela `resume_artifacts` com o PDF em `bytea`.
- O Code node gera `draft.pdf_artifact_id` determinístico por remetente, mensagem e nome seguro do arquivo.
- O campo `draft.pdf_storage_path` passa a ser uma URI lógica `db://resume_artifacts/<artifact_id>`.
- `Save PDF Artifact` cria a tabela como fallback idempotente, grava o Base64 do binário convertido e retorna o tamanho real.
- `Save PDF Metadata` grava `pdf_status=stored`, MIME, tamanho e data no rascunho da sessão.

### Testes fictícios via MCP

| Execução | Resultado observado |
|---|---|
| `126` | O Gotenberg converteu o PDF e `Mark PDF Stored` marcou `stored`, mas o primeiro INSERT falhou porque `$binary.data.data` era apenas o marcador `filesystem-v2`. |
| `127` | Sucesso; `Save PDF Artifact` retornou `artifact_id=review-values-20261117b-persist-db-2-renata-revisao.pdf` e `pdf_size_bytes=13511`. `Save PDF Metadata` persistiu os mesmos metadados. |
| `128` | Sucesso; uma segunda mensagem gerou o artefato distinto `review-values-20261117b-persist-db-3-renata-revisao.pdf`, também com 13511 bytes. |
| `129` | Sucesso; repetir a mesma mensagem reutilizou o mesmo `artifact_id`, confirmando o `ON CONFLICT` idempotente. |
| `130` | Sucesso no caminho sem PDF; `Check PDF Request` seguiu pela saída falsa e `Save Session` manteve o fluxo conversacional normal. |
| `131` | Sucesso após corrigir o alias de retorno; `Save PDF Metadata` devolveu a mensagem humana em `response`, além dos metadados persistidos. |

As execuções usaram dados fictícios, o Gotenberg local real e o PostgreSQL local. A tabela foi criada pelo fallback idempotente do node durante o teste `127`; a migração permanece como caminho canônico para novos ambientes. Nenhuma mensagem foi enviada à Meta, e a falha `126` foi corrigida antes da conclusão da etapa.

### Como reproduzir

1. Confirme que a sessão fictícia `review-values-20261117b` está em `draft_approved` com `generated_resume.status=approved`.
2. Execute o workflow pelo node `Webhook` com `{ "body": { "sender_id": "review-values-20261117b", "message_id": "persist-db-repro-1", "text": "gerar pdf" } }`.
3. Confira os nodes `Convert PDF with Gotenberg`, `Mark PDF Stored`, `Save PDF Artifact` e `Save PDF Metadata` com status `success`.
4. Verifique `artifact_id`, `pdf_size_bytes > 0`, `pdf_status=stored` e a URI `db://resume_artifacts/...` no retorno do artefato e na sessão.
5. Repita com outro `message_id` e confirme que o `artifact_id` muda sem sobrescrever o primeiro.

### Limitação conhecida

O MCP n8n não oferece export reimportável. O arquivo `workflows/service.json` é um espelho sanitizado da versão testada; se for necessário baixar o export oficial, use a interface do n8n no workflow `local-service` e revise credenciais antes de versionar.

## Recuperação do artefato PDF — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão de rascunho testada: `51f26bde-4bcb-44be-801b-3d3272a60bf6`
- Versão publicada preservada: `8756df6d-2dca-4df3-ba5b-0b7ef00c61fe`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- O comando humano `baixar pdf` (e aliases em inglês) agora recupera o `artifact_id` armazenado na sessão.
- `Check PDF Retrieval` separa a recuperação do caminho de geração/conversão.
- `Load PDF Artifact` consulta `resume_artifacts` por `artifact_id` e `sender_id`, evitando acesso cruzado entre sessões.
- `Prepare PDF Download` transforma o Base64 retornado pelo PostgreSQL em binário `application/pdf` com nome e tamanho preservados.
- O caminho de geração continua usando Gotenberg; o caminho de recuperação não reconverte nem cria um novo artefato.

### Testes fictícios via MCP

| Execução | Resultado observado |
|---|---|
| `132` | O ramo foi acionado, mas revelou que o `artifact_id` não era propagado para a consulta; não houve leitura do PDF. |
| `133` | Sucesso após a correção; `Load PDF Artifact` retornou o artefato `review-values-20261117b-persist-db-4-renata-revisao.pdf` com 13511 bytes e `Prepare PDF Download` devolveu binário PDF. |
| `134` | Sucesso no caminho conversacional sem PDF; os dois nodes de decisão seguiram pelas saídas falsas. |

O teste usou o artefato fictício já persistido. Nenhum envio externo foi realizado e não houve nova conversão pelo Gotenberg.

### Como reproduzir

1. Use a sessão `review-values-20261117b`, que possui `draft.pdf_status=stored`.
2. Execute o Webhook com `{ "body": { "sender_id": "review-values-20261117b", "message_id": "download-repro-1", "text": "baixar pdf" } }`.
3. Confirme `Load PDF Artifact=success`, `Prepare PDF Download=success`, `pdf_found=true`, MIME `application/pdf` e tamanho `13511`.
4. Em uma chamada HTTP real, o último node (`Prepare PDF Download`) é o responsável pelo corpo binário da resposta.

## Endpoint HTTP local para download do PDF — concluída em 2026-11-17

### Escopo

- Workflow n8n: `pdf-download`
- ID da instância local: `B3EPlJjW6pFxf9dv`
- Versão testada: `019cb06f-299a-41de-adcf-e64dbf353e48`
- Estado de publicação: rascunho local, sem publicação solicitada ou realizada
- Endpoint de laboratório: `POST /webhook/curriculo-pdf-dev`

### Alterações

- O download foi separado do workflow conversacional para manter a resposta do webhook de chat estável.
- O endpoint recebe `{ "sender_id": "...", "artifact_id": "..." }` no corpo JSON.
- A consulta SQL exige `artifact_id` e `sender_id` simultaneamente; um remetente diferente não consegue ler o artefato.
- Artefato encontrado retorna HTTP 200, binário `application/pdf` e `Content-Disposition` com o nome seguro do arquivo.
- Artefato inexistente ou pertencente a outro remetente retorna HTTP 404 com JSON em português.
- O export sanitizado da versão testada está em `workflows/pdf-download.json`, sem credenciais, pin data ou payloads de teste.

### Testes fictícios via MCP

| Execução | Entrada | Resultado observado |
|---|---|---|
| `135` | Remetente `review-values-20261117b` e artefato persistido | `success`; ramo binário; PDF `renata-revisao.pdf`, `application/pdf`, `13511` bytes. |
| `136` | Artefato `missing-artifact-20261117` | `success`; ramo de erro; resposta 404 com `pdf_found=false`. |
| `137` | Artefato válido, mas `sender_id=other-sender-20261117` | `success`; consulta não encontrou registro; resposta 404, comprovando isolamento por remetente. |

Todas as execuções foram manuais, com dados fictícios e sem envio externo. Na conclusão dessa etapa o endpoint ainda estava sem autenticação; a proteção Header Auth foi adicionada na etapa seguinte e requer associação manual da credencial.

### Como reproduzir

1. Confirme que o workflow `local-service` possui o artefato `review-values-20261117b-persist-db-4-renata-revisao.pdf` para `review-values-20261117b`.
2. No MCP n8n, execute o workflow `B3EPlJjW6pFxf9dv` pelo node `PDF Download Webhook` com:
   `{ "body": { "sender_id": "review-values-20261117b", "artifact_id": "review-values-20261117b-persist-db-4-renata-revisao.pdf" } }`.
3. Confira `Respond PDF Binary`, o binário `data`, MIME `application/pdf`, tamanho `13511` e o cabeçalho `Content-Disposition`.
4. Repita com `missing-artifact-20261117` ou com outro `sender_id` e confira `Respond Download Error` e o status 404.
5. Para o teste HTTP pela interface do n8n, use a URL de teste `http://localhost:5678/webhook-test/curriculo-pdf-dev` enquanto o workflow estiver em modo de escuta.

### Export oficial

O MCP devolve o conteúdo da versão, mas não oferece export reimportável. O arquivo versionado é um espelho sanitizado; se for necessário o export oficial, baixe pela interface do n8n no workflow `pdf-download` e revise credenciais antes de versionar. Ao importar o espelho em outra instância, abra o node `Load PDF Artifact` e selecione a credencial PostgreSQL correspondente ao banco local.

## Autenticação de laboratório para o download — implementação concluída; configuração manual pendente

### Escopo

- Workflow n8n: `pdf-download`
- Versão testada: `ae9e0da6-e51e-47eb-b2a5-321e8fd9dab8`
- Estado de publicação: rascunho local, sem publicação solicitada ou realizada
- Modo de autenticação configurado no node `PDF Download Webhook`: `Header Auth`

### Alterações

- O webhook deixou de aceitar chamadas sem autenticação e agora exige uma credencial de Header Auth.
- A credencial não foi criada pelo MCP porque a instância não possui uma credencial `httpHeaderAuth` e o servidor MCP não oferece criação desse tipo.
- O JSON versionado continua sem credencial ou segredo; a associação precisa ser feita na interface do n8n.

### Configuração manual necessária

1. Abra `http://localhost:5678/workflow/B3EPlJjW6pFxf9dv`.
2. Selecione `PDF Download Webhook` e confirme `Authentication = Header Auth`.
3. Crie uma credencial nova com nome `PDF Download Lab Header`.
4. Use `X-Download-Token` como nome do cabeçalho e gere um valor local aleatório. Não registre esse valor em `workflows/` nem em documentos versionados.
5. Salve a credencial e o workflow como rascunho. Não publique.
6. Para testar pela interface, use `Test URL` (`/webhook-test/curriculo-pdf-dev`) enquanto o workflow estiver escutando. Uma chamada sem o cabeçalho ou com valor incorreto deve ser rejeitada antes de iniciar a execução; uma chamada com o valor correto deve seguir para a resposta binária ou 404 do artefato.

### Testes fictícios via MCP

| Execução | Entrada | Resultado observado |
|---|---|---|
| `138` | Artefato válido e header fictício | `success`; o caminho downstream continuou retornando o PDF binário. |
| `139` | Artefato válido sem header | `success` no modo manual do MCP; o downstream continuou funcionando. |

Esses dois testes são regressão do grafo, não uma prova de autenticação: `execute_workflow` em modo `manual` inicia diretamente o trigger e não aplica a barreira HTTP do Webhook. A rejeição real do header deve ser conferida no Test URL depois da credencial manual ser associada.

### Export e próxima etapa

O espelho sanitizado da versão está em `workflows/pdf-download.json`, sem credenciais, `pinData` ou `webhookId`. O MCP não oferece export oficial reimportável; para baixar o export oficial, use a interface do workflow `pdf-download`. Depois de conferir a autenticação, a próxima etapa sugerida é definir expiração ou revogação do token antes de qualquer exposição fora da rede local.

## Emissão de concessões temporárias de download — concluída em 2026-11-17

### Escopo

- Migração: `migrations/003_download_grants.sql`
- Workflow n8n: `pdf-grant`
- ID da instância local: `rnbvW4SSj4ApKkpC`
- Versão testada: `59991c94-7c6e-42f8-a5d6-9787d30f85c2`
- Endpoint de laboratório: `POST /webhook/curriculo-grant-dev`
- Estado de publicação: rascunho local, sem publicação solicitada ou realizada

### Alterações

- A tabela `download_grants` registra `grant_id`, remetente, artefato, hash do token, expiração, revogação e uso.
- A migração habilita `pgcrypto`; o PostgreSQL gera 32 bytes aleatórios e persiste somente `digest(raw_token, 'sha256')`.
- O workflow valida `sender_id` e `artifact_id`, limita o TTL entre 60 e 3600 segundos e confirma que o artefato pertence ao remetente.
- Uma concessão válida retorna HTTP 201 com o token bruto uma única vez, o identificador da concessão e `expires_at`.
- Artefato inexistente retorna HTTP 404 sem materializar token; entrada incompleta retorna HTTP 400.
- O workflow reaproveita a credencial Header Auth já configurada para o laboratório. O export em `workflows/pdf-grant.json` não contém credenciais nem tokens.

### Testes fictícios via MCP

| Execução | Entrada | Resultado observado |
|---|---|---|
| `150` | Artefato válido, TTL de 600 segundos | `success`; HTTP 201; token hexadecimal de 64 caracteres, `grant_created=true` e expiração persistida. |
| `151` | Artefato inexistente | `success`; HTTP 404; `grant_created=false` e nenhum token na saída do node de persistência. |
| `152` | `artifact_id` ausente | `success`; HTTP 400, sem acesso ao PostgreSQL. |
| `153` | Artefato válido, TTL solicitado de 1 segundo | `success`; TTL foi limitado para 60 segundos. |

O primeiro ensaio `144`–`145` falhou porque o sandbox do Code node não expõe `crypto.randomUUID()`. A geração foi movida para `pgcrypto` e os testes finais foram repetidos com sucesso. Os tokens retornados nos testes são fictícios; nenhum foi enviado a canal externo.

### Como reproduzir

1. Confirme que o artefato `review-values-20261117b-persist-db-4-renata-revisao.pdf` pertence ao remetente `review-values-20261117b`.
2. Execute `rnbvW4SSj4ApKkpC` pelo node `PDF Grant Webhook` com:
   `{ "body": { "sender_id": "review-values-20261117b", "artifact_id": "review-values-20261117b-persist-db-4-renata-revisao.pdf", "ttl_seconds": 600 } }`.
3. Confira `Respond Grant JSON`: `status_code=201`, `grant_created=true`, `download_token` com 64 caracteres e `expires_at` futuro.
4. Repita com um artefato inexistente e depois sem `artifact_id`; confira 404 e 400 respectivamente.
5. A validação HTTP real usa a mesma credencial `X-Download-Token` do laboratório. O MCP executa em modo manual e não substitui o teste da Test URL.

### Limite desta etapa

Na versão imediatamente anterior, o workflow `pdf-download` ainda não exigia `X-Download-Grant`; esta etapa conectou a concessão ao download e decidiu pela reutilização até `expires_at`, sem consumo único.

### Export oficial

O MCP não oferece export oficial reimportável. `workflows/pdf-grant.json` é o espelho sanitizado da versão testada; para obter o export oficial, baixe o workflow `pdf-grant` pela interface do n8n e associe novamente as credenciais Header Auth e PostgreSQL.

## Validação da concessão durante o download — concluída em 2026-11-17

### Escopo

- Workflow n8n: `pdf-download`
- Versão testada: `417f4a22-e394-4f79-a81e-4688c16c8972`
- Nós: 11, organizados em três grupos visuais
- Estado de publicação: rascunho local, sem publicação solicitada ou realizada

### Alterações

- O endpoint continua exigindo o `Header Auth` compartilhado e agora também exige `X-Download-Grant`.
- `Normalize Download Request` extrai remetente, artefato e concessão do pedido.
- `Validate Download Grant` compara `digest(token, 'sha256')`, `sender_id`, `artifact_id`, `expires_at` e `revoked_at`.
- A concessão é reutilizável enquanto estiver válida; nenhum `used_at` é gravado nesta etapa.
- Concessão ausente, inválida, expirada ou revogada recebe HTTP 403 com mensagem genérica, sem revelar a existência do artefato.
- Somente uma concessão válida alcança `Load PDF Artifact` e pode retornar o binário HTTP 200.
- O export sanitizado atualizado está em `workflows/pdf-download.json`, sem credenciais, tokens, `pinData` ou `webhookId`.

### Testes fictícios via MCP

| Execução | Cenário | Resultado observado |
|---|---|---|
| `159` | Concessão válida e artefato correto | `success`; `grant_status=valid`; PDF retornado com 200 e 13511 bytes. |
| `160` | Repetição da mesma concessão | `success`; mesma concessão reutilizada; PDF retornado novamente. |
| `161` | Header `X-Download-Grant` ausente | `success`; `grant_status=missing`; resposta 403 antes da leitura do artefato. |
| `162` | Token incorreto | `success`; `grant_status=invalid`; resposta 403. |
| `163` | Token válido com outro `sender_id` | `success`; `grant_status=invalid`; resposta 403, comprovando vínculo por remetente. |

O ensaio `155`–`156` revelou uma referência antiga no node `Load PDF Artifact`; ela foi corrigida para usar os campos normalizados antes dos testes finais. As execuções foram manuais via MCP e não substituem o teste HTTP da Test URL, pois o modo manual não aplica a barreira do Header Auth.

### Como reproduzir

1. Emita uma concessão pelo workflow `pdf-grant` para o artefato `review-values-20261117b-persist-db-4-renata-revisao.pdf` e copie o `download_token` da resposta 201.
2. Execute `pdf-download` pelo node `PDF Download Webhook` com os dois headers: o `X-Download-Token` do laboratório e `X-Download-Grant` com o token emitido.
3. Use no corpo `{ "sender_id": "review-values-20261117b", "artifact_id": "review-values-20261117b-persist-db-4-renata-revisao.pdf" }`.
4. Confirme `Validate Download Grant=grant_status valid`, `Respond PDF Binary=success`, MIME `application/pdf` e tamanho `13511`.
5. Repita sem `X-Download-Grant`, com valor incorreto e com outro remetente; confirme HTTP 403 e que `Load PDF Artifact` não é executado.

### Próxima etapa sugerida

Criar revogação explícita de concessões e uma rotina de limpeza de registros expirados. A decisão de consumo único permanece aberta até observar o comportamento de reintentos no canal real.

### Export oficial

O MCP não oferece export oficial reimportável. `workflows/pdf-download.json` é o espelho sanitizado da versão testada; para obter o export oficial, baixe o workflow `pdf-download` pela interface do n8n e associe novamente as credenciais Header Auth e PostgreSQL.

## Revogação explícita de concessões — concluída em 2026-11-17

### Escopo

- Workflow n8n: `pdf-revoke-grant`
- ID: `N69bz7oTgCpGTzEn`
- Versão testada: `caeb63b7-af6a-4325-83fd-69504618771f`
- Nós: 7, com o grupo visual `Revocation Persistence`
- Endpoint de laboratório: `POST /webhook/curriculo-revoke-grant-dev`
- Estado de publicação: rascunho local, sem publicação solicitada ou realizada

### Alterações

- O webhook mantém o `Header Auth` do laboratório e exige `X-Download-Grant`.
- O corpo exige `sender_id` e `grant_id`; ausência de qualquer campo ou do token retorna HTTP 400.
- `Revoke Download Grant` compara o hash SHA-256 do token, o remetente e o identificador da concessão antes de gravar `revoked_at`.
- Token incorreto, remetente divergente ou concessão inexistente retorna HTTP 404 genérico, sem confirmar a existência do registro.
- A revogação é idempotente: repetir a mesma solicitação válida retorna HTTP 200 e preserva o primeiro `revoked_at`.
- O export sanitizado está em `workflows/pdf-revoke-grant.json`, sem credenciais, tokens, `pinData` ou `webhookId`.

### Testes fictícios via MCP

| Execução | Cenário | Resultado observado |
|---|---|---|
| `169` | Remetente sem vínculo com o artefato | `success`; emissão rejeitada com 404, sem criar concessão. |
| `170` | Emissão de concessão para o artefato válido | `success`; HTTP 201 e concessão fictícia criada. |
| `171` | Revogação com token, remetente e `grant_id` corretos | `success`; HTTP 200 e `revoked_at` persistido. |
| `172` | Download usando a concessão revogada | `success`; `grant_status=revoked`, HTTP 403 e `Load PDF Artifact` não executado. |
| `173` | Header ou campo obrigatório ausente | `success`; HTTP 400 sem acesso ao PostgreSQL. |
| `174` | Token incorreto | `success`; HTTP 404 genérico. |
| `175` | Repetição da revogação válida | `success`; HTTP 200, mesma data de revogação. |
| `176` | Token correto com outro remetente | `success`; HTTP 404 genérico. |

As execuções foram manuais via MCP. Esse modo não aplica a barreira do Header Auth do webhook; o teste HTTP completo deve ser feito pela Test URL do n8n.

### Como reproduzir

1. Emita uma concessão pelo workflow `pdf-grant` e copie o `grant_id` e o `download_token` da resposta 201.
2. Execute `pdf-revoke-grant` pelo node `PDF Grant Revocation Webhook` com o header `X-Download-Grant` e o corpo `{ "sender_id": "...", "grant_id": "..." }`.
3. Confirme `grant_revoked=true`, HTTP 200 e `revoked_at` preenchido.
4. Tente baixar o mesmo PDF pelo `pdf-download`; a validação deve produzir `grant_status=revoked` e HTTP 403.
5. Repita com token incorreto, outro remetente e campos ausentes; confirme 404, 404 e 400 respectivamente.

### Próxima etapa sugerida

Criar uma rotina agendada de limpeza de concessões expiradas e revogadas, preservando registros recentes para auditoria local.

### Export oficial

O MCP não oferece export oficial reimportável. `workflows/pdf-revoke-grant.json` é o espelho sanitizado da versão testada; para obter o export oficial, baixe `pdf-revoke-grant` pela interface do n8n e associe novamente as credenciais Header Auth e PostgreSQL.

## Limpeza agendada de concessões — concluída em 2026-11-17

### Escopo

- Workflow n8n: `pdf-grant-cleanup`
- ID: `0M60I8vj3F4TAKiY`
- Versão testada: `3466f49c-ef39-4ebd-985c-e9a1c38bda68`
- Nós: 3, organizados no grupo visual `Cleanup Execution`
- Frequência configurada: uma vez por dia
- Estado de publicação: rascunho local, sem ativação ou publicação solicitada

### Alterações

- `Daily Grant Cleanup Schedule` dispara a rotina diariamente quando o workflow for ativado.
- `Prepare Cleanup Parameters` fixa a janela de retenção em sete dias.
- `Delete Old Grants` remove concessões com `expires_at` ou `revoked_at` anterior a sete dias.
- A consulta sempre retorna um resumo com `deleted_count`, `retention_days` e `cleaned_at`, inclusive quando nada é removido.
- Concessões válidas e revogações recentes permanecem disponíveis para auditoria e reintentos.
- O export sanitizado está em `workflows/pdf-grant-cleanup.json`, sem credenciais, tokens, `pinData` ou `webhookId`.

### Testes fictícios via MCP

| Execução | Cenário | Resultado observado |
|---|---|---|
| `188` | Execução normal com retenção de sete dias | `success`; `deleted_count=0`, sem registros antigos elegíveis. |
| `189` | Teste com `Prepare Cleanup Parameters` fixado em retenção zero | `success`; `deleted_count=6`, removendo apenas concessões expiradas ou revogadas geradas pelos testes locais. |
| `190` | Nova execução normal após a limpeza | `success`; `deleted_count=0`, comprovando comportamento idempotente. |

O valor zero usado na execução `189` existiu somente no pinData do teste MCP e não foi gravado no workflow exportado. Nenhum envio externo foi realizado.

### Como reproduzir

1. Abra `pdf-grant-cleanup` no n8n e execute manualmente; confira `retention_days=7` e o `deleted_count` no node `Delete Old Grants`.
2. Para um teste imediato com fixtures locais, use o recurso de teste do workflow e fixe a saída de `Prepare Cleanup Parameters` em `{ "retention_days": 0 }`.
3. Confirme que o node retorna `deleted_count` e `cleaned_at`; não use retenção zero em dados reais.
4. Ao ativar o workflow futuramente, confirme que o Schedule Trigger está habilitado e que a frequência diária atende à política de retenção.

### Próxima etapa sugerida

Executar uma revisão conjunta dos três endpoints de concessão (`pdf-grant`, `pdf-revoke-grant` e `pdf-download`) pela Test URL do n8n, conferindo Header Auth e contratos HTTP sem publicar os workflows.

## Preparação da coleção Postman — concluída em 2026-11-17

### Escopo

- Collection: `curriculo`
- Workspace: `Gabriel Severo's Workspace`
- Ambiente: `curriculo-local`
- Estado dos workflows: inativos e não publicados

### Alterações

- O ambiente contém a base local do n8n, remetente e artefato fictícios, além de variáveis secretas para o Header Auth e para a concessão emitida.
- A collection recebeu cinco requests padrão:
  - `01 - Emitir concessão`
  - `02 - Baixar PDF com concessão válida`
  - `03 - Revogar concessão`
  - `04 - Baixar PDF após revogação`
  - `05 - Baixar PDF sem concessão`
- O primeiro request salva automaticamente `grant_id` e `download_grant` no ambiente após uma resposta 201.
- Os requests usam as Test URLs e os headers `X-Download-Token` e `X-Download-Grant` por variáveis, sem fixar o segredo em arquivos do repositório.

### Validação HTTP

- Foi tentado um POST real para `http://localhost:5678/webhook-test/curriculo-grant-dev` com o valor local informado para o Header Auth.
- O n8n respondeu HTTP 404 porque o workflow está inativo e a Test URL não estava em modo de escuta.
- A conexão Postman disponível permite criar e ler collections, mas não expõe o runner `runCollection` nesta sessão; portanto a execução HTTP final depende de iniciar o listener no editor do n8n e enviar os requests pelo Postman.

### Como concluir o teste completo

1. Abra `pdf-grant` no n8n e clique em `Execute workflow`/`Listen for test event`.
2. No Postman, selecione o ambiente `curriculo-local` e execute `01 - Emitir concessão`.
3. Abra o listener de `pdf-download` e execute `02 - Baixar PDF com concessão válida`; confirme HTTP 200 e `application/pdf`.
4. Abra o listener de `pdf-revoke-grant` e execute `03 - Revogar concessão`; confirme HTTP 200.
5. Abra novamente o listener de `pdf-download` e execute `04 - Baixar PDF após revogação`; confirme HTTP 403.
6. Execute `05 - Baixar PDF sem concessão`; confirme HTTP 403.

O ambiente do Postman guarda o valor do Header Auth como variável secreta; ele não foi copiado para o repositório.

### Nova tentativa de validação — 2026-11-17

- O MCP do n8n executou novamente a emissão (`192`), o download válido (`193`), a revogação (`194`) e o download após revogação (`195`).
- Resultado observado: emissão HTTP 201 com token de 64 caracteres; download válido alcançou `Respond PDF Binary` com PDF de 13511 bytes; revogação retornou HTTP 200; download revogado retornou HTTP 403 sem executar `Load PDF Artifact`.
- Os headers `X-Download-Token` e `X-Download-Grant` foram incluídos nos payloads manuais do MCP, mas esse modo não aplica a validação de entrada do Header Auth.
- A tentativa HTTP da Test URL continuou retornando 404 porque os workflows não estavam em modo de escuta.
- O Postman CLI está instalado na versão `1.90.0` e a autenticação local foi confirmada com `postman whoami`. O runner cloud tentou carregar a collection/ambiente, mas recebeu `AggregateError`; a execução foi então feita com exports locais temporários (não versionados).
- Resultado do runner local: 1 iteração, 5 requests enviados, 7 asserções executadas e 7 falhas. Todas as respostas foram HTTP 404 com a mensagem do n8n de que o webhook não está registrado, pois os workflows permanecem inativos e nenhum listener de Test URL estava aberto.
- Conclusão: é possível executar os testes da API pelo Postman CLI; para obter aprovação do contrato HTTP, ainda é necessário abrir o listener de cada workflow no editor do n8n. Nenhum workflow foi publicado ou ativado nesta etapa.

### Teste autônomo após publicação — 2026-11-17

- Os workflows `pdf-grant`, `pdf-download` e `pdf-revoke-grant` foram encontrados publicados e respondendo nas URLs de produção (`/webhook/...`).
- O Postman CLI executou a collection local v3 em `postman/collections/curriculo/` com o ambiente `postman/environments/curriculo-local.environment.yaml` e o Header Auth recebido somente por `--env-var`.
- Resultado: 1 iteração, 5 requests, 7 asserções, 0 falhas, exit code 0.
- Contratos conferidos: emissão HTTP 201; download autorizado HTTP 200 com MIME `application/pdf`; revogação HTTP 200; download revogado e download sem concessão HTTP 403.
- A autenticação também foi exercitada isoladamente com token inválido: o n8n respondeu HTTP 403 (`Authorization data is wrong!`) e a asserção de rejeição passou. O CLI reportou exit code 1 porque o modo unitário trata respostas 4xx como erro de transporte, mesmo com a asserção aprovada.
- A collection remota `curriculo` também foi atualizada pelo MCP para usar `/webhook/`, mantendo a mesma sequência e as mesmas asserções.
- A collection, o ambiente sanitizado e as instruções do Postman init agora estão organizados em `postman/`; relatórios de execução permanecem em `tmp/`, ignorados pelo Git.

### Export oficial

O MCP não oferece export oficial reimportável. `workflows/pdf-grant-cleanup.json` é o espelho sanitizado da versão testada; para obter o export oficial, baixe `pdf-grant-cleanup` pela interface do n8n e associe novamente a credencial PostgreSQL.

## Orquestração interna da entrega do PDF — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- ID: `cys1lKVvdyjMlcVL`
- Versão em rascunho testada: `68de2264-f475-449d-90e5-6db94c9eff9b`
- Estado de publicação: rascunho atualizado; a versão ativa anterior não foi substituída

### Alterações

- `Issue Download Grant` chama `POST /webhook/curriculo-grant-dev` após a persistência do PDF.
- A chamada usa a credencial Header Auth existente e envia `sender_id`, `artifact_id` e `ttl_seconds=900`.
- `Prepare Delivery Response` remove o token bruto e devolve apenas metadados de entrega seguros.
- A resposta de sucesso contém `delivery_status=ready`, `grant_id`, expiração futura, `artifact_id` e o caminho do endpoint de download.
- A resposta de falha contém `delivery_status=failed` e não expõe detalhes do token.
- O espelho sanitizado da versão testada está em `workflows/service.json`.

### Testes fictícios via MCP

| Execução | Cenário | Resultado observado |
|---|---|---|
| `202`–`211` | Conversa fictícia de Ana Teste até aprovação do rascunho | Todas as execuções concluídas; etapas chegaram a `draft_approved`. |
| `212` | Primeira tentativa de gerar o PDF após a alteração | Falhou por referência pareada inválida no HTTP Request; o PDF já havia sido persistido. |
| `213` | Reexecução após corrigir a correlação do item | `success`; `delivery_status=ready`, HTTP interno 201, `grant_id` criado, expiração futura e resposta sem `download_token`. |
| `215` | Download usando o token somente dentro do teste | `success`; concessão `valid`, HTTP 200, MIME `application/pdf` e 12648 bytes. |

Nenhuma mensagem foi enviada a canal externo. O token de 64 caracteres foi usado apenas em memória para validar o download autorizado e não apareceu na resposta `Prepare Delivery Response`.

### Configuração futura

O endpoint interno está fixado em `http://localhost:5678` porque o laboratório atual executa o n8n localmente. Antes de publicar essa versão em outro ambiente, substitua a base por uma variável de configuração do n8n.

### Próxima etapa sugerida

Esta sugestão foi concluída na seção seguinte: a versão segura foi publicada e o adaptador de entrega em modo dry-run foi validado.
## Correção da resposta publicada e adaptador dry-run — concluída em 2026-11-17

### Escopo

- Workflow n8n: `local-service`
- Versão publicada testada: `47324424-0e4d-40be-aec9-76c08edd345e`
- Estado: publicada e ativa
- Próxima integração de canal: ainda não implementada

### Correções

- O caminho da conversa passou a ser sequencial: persistência, decisão de PDF, recuperação ou resposta.
- O ramo normal termina em `Prepare Conversation Response`, evitando que um ramo vazio do `If` produza HTTP 500.
- Os sinais `pdf_requested` e `pdf_retrieval_requested` são preservados no retorno de `Save Session`.
- O binário `pdf_html_file` permanece no ramo de conversão do Gotenberg.
- `Prepare Dry-Run Delivery` prepara um payload seguro com `sender_id`, `artifact_id`, `grant_id`, expiração, MIME e endpoint, sem enviar a nenhum canal.
- O payload marca `send_attempted=false` e não contém `download_token`.

### Testes executados

| Teste | Resultado |
|---|---|
| Conversa completa via Postman CLI, 12 mensagens fictícias | PASS; todas as respostas 2xx e etapa final `delivery_status=ready` |
| Verificação da resposta final | PASS; `delivery_mode=dry_run`, payload presente, sem token bruto |
| Collection `curriculo` via Postman CLI | PASS; 5 requests, 7 asserções, 0 falhas |
| Concessão, download, revogação e bloqueios | 201, 200 com `application/pdf`, 200, 403 e 403 |
| Teste pinado do workflow pelo MCP n8n | PASS; último node `Prepare Dry-Run Delivery` |

Os dados foram fictícios. Nenhum envio para WhatsApp, Telegram, e-mail ou outro canal externo foi realizado.

### Como reproduzir

1. Execute a conversa pelo endpoint publicado `POST /webhook/curriculo-dev` com um `sender_id` novo.
2. Use a sequência `oi`, nome, e-mail, objetivo, `primeiro emprego`, três `pular`, `confirmar`, `gerar curriculo`, `aprovar` e `gerar PDF`.
3. Verifique na última resposta `delivery_status=ready`, `delivery_mode=dry_run`, `delivery_payload.send_attempted=false` e ausência de `download_token`.
4. Execute a collection local com `--env-var download_auth_token=testedev` para repetir os testes de concessão e download.

### Próxima etapa

Definir o contrato do primeiro canal real e implementar somente após aprovação explícita; o adaptador atual continua em modo simulado.
3. Verifique na última resposta `delivery_status=ready`, `delivery_mode=dry_run`, `delivery_payload.send_attempted=false` e ausência de `download_token`.
4. Execute a collection local com `--env-var download_auth_token=testedev` para repetir os testes de concessão e download.

### Próxima etapa

Definir o contrato do primeiro canal real e implementar somente após aprovação explícita; o adaptador atual continua em modo simulado.

## Canal temporario Hosted Chat - implementado em 2026-11-17

- Criado o export sanitizado `workflows/chat-entrypoint.json`.
- O fluxo normaliza `chatInput` e `sessionId`, chama o `local-service` interno e formata a resposta em `output`.
- O workflow esta inativo por padrao. Antes de ativar, e necessario configurar HTTPS, a URL publica base do n8n e uma credencial Basic Auth exclusiva para os testadores.
- O fluxo nao possui nodes de WhatsApp, e-mail, Telegram ou qualquer outro envio externo.
- A validacao completa depende da instancia n8n em execucao e da credencial manual; o JSON foi validado estruturalmente localmente.

## Redação pela OpenAI — implementada em rascunho em 2026-11-17

### Alterações

- `local-service` passou a solicitar redação pela Responses API somente depois da confirmação explícita dos dados.
- Foram adicionados `Check AI Generation`, `Prepare OpenAI Request`, `Generate Resume with OpenAI` e `Finalize OpenAI Response`.
- O contrato usa Structured Outputs estrito para `objective_text` e atividades vinculadas aos IDs de experiência da revisão atual.
- Nome e contato permanecem locais; o request contém somente dados profissionais sanitizados e usa `store: false` e nenhum tool.
- Falhas preservam a sessão em `ready_for_drafting`, registram apenas a categoria operacional em `generation_attempt` e pedem uma nova tentativa.
- O grafo foi organizado em cinco grupos funcionais. Três nodes de roteamento permanecem no nível superior porque participam de ramificações com múltiplas saídas.

### Testes com dados fictícios

| Execução | Cenário | Resultado |
|---|---|---|
| `333` | Structured Output válido pelo mock OpenAI | `draft_ready`; prévia vinculada à revisão e montagem local dos dados pessoais. |
| `338` | Recusa do modelo | `ready_for_drafting`; categoria `refusal`; nenhuma prévia persistida. |
| `342` | Resposta incompleta por limite de saída | `ready_for_drafting`; categoria `incomplete`; nenhuma prévia persistida. |
| `343` | HTTP 429 | `ready_for_drafting`; categoria `rate_limit`; dados confirmados preservados. |
| `344` | HTTP 503 | `ready_for_drafting`; categoria `provider_unavailable`; dados confirmados preservados. |
| `345` | Timeout de 30 segundos | `ready_for_drafting`; categoria `api_error`; dados confirmados preservados. |
| `349`–`351` | Geração, aprovação e PDF | Sucesso até `delivery_status=ready`, Gotenberg e PostgreSQL locais, entrega `dry_run` e nenhum envio externo. |

O input observado na simulação não continha nome nem e-mail. A versão publicada do workflow não foi substituída. O smoke test na API real ainda depende da criação manual da credencial `Header Auth` da OpenAI no n8n; nenhuma chave foi gravada no repositório.

- Versão final do rascunho: `26d4b8ac-58af-4c2b-a2b6-a25223a096b4`.
- Regressão dos endpoints publicados pelo Postman CLI: 5 requests, 7 asserções, 0 falhas e exit code 0.
- `docker compose config`, lint da collection e lint do environment concluíram sem erros.

### Smoke test real — concluído

- Execução `371` usou uma conversa fictícia já confirmada e a credencial `Header Auth account 2`.
- A Responses API retornou HTTP 200, status `completed`, modelo `gpt-5.6-terra` e uma resposta estruturada válida.
- O workflow terminou em `draft_ready`, com `generated_resume.method=openai_responses_v1` e `source_revision=0`.
- O input enviado à OpenAI não continha o nome nem o e-mail da pessoa fictícia.
- As tentativas anteriores `369` e `370` documentaram, respectivamente, a correção do prefixo `Bearer` e a substituição da chave inválida; nenhuma chave foi registrada no repositório.
