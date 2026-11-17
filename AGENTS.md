# Diretrizes do repositório

## Estrutura do projeto e organização dos módulos

Este repositório define a infraestrutura local de um fluxo de geração de currículos.

- `compose.yaml` declara o serviço de automação n8n, o banco PostgreSQL 17 e o serviço de conversão de documentos Gotenberg.
- `migrations/` contém alterações ordenadas do schema PostgreSQL. `001_sessions.sql` cria a tabela de estado das sessões do workflow.
- Os volumes Docker nomeados (`n8n_data` e `bot_db`) preservam os dados locais dos serviços e não são ativos versionados.

Adicione código da aplicação em um diretório de nível superior com nome claro, como `src/`, e coloque testes automatizados em `tests/` ou ao lado dos arquivos-fonte usando um sufixo consistente.

## Idioma do projeto

- Use inglês para código e artefatos técnicos: nomes de arquivos técnicos, diretórios, variáveis, funções, classes, nodes do n8n, campos, estados, tabelas, colunas, chaves de configuração e mensagens de commit.
- Use português do Brasil para conteúdo destinado à leitura humana: documentação, registros de decisões, instruções operacionais, comentários explicativos, mensagens do bot e textos de interface.
- Preserve nomes impostos por ferramentas ou padrões externos, como `AGENTS.md`, `README.md` e nomes oficiais de APIs.
- Ao alterar uma área que contenha identificadores técnicos antigos em português, normalize-os para inglês apenas quando a mudança puder ser migrada e testada na mesma etapa.

## Comandos de build, teste e desenvolvimento

Execute os comandos a partir da raiz do repositório:

- `docker compose config` valida e renderiza a configuração do Compose.
- `docker compose up -d` inicia n8n, PostgreSQL e Gotenberg em segundo plano.
- `docker compose logs -f [service]` acompanha todos os logs ou os de um serviço específico.
- `docker compose down` interrompe a stack preservando os volumes nomeados.
- `Get-Content migrations/001_sessions.sql | docker compose exec -T postgres psql -U bot -d curriculo` aplica a migração atual pelo PowerShell.

Não use `docker compose down -v`, a menos que a intenção seja excluir todos os dados locais do n8n e do banco.

## Estilo de código e convenções de nomenclatura

Use indentação de dois espaços em YAML e nomes em minúsculas para serviços, volumes, tabelas e colunas. Nomeie identificadores SQL em `snake_case`. Mantenha migrações idempotentes quando for prático e use uma sequência com zeros à esquerda e uma descrição curta em inglês, por exemplo `002_add_session_status.sql`. Escreva palavras-chave SQL em maiúsculas e encerre instruções com ponto e vírgula.

## Diretrizes de testes

Ainda não há framework de testes automatizados nem meta de cobertura configurados. Antes de entregar alterações, execute `docker compose config`, inicie a stack, inspecione `docker compose ps` e verifique os serviços afetados pelos logs. Teste migrações em um banco descartável antes de aplicá-las aos dados persistentes.

Sempre que alterar um workflow pelo MCP, teste a alteração com dados fictícios e atualize o JSON correspondente em `workflows/`. Use o export da versão testada. Se o MCP não oferecer export reimportável, identifique o workflow que precisa ser baixado pela interface. Antes do commit, revise o diff e remova dados fixados, segredos e referências locais de credenciais.

## Diretrizes de commits e pull requests

Use assuntos de commit curtos, imperativos e em inglês, opcionalmente com prefixos de Conventional Commits, como `feat: add session status migration` ou `fix: pin Gotenberg image`. Pull requests devem explicar o objetivo em português, listar os comandos de validação, destacar mudanças de schema ou configuração e incluir capturas de tela somente quando um workflow n8n ou documento gerado mudar.

## Segurança e configuração

O arquivo Compose contém atualmente credenciais de banco exclusivas para desenvolvimento. Nunca faça commit de segredos de produção. Prefira variáveis de ambiente e um arquivo `.env` ignorado pelo Git para configurações implantáveis. Exponha serviços externamente somente quando necessário.

<API_TASKS>
Before responding to any non-trivial API engineering task — designing, implementing, mocking, testing, monitoring, documenting, or deploying an API or Postman Flow — read `postman/skills/api-engineer/SKILL.md` and follow it. It is the default entry point for API work in this repository. Pure questions and trivial one-line edits do not need it.
</API_TASKS>
