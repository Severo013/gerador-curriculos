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
