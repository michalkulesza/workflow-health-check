# Workflow Check

A persistent, CMS-driven workflow assessment for creative professionals. Visitors answer a questionnaire, a background worker scores it and writes an AI report, and the respondent gets a private link to the result. Built with Next.js, Payload, PostgreSQL, Gemini and Resend.

## Contents

| Path                                                           | What it covers                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [app/](app/)                                                   | Next.js routes: the public `(frontend)` and the Payload admin `(payload)`  |
| [components/](components/)                                     | Landing, assessment, contact and report UI                                 |
| [lib/](lib/)                                                   | Shared assessment types, scoring and answer formatting                     |
| [server/](server/)                                             | Payload collections, AI evaluation, jobs, notifications, leads, migrations |
| [scripts/](scripts/)                                           | CLI tasks: worker, seed, admin bootstrap, backup, restore, retention       |
| [tests/](tests/)                                               | Integration and Playwright browser tests                                   |
| [docs/specs/DESIGN_SYSTEM.md](docs/specs/DESIGN_SYSTEM.md)     | Palette, typography, spacing and components for the public UI              |
| [docs/SCORING_REFERENCE.md](docs/SCORING_REFERENCE.md)         | How answers are scored                                                     |
| [docs/operations.md](docs/operations.md)                       | Running, backing up and restoring the service                              |
| [docs/preview-and-launch.md](docs/preview-and-launch.md)       | Browser smoke tests, Compose preview and launch checklist                  |

## Usage

Requires Node.js 22.20.0, npm 11.17.0 (see `.nvmrc` and `packageManager`) and Docker Compose.

1. Install dependencies and create your private `.env` (copy it only if it does not exist yet), then fill in its secrets:

   ```powershell
   npm.cmd ci
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

2. Start PostgreSQL, apply migrations and seed the published questionnaire:

   ```powershell
   docker compose --env-file .env -f compose.postgres.yaml up --detach --wait
   $env:NODE_ENV='development'
   npm.cmd run db:migrate
   npm.cmd run db:seed
   ```

3. Create the first admin, then remove the bootstrap credentials:

   ```powershell
   $env:BOOTSTRAP_ADMIN_EMAIL='root@root.com'
   $env:BOOTSTRAP_ADMIN_PASSWORD='rootrootrootroot'
   npm.cmd run admin:bootstrap
   ```

4. Run the app and, in a second terminal, the worker that processes submissions:

   ```powershell
   npm.cmd run dev
   npm.cmd run worker
   ```

The admin is at `/admin`. The seed publishes questionnaire `5dc13945-9cb8-4e6b-b504-187c885e0e34`. Re-running migrations and the seed is safe: it does not overwrite an existing admin, active submission or published questionnaire.

### Configuration notes

- `.env` is the single source of local settings for Next, the worker and CLI tools. Restart running processes after changing it. Explicit process and CI variables take precedence. Avoid `.env.local` and `.env.development.local`.
- Point `.env` only at a disposable database. Host-run tools use `127.0.0.1:55432`; containers use the Compose service hostname.
- Never set `PAYLOAD_SCHEMA_PUSH=true`. Setup is migrations-only.
- `GEMINI_MODEL=gemini-3.5-flash-lite` drives reflection analysis and report narratives. A nonblank value overrides the model saved in questionnaire snapshots. Failed reports are not retried automatically.
- `.env.preview.local` is for the container preview only; pass it explicitly with `docker compose --env-file .env.preview.local`.
- Questionnaire and report routes are noindex, but that is not access control. Private submissions and reports require a session or report grant.

## Checks

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
```

Integration tests require `RUN_INTEGRATION_TESTS=true` and a PostgreSQL URL whose database name is exactly `workflow_spike`. Browser tests and preview deployment are covered in [docs/preview-and-launch.md](docs/preview-and-launch.md).

## License

<!-- TODO: no LICENSE file yet. Add one and name it here. -->
