# Step 5: Reproducible foundations and preview — implementation handoff

Prepared: 2026-09-13. Status: partially implemented and locally statically verified on 2026-09-14; Docker-backed integration/preview evidence remains pending because Docker is unavailable in this implementation environment.

## 1. Which step this is

This is **Step 5 of the overall app workflow: Set up foundations**, not backend task 5 (anonymous sessions/save/resume), which already has a completed spec. The owner has finished the Step 4 implementation cycle with another model and is requesting the next plan.

The repository now contains substantial backend code, Docker configuration, CI, migrations, and tests. Do not recreate these from scratch. Verify the existing foundation, fix reproducibility gaps, and produce a working isolated preview with evidence.

Expected outcome: another developer can start from a clean checkout, configure safe local variables, start a disposable database, migrate/seed, run the web and worker, execute meaningful checks, and reproduce the same application in a production-style preview container stack.

## 2. Instructions to the implementing model

- Read `general.md`, `AGENTS.md`, and `typescript-react-guidelines.md` before changes. Follow installed Next.js guides for relevant APIs. Read exact-version dependency documentation when investigating tooling behavior.
- Inspect current branch/status and preserve the owner's concurrent marketing and questionnaire UI changes. Snapshot the baseline in your task notes; work on a suitable branch/worktree. Do not reset, clean, or stage unrelated work.
- Implement this bounded foundation plan, not another architecture rewrite or the full launch. Finish useful independent work before requesting missing deployment details.
- Use the existing npm lockfile and version conventions. Do not force peer-dependency resolution or blindly upgrade packages.
- Keep this document's checklist and verification record current. Move it to `docs/specs/done/` only after acceptance passes. If external preview access is unavailable, state that clearly and leave preview acceptance pending.
- Follow the repository's bounded implement/check/fix workflow. Recheck Ralph availability; do not claim an unavailable tool ran. Reassess after three repeated fix/check failures instead of looping blindly.

## 3. Existing state to preserve and verify

Observed at planning time (file inspection, not a fresh runtime verification):

| Area | Present |
| --- | --- |
| App | Next.js/React, Payload 3.89.0, PostgreSQL, production HTTP adapter, Gemini adapter, notification/lead code |
| Backend plan | `docs/specs/STEP_4_BACKEND_DESIGN.md` records tasks 1–8 verified and tasks 9–14 with differing levels of verification; runtime/preview gaps remain |
| Database | Generated migrations, seed, bootstrap, publication verification command, local Compose database |
| Runtime | `Dockerfile`, `compose.yaml`, `compose.dev.yaml`, `Caddyfile`, web/worker/maintenance services |
| Checks | Format/lint/typecheck/unit, PostgreSQL integration suite, and opt-in Playwright preview smoke tests |
| Operations | Liveness/readiness, worker heartbeat, backup/restore scripts, guarded retention command, `docs/operations.md` |
| Git | Branch was `backend/payload-worker-spike`; recheck before work |

Read supporting records rather than assuming “implemented” means runtime-verified:

- [Backend design](STEP_4_BACKEND_DESIGN.md)
- [V1 scope](V1_SCOPE.md)
- [Completed task records](done/)
- [Operations runbook](../operations.md)
- [Older spike setup](../backend-spike-setup.md) — historical instructions need reconciliation with the current migration/worker behavior

## 4. Concrete gaps found during planning

These are targets for investigation, not a claim that every runtime failure has been reproduced.

1. **Integration test environment:** `tests/setupIntegration.ts` unconditionally reads ignored `.env.development.local` and overwrites process variables. A clean CI checkout does not have that file. A substring check for `workflow_spike` is also too weak to establish that a database is disposable.
2. **Browser portability:** `playwright.config.ts` hard-codes a Windows Edge executable and a Windows `npm.cmd` startup command. CI runs Ubuntu. Make defaults portable while permitting an explicit local browser override.
3. **Skipped browser tests:** `tests/journeys.spec.ts` skips the suite when preview variables are missing. Required CI/preview verification must fail clearly when misconfigured, not appear green with zero executed scenarios.
4. **CI coverage:** `.github/workflows/ci.yml` runs static checks, migrations, integration tests, and build, but does not run browser smoke tests or build/run the container. It listens to pushes on `main`; verify the actual default branch rather than assuming that matches the repository.
5. **Migration ordering:** Compose starts web/worker after database health, while migrations are a separate maintenance service. Ensure the documented release command runs the migration successfully before starting the application. DB readiness alone does not mean the application schema exists.
6. **Image parity:** web, worker, and migrate each use `build: .`. Establish a single identifiable image/release used by all three and verify the TS worker runner/config/migrations are available inside it. Existing runtime includes dev dependencies; optimize only after correctness is proven.
7. **Build/runtime configuration:** the Docker build uses placeholder database/secret values. Verify runtime configuration is read at runtime where required, build-only secrets are not used for authentication, and public pages are not accidentally frozen with incorrect fixture/environment data.
8. **Environment/runbook drift:** old spike docs still describe schema push and a compatibility-only worker. The current app has migrations and additional work queues. Provide one accurate fresh-start path and mark historical spike instructions as historical.
9. **Runtime evidence:** Step 4 notes still leave Compose, preview, worker restart, provider checks, and restore verification open. Preserve the distinction between tests present, commands executed, and actual passing results.

## 5. Foundation requirements

### A. Reproducible local setup

- Define a supported Node/npm version pair and document it consistently across development, CI, and containers. Verify the pinned npm version works with the chosen Node image; avoid silent toolchain drift.
- Provide a single fresh-checkout sequence: install locked dependencies → create local environment → start isolated PostgreSQL → migrate with schema push off → idempotent seed → explicit first-admin bootstrap → web and worker.
- Keep UI settings intact when creating local environment files. Generate server secrets locally and do not print or commit them. Commit only placeholders and documentation of meaning/requiredness.
- Explain environment precedence for Next dev, build/start, CLI, tests, and Compose. Container DATABASE_URL uses the service hostname, whereas a host-run CLI may use the loopback-bound mapped port.
- Ensure `compose` interpolation for starting only PostgreSQL does not require unexplained unrelated production/provider settings; use a clear local override or local-only configuration where needed.
- A second migration/seed invocation must be safe. Never overwrite published definitions, active submissions, or an existing admin to make a demo work.
- Record a published seed questionnaire UUID usable by smoke tests. Fixture content is fine in an isolated test database; no public prototype-mode query parameters or fixture report bypasses.

### B. Test isolation and CI

- Integration tests use an explicit test-only database URL/name plus an opt-in gate. Parse the connection target and check an exact approved disposable database identity; never rely only on a URL substring.
- Process/CI variables take precedence. Local environment-file loading is optional and must not overwrite an explicitly supplied test database target.
- Before destructive setup/reset, validate the target, require the test-only gate, and refuse normal production/development databases. Do not print the URL or password on failure.
- Create/migrate/seed disposable test data deterministically; test suites must not depend on an earlier developer session or run concurrently against mutable shared fixtures without isolation.
- CI installs locked dependencies, checks formatting/lint/types, runs unit tests and PostgreSQL integration tests, builds, starts a configured test preview, and runs browser smoke checks. Capture exit codes; no false success from skipped suites or swallowed failures.
- Use Playwright-managed Chromium by default on Linux and Windows, with documented optional local Edge override. Include browser installation in CI and retain traces/screenshots on failure with a bounded artifact lifetime.
- Unit/integration/CI browser runs use provider mocks or adapters controlled only by test harnesses; never actual Gemini/Resend calls or paid keys. Do not expose provider-test switches in public HTTP requests.
- Confirm CI executes on the intended pull requests/default branch. If a remote run cannot be triggered or inspected, label workflow execution unverified rather than inventing a run URL.

### C. Production-style image and Compose

- Build one image, identify it by revision/tag, and use it for web, worker, and migration jobs. Record the built image identifier in verification evidence.
- Keep `.env` files and sensitive local artifacts outside the build context. Use runtime secrets; inspect configuration/log handling without dumping resolved secrets.
- Run the image as a non-root application user if practical, with explicit writable locations for framework caches and worker health artifacts. Verify permissions instead of merely adding USER to Dockerfile.
- Include everything required by migrations and the worker: runner, TS/config imports, generated Payload files, and migration sources. Do not remove dev dependencies until the runtime has a tested alternative.
- Bind local PostgreSQL only to loopback when exposed to host tools. Production database and worker remain private. Proxy is the public entrypoint; use a local HTTP preview or TLS endpoint appropriate to the environment.
- Run migrations once before the new web/worker release starts; migration failure prevents advancing to startup. Do not enable schema push in preview/production.
- Verify liveness, readiness, and worker heartbeat in the real container. Document what readiness means during worker startup/restart and avoid dependency cycles that prevent the stack recovering.
- Stop/restart containers without removing volumes; confirm saved sample data survives. Do not use `down --volumes` against a valuable database as a routine reset command.

### D. Preview deployment and access

- First prove a local production-style Compose preview. Then deploy to an isolated external preview only if a target and access are available and authorized in the implementation session.
- External details needed: host/access, preview hostname or reachable private URL, port/reverse-proxy arrangement, secret-injection mechanism, and owner of the preview. Do not request credentials in chat when a private environment file/secret store can be used.
- Use a separate preview database, credentials, and published sample content. Never point verification commands at production customer data.
- Protect unfinished externally reachable preview access (for example network restriction or proxy authentication) and mark the preview non-indexable. The production landing remains intended to be indexable; environment-wide preview protection is distinct from the production questionnaire's noindex requirement.
- Establish stable APP_ORIGIN and verify session cookies and CSRF across the actual preview origin. Do not solve an origin mismatch with unrestricted CORS.
- Before inviting reviewers, verify landing and form load, admin login works, anonymous private endpoints fail closed, unknown report tokens reveal no content, and private responses are not shared-cached.
- If providers are unavailable, record the preview as foundation-ready with provider-dependent journeys pending. Do not claim a completed AI assessment or email delivery from a smoke test.

### E. Documentation and operational baseline

- Update README and operations instructions with tested commands, expected outcomes, reset precautions, and known limitations. Replace stale spike-first instructions with migrations-first guidance for normal development.
- Name where logs/health/worker diagnostics are available and redact answers, emails, tokens, and connection strings.
- Document a basic backup and isolated restore path. If rehearsed during this step, use test data and an explicitly different destination database; verify restored records. Full off-host encrypted backup automation and recovery objectives remain launch-readiness work unless actually verified here.
- Do not execute retention purges or enable deletion policy simply to complete foundations. Their approval remains separate from providing the guarded command.
- No claim that a backup is encrypted merely because the runbook tells an operator to encrypt it; distinguish implemented commands from operator steps.

## 6. Ordered tasks for this implementation session

Complete one bounded task at a time and record checks before advancing.

| ID | Task | Acceptance |
| --- | --- | --- |
| F1 | Inspect current code and reconcile completed records | Baseline branch/files, current runtime versions, remaining gaps, and preservation boundaries recorded |
| F2 | Repair test environment loading and isolation | Clean CI-style process works without ignored local files; explicit env wins; non-test DB rejected before mutation |
| F3 | Standardize local setup and safe sample initialization | Fresh disposable DB migrates/seeds; repeat is safe; admin bootstrap works; no schema push |
| F4 | Make browser runner portable and explicit | Windows/Linux configuration works; required run fails if missing target; installed browser runs actual tests |
| F5 | Complete CI gates | Unit/integration/build and configured browser smoke run with no real provider keys; actual test counts recorded |
| F6 | Verify image/worker/migration parity and startup order | Same image starts all roles; fresh migration precedes startup; failed migration halts rollout |
| F7 | Run production-style local preview | Web/admin/API respond correctly; worker heartbeat; container restart retains seeded/saved data; capture image and endpoint evidence |
| F8 | Establish external preview if target available | Isolated protected endpoint reachable and smoke-tested; otherwise explicitly pending without blocking independent local work |
| F9 | Finish runbook and verification record | Another model can reproduce setup; distinguish passing, failed, skipped, and unrun checks; list next Step 6 task |

## 7. Required automated checks and runtime scenarios

Existing commands to retain or refine:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:migrate
npm run test:integration
npm run build
npm run test:e2e
```

`npm.cmd` is appropriate for PowerShell where required; scripts and CI must not hard-code Windows commands for Linux. Set NODE_ENV and test environment intentionally. Do not mutate real data to run these commands.

Minimum evidence:

- [ ] Clean dependency install using committed lockfile and documented runtime.
- [ ] Fresh isolated migration and repeat migration/seed checks.
- [ ] Test environment rejects a non-test database and preserves explicit process variables.
- [ ] Unit tests: actual count and result.
- [ ] Integration tests: actual count/result and sanitized target identity; no secrets.
- [ ] Production build succeeds without a developer's ignored environment files.
- [ ] Browser suite runs at least one actual configured scenario; include mobile, basic keyboard/accessibility, published form, and private-access failure checks.
- [ ] New image serves public and admin layouts correctly; unavailable DB/worker produces documented readiness behavior.
- [ ] Worker executes persisted work across separate processes/container restart using disposable data.
- [ ] Session save/reload/resume uses the real API and survives web restart; if this reveals an existing application bug, fix the narrow blocker or track it as a Step 6 prerequisite.
- [ ] No provider calls, external email delivery, public test switches, or fixture-report bypasses in required CI.
- [ ] CI/preview run identifiers or local logs with real exit codes; skipped or unavailable runs are explicitly pending.

Do not add tests that merely assert files exist. Test the failure modes of environment loading, migration ordering, private access, and worker/runtime resolution. Existing scoring/publication tests remain valuable regression checks.

## 8. Out of scope

- New scoring strategies, revised questionnaire content, custom CMS builder, visual redesign, or changes to the paid offer.
- Reimplementing already completed Step 4 backend tasks without an observed defect or missing acceptance requirement.
- Completing every customer journey or calibrating live AI quality; the comprehensive real user journey is overall Step 6, with feature expansion afterward.
- Real Gemini/Resend traffic as part of ordinary CI; provider smoke tests require explicit configured test context and controlled recipients later.
- Production launch, inviting customers, domain purchase, unsolicited messages, enabling retention deletion, or destructive operations on existing databases.

## 9. Definition of done and next step

Step 5 is verified when local setup is reproducible, checks execute meaningfully in a clean environment, the built application/worker/migrations run together in an isolated preview, and documentation contains the evidence and exact setup path. If the requested external preview lacks a target/access, mark **local foundations complete; external preview pending**, not the entire milestone complete.

Final response from the implementing model must include:

1. What was repaired or verified, and which existing code was reused.
2. Test counts/results, build/image result, runtime checks, and any CI/preview URLs actually produced.
3. Remaining blockers and required user inputs, if any.
4. Exact run instructions and the updated status document.
5. Next proposed bounded task for **Step 6: verify one real questionnaire → saved answers → scored report → contact lead journey**, reusing the existing backend while the owner continues UI refinement.

## 10. Execution record — to fill during implementation

| Item | Result / evidence |
| --- | --- |
| Branch / commit / preserved work | `backend/payload-worker-spike` at `56e0810`; existing marketing/questionnaire UI changes were preserved. This spec remains untracked until the foundations work is accepted. |
| Runtime / npm / image ID | Workstation: Node `v26.5.0`, npm `11.17.0`. Supported reproducible pair is Node `22.20.0`/npm `11.17.0`, pinned in `.nvmrc`, CI, and Dockerfile. Docker is unavailable locally, so no image ID was produced. |
| Local fresh-start verification | Production build passed with explicit disposable runtime values (`npm run build`; Next 16.3.4). Docker is unavailable, so the disposable PostgreSQL/migration/seed/bootstrap sequence could not be executed here. Added the independent `compose.postgres.yaml` path and migrations-first instructions. Seed now publishes UUID `5dc13945-9cb8-4e6b-b504-187c885e0e34` idempotently. |
| Unit and integration counts | `npm run format:check`, `npm run lint`, and `npm run typecheck` passed. `npm test`: 14 files / 36 tests passed. Integration tests were not run because the disposable PostgreSQL service could not be started. The new guard requires `RUN_INTEGRATION_TESTS=true` and an exact `workflow_spike` database name; process values win over an optional local file. |
| Browser scenarios actually executed | Pending: browser smoke now fails configuration errors rather than skipping, uses Playwright Chromium by default, and has an optional `E2E_BROWSER_EXECUTABLE` override. It needs the seeded disposable database/preview. |
| CI run | Workflow updated to run migration, integration tests, seed, production build, Playwright Chromium/browser checks, and upload failure artifacts for 7 days. No remote run was triggered or inspected. Push branch configuration remains `main`; repository default branch was not resolvable locally. |
| Compose migration/web/worker proof | Pending: all roles now reference one `workflow-health-check:$IMAGE_TAG` image; `migrate` is the only build service and documentation requires its successful one-shot run before web/worker startup. Docker unavailable. |
| Preview URL and access arrangement | Pending: no authorized external target, hostname, access route, secret-injection mechanism, or preview owner was supplied. |
| Restart / persistence evidence | Pending: requires the disposable local Compose stack. |
| Remaining issues / next task | The tracked generated/admin formatting drift was normalized; `npm run format:check` now passes. Next bounded Step 6 task: verify the real questionnaire → save/reload/resume → submit → worker-scored report → contact-lead journey in the local preview, then fix only observed blockers. |
