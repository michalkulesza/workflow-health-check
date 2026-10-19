# Preview and launch

Browser smoke tests, the production-style Compose preview, and the checks to complete before inviting an initial audience.

## Preview verification

Browser smoke tests intentionally require an explicitly configured preview. They do not start an unconfigured development server or use a fixture questionnaire.

```powershell
$env:E2E_QUESTIONNAIRE_ID='<published-questionnaire-uuid>'
$env:E2E_BASE_URL='https://preview.example.com'
npm.cmd run test:e2e
```

For a local Compose preview using its self-signed TLS certificate, additionally set `$env:E2E_IGNORE_HTTPS_ERRORS='true'`. This opt-in is only for a disposable local preview; leave it unset when validating an external preview so certificate errors fail the run.

For a production-build local check, run `npm run build`, then set `E2E_LOCAL_PREVIEW=true` and `E2E_QUESTIONNAIRE_ID` before `npm run test:e2e`. Playwright uses its managed Chromium on Windows and Linux. Set `E2E_BROWSER_EXECUTABLE` only to opt into a local Edge/other browser. Missing browser target or questionnaire configuration fails instead of skipping the suite.

To exercise the data-writing journey only on a disposable preview, additionally set `RUN_PREVIEW_JOURNEY=true`. It saves and resumes a fictional questionnaire response, submits it to the running worker, uses `preview-notification@example.test` only when the report is pending, and creates a fictional contact lead. Do not set it for a shared or production preview.

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
