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

Executar a conversão real pelo Gotenberg e verificar visualmente o PDF gerado antes de decidir onde armazenar e como entregar o arquivo.

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
- Versão de rascunho testada: `a5838c94-91a3-4646-a62d-c3285dba923a`
- Versão publicada preservada: `8756df6d-2dca-4df3-ba5b-0b7ef00c61fe`
- Estado de publicação: o rascunho foi testado; nenhuma publicação nova foi solicitada ou realizada.

### Alterações

- O estado `draft_approved` aceita `pdf`, `gerar PDF`, `criar PDF` e variações sem acento.
- O Code node gera HTML determinístico escapado a partir de `draft.generated_resume.text`.
- O pedido salva `draft.pdf_status=requested` e um nome de arquivo seguro, como `renata-revisao.pdf`.
- O node `Check PDF Request` separa os pedidos de PDF do caminho de resposta normal.
- O node `Convert PDF with Gotenberg` envia multipart para `http://gotenberg:3000/forms/chromium/convert/html` e espera um arquivo binário em `data`.
- O JSON versionado em `workflows/service.json` contém sete nodes e não contém credenciais, dados fixados de execução ou metadados locais.

### Testes fictícios via MCP

| Execução | Caminho | Resultado observado |
|---|---|---|
| `116` | `aprovar` em um rascunho aprovado | Terminou com `success`; `Check PDF Request` seguiu pela saída falsa e nenhum conversor foi executado. |
| `117` | `gerar pdf` no estado `draft_approved` | Terminou com `success`; o estado virou `pdf_requested`, o HTML e o multipart foram gerados e o nome foi `renata-revisao.pdf`. |

O retorno do node HTTP em `117` foi fixado pelo pin data do MCP como `simulated_pdf_conversion=true`. Portanto, a conversão real pelo Gotenberg ainda não foi exercitada nesta etapa.

### Como reproduzir

1. Use uma sessão em `draft_approved` com `draft.generated_resume.status=approved`.
2. Execute o workflow pelo node `Webhook` com `{ "body": { "sender_id": "teste-pdf", "message_id": "pdf-01", "text": "gerar pdf" } }`.
3. Confira em `Process Conversation` o estado `pdf_requested`, `pdf_filename`, `pdf_html` e `pdf_multipart_body`.
4. Confira que `Check PDF Request` saiu pela porta verdadeira e que `Convert PDF with Gotenberg` recebeu o corpo multipart.
5. Para testar a conversão de verdade, remova o pin data desse node, mantenha o Gotenberg em execução e repita a execução manual.
