# Repository Guidelines

## Project Structure & Module Organization

This repository defines the local infrastructure for a résumé-generation workflow.

- `compose.yaml` declares the n8n automation service, PostgreSQL 17 database, and Gotenberg document-conversion service.
- `migrations/` contains ordered PostgreSQL schema changes. `001_sessions.sql` creates the workflow session state table.
- Docker named volumes (`n8n_data` and `bot_db`) preserve local service data and are not source-controlled assets.

Add application code in a clearly named top-level directory such as `src/`, and place automated tests in `tests/` or beside source files using a consistent suffix.

## Build, Test, and Development Commands

Run commands from the repository root:

- `docker compose config` validates and renders the Compose configuration.
- `docker compose up -d` starts n8n, PostgreSQL, and Gotenberg in the background.
- `docker compose logs -f [service]` follows all logs or those for one service.
- `docker compose down` stops the stack while preserving named volumes.
- `Get-Content migrations/001_sessions.sql | docker compose exec -T postgres psql -U bot -d curriculo` applies the current migration from PowerShell.

Do not use `docker compose down -v` unless intentionally deleting all local n8n and database data.

## Coding Style & Naming Conventions

Use two-space indentation in YAML and lowercase service, volume, table, and column names. Name SQL identifiers in `snake_case`. Keep migrations idempotent where practical and name them with a zero-padded sequence and short description, for example `002_add_session_status.sql`. Write SQL keywords in uppercase and terminate statements with semicolons.

## Testing Guidelines

No automated test framework or coverage target is configured yet. Before submitting changes, run `docker compose config`, start the stack, inspect `docker compose ps`, and verify affected services through their logs. Test migrations against a disposable database before applying them to persistent data.

## Commit & Pull Request Guidelines

No Git history is available in this checkout. Use short, imperative commit subjects, optionally with Conventional Commit prefixes, such as `feat: add session status migration` or `fix: pin Gotenberg image`. Pull requests should explain the purpose, list validation commands, call out schema or configuration changes, and include screenshots only when an n8n workflow or generated document output changes.

## Security & Configuration

The Compose file currently contains development-only database credentials. Never commit production secrets. Prefer environment variables and a gitignored `.env` file for deployable configurations, and bind externally exposed services only when required.
