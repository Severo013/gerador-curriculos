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

Implementar a revisão dos dados coletados, com resumo legível, correção por campo e confirmação antes da redação.

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
