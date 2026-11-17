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
- Ao importar o JSON, a credencial PostgreSQL precisa ser selecionada novamente nos dois nodes de banco.
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
