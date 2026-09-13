# Workflow Check

Workflow Check is a persistent, CMS-driven assessment for creative professionals. It uses Next.js, Payload, PostgreSQL, Gemini, and Resend. The browser uses the production HTTP assessment API; it has no prototype scenarios, client-side scoring controls, or fixture report routes.

## Local setup

Requires Node.js 22 and Docker Compose. Copy `.env.example` to a private local environment file and replace every placeholder before using a non-disposable database.

```powershell
npm.cmd ci
docker compose --env-file .env.development.local -f compose.yaml -f compose.dev.yaml up --detach --wait postgres
$env:NODE_ENV='development'
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Start `npm.cmd run worker` in a second terminal to process submissions. Admin is available at `/admin`; use `npm.cmd run admin:bootstrap` only for the first controlled local administrator.

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

## Preview verification

Browser smoke tests intentionally require an explicitly configured preview. They do not start an unconfigured development server or use a fixture questionnaire.

```powershell
$env:E2E_BASE_URL='https://preview.example.com'
$env:E2E_QUESTIONNAIRE_ID='<published-questionnaire-uuid>'
npm.cmd run test:e2e
```

For a configured local stack, set `E2E_LOCAL_PREVIEW=true` as well. Before opening an initial audience, record the result of the browser check and manually confirm:

- landing is indexable; questionnaire and report pages are noindex;
- an unauthenticated submission request returns `401` with `Cache-Control: no-store`;
- an arbitrary report token cannot show fixture data;
- mobile layout, keyboard flow, and automated accessibility checks pass;
- save/resume, submit, clarification or AI fallback, notification, contact CTA, and worker restart recovery are exercised against the preview;
- migrations, backup restoration, verified sender/domain, production secrets, and an on-call owner are in place.

## Initial launch boundary

The remaining launch risks are live Gemini behaviour and cost, Resend delivery/reconciliation, real worker restart recovery, and operational recovery from a database restore. Use a small invited cohort first: invite a known group of creative professionals directly, monitor completion/error/cost and lead conversion daily, then decide whether to widen distribution. The public landing may be indexed, but organic discovery is not a launch-distribution plan by itself.
