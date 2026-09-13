# Workflow Check

Workflow Check is a persistent, CMS-driven assessment for creative professionals. It uses Next.js, Payload, PostgreSQL, Gemini, and Resend. The browser uses the production HTTP assessment API; it has no prototype scenarios, client-side scoring controls, or fixture report routes.

## Local setup

Requires Node.js 22.20.0 and npm 11.17.0 (see `.nvmrc` and `packageManager`), plus Docker Compose. Copy `.env.example` to a private `.env.development.local`; it is ignored and must never target a non-disposable database.

```powershell
npm.cmd ci
Copy-Item .env.example .env.development.local
docker compose --env-file .env.development.local -f compose.postgres.yaml up --detach --wait
$env:NODE_ENV='development'
npm.cmd run db:migrate
npm.cmd run db:seed
$env:BOOTSTRAP_ADMIN_EMAIL='admin@example.test'
$env:BOOTSTRAP_ADMIN_PASSWORD='use-a-unique-password-of-at-least-16-characters'
npm.cmd run admin:bootstrap
npm.cmd run dev
```

Start `npm.cmd run worker` in a second terminal to process submissions. Admin is available at `/admin`. The seed publishes questionnaire `5dc13945-9cb8-4e6b-b504-187c885e0e34`; re-running migration and seed is safe and does not overwrite an existing admin, active submission, or published questionnaire. Remove bootstrap credentials after the first admin is created.

Next loads `.env.development.local` for development; CLI tools also load it through Payload's runtime loader. CI and explicit process variables take precedence for integration tests. Host-run tools use `127.0.0.1:55432`; containers use the Compose service hostname in `DATABASE_URL`. Do not set `PAYLOAD_SCHEMA_PUSH=true`: normal setup is migrations-only.

The questionnaire and report routes are noindex, but that is not an authorization control. Private submissions and reports require their corresponding session or report grant.

## Checks

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
```

Integration tests require both `RUN_INTEGRATION_TESTS=true` and a PostgreSQL URL whose database name is exactly `workflow_spike`. A local environment file is optional and cannot replace explicitly supplied process variables.

## Preview verification

Browser smoke tests intentionally require an explicitly configured preview. They do not start an unconfigured development server or use a fixture questionnaire.

```powershell
$env:E2E_QUESTIONNAIRE_ID='<published-questionnaire-uuid>'
$env:E2E_BASE_URL='https://preview.example.com'
npm.cmd run test:e2e
```

For a production-build local check, run `npm run build`, then set `E2E_LOCAL_PREVIEW=true` and `E2E_QUESTIONNAIRE_ID` before `npm run test:e2e`. Playwright uses its managed Chromium on Windows and Linux. Set `E2E_BROWSER_EXECUTABLE` only to opt into a local Edge/other browser. Missing browser target or questionnaire configuration fails instead of skipping the suite.

## Production-style Compose preview

Create a private deployment environment file with the required application values, then build once and run the migration job before releasing web and worker. `IMAGE_TAG` identifies the same image used by all three roles.

```sh
IMAGE_TAG=preview-$(git rev-parse --short HEAD) docker compose build migrate
IMAGE_TAG=preview-$(git rev-parse --short HEAD) docker compose --profile maintenance run --rm migrate
IMAGE_TAG=preview-$(git rev-parse --short HEAD) docker compose up --detach web worker proxy
```

The migration job must finish successfully before startup; schema push is disabled in production. Use `docker compose restart web worker` for a restart check and do not use `down --volumes` for routine work. The proxy is the only public service; protect an external preview with network restrictions or proxy authentication and make it non-indexable. No external preview target or credentials are configured in this repository.

Before opening an initial audience, record the result of the browser check and manually confirm:

- landing is indexable; questionnaire and report pages are noindex;
- an unauthenticated submission request returns `401` with `Cache-Control: no-store`;
- an arbitrary report token cannot show fixture data;
- mobile layout, keyboard flow, and automated accessibility checks pass;
- save/resume, submit, clarification or AI fallback, notification, contact CTA, and worker restart recovery are exercised against the preview;
- migrations, backup restoration, verified sender/domain, production secrets, and an on-call owner are in place.

## Initial launch boundary

The remaining launch risks are live Gemini behaviour and cost, Resend delivery/reconciliation, real worker restart recovery, and operational recovery from a database restore. Use a small invited cohort first: invite a known group of creative professionals directly, monitor completion/error/cost and lead conversion daily, then decide whether to widen distribution. The public landing may be indexed, but organic discovery is not a launch-distribution plan by itself.
