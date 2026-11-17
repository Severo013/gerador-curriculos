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

Implementar e validar a coleta de contato e objetivo, incluindo entradas inválidas e a opção `pular` para objetivo.
