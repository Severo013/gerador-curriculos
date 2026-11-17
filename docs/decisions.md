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
