# Backend implementation handoff

Prepared 2026-09-11. Read this first, then the linked design and task documents. This is a handoff of partially implemented work, not a claim that the backend is complete.

## User intent and working arrangement

The owner is refining the marketing/landing page and form flow separately. This session was intended to produce a backend TODO/design plan, but began implementing the first compatibility task after interpreting “let's do it” as implementation authorization. The owner clarified the intent and requested this handoff to the implementing model. Implementation in the planning session is now paused; keep the useful existing changes and continue in the implementation session.

Do not restart the project or overwrite the owner's UI work. Do not undo the partial backend automatically. First inspect the actual working tree; the state below may have advanced since this document was written.

## Read order

1. Repository `general.md`, `AGENTS.md`, and `typescript-react-guidelines.md`. Read relevant guides in installed `node_modules/next/dist/docs/` before code changes.
2. [Backend design and 14 implementation tasks](STEP_4_BACKEND_DESIGN.md): architecture, data model, APIs, processing, deployment, acceptance tests, and proposed defaults.
3. [Completed compatibility spike](done/payload-worker-spike.md): task 1 verification record.
4. [Spike setup](../backend-spike-setup.md): environment, bootstrap, worker commands.
5. [V1 scope](V1_SCOPE.md), [scoring reference](../SCORING_REFERENCE.md), [AI rubric](AI_RUBRIC_INITIAL.md), and [prototype brief](STEP_3_PROTOTYPE_HANDOFF.md).

Product agreements are recorded in those documents. Defaults explicitly marked proposed are not silently approved by this handoff, especially retention/deletion, coverage threshold, and delayed clarification handling.

## Git and preservation boundary

Branch: `backend/payload-worker-spike`. No implementation changes were committed, merged, or deployed. **Checking out this branch in another clone will not retrieve uncommitted or untracked work.** Continue in this working directory, or deliberately transfer the reviewed working tree with all relevant untracked files and planning documents. Never include `.env` secrets in a transfer.

The tree already contained these changes before backend implementation began:

- Modified: `README.md`, `app/globals.css`, `components/Assessment.tsx`, `components/ResultsView.tsx`, `docs/specs/STEP_3_PROTOTYPE_HANDOFF.md`, `playwright.config.ts`, `tests/journeys.spec.ts`.
- Untracked: `.env.example`, `components/ContactStep.tsx`, `components/ScoringDebugPanel.tsx`, `lib/scoringDebug.ts`, `lib/scoringDebug.test.ts`, `next.config.mjs`, `docs/specs/STEP_4_BACKEND_DESIGN.md`.

README, `.env.example`, and `next.config.mjs` now contain both earlier work and backend additions. Do not use blanket restore/reset/clean or stage the entire tree as if every change belongs to the backend task.

## What was implemented

### Dependencies and scripts

Installed without force/legacy-peer-deps bypasses:

- `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`: 3.89.0.
- `graphql`: 16.11.0; `@next/env`: 16.3.4; dev runner `tsx`: 4.20.6.
- Existing Next.js/React dependency families were retained. `package-lock.json` changed; use npm and the lockfile.

Added package scripts: `payload:types`, `payload:importmap`, `admin:bootstrap`, `worker`, `worker:once`, `job:fixture`.

### Routes

- Moved existing public `app/layout.tsx`, `app/page.tsx`, `app/q/`, and `app/report/` into `app/(frontend)/`. Public URLs are unchanged. The public layout now imports `../globals.css`; the stylesheet itself was not moved.
- Added Payload root layout, `/admin/[[...segments]]`, import map, and REST `/api/[...slug]` under `app/(payload)/`.
- Wrapped `next.config.mjs` with `withPayload`, preserving the earlier LAN development origins.

The group move keeps marketing styles/header/footer separate from Payload's document layout. Coordinate any further moves with the UI model, which may still refer to the original paths.

### Minimal backend files

- `payload.config.ts`: PostgreSQL adapter, one admin collection, fixture job, GraphQL disabled, HTTP job run/queue/cancel denied. Requires server environment. Schema push is explicitly opt-in for non-production disposable DBs.
- `server/collections/Admins.ts`: anonymous writes denied; creation requires a server-side bootstrap context. This hook is needed because Payload's first-user operation bypasses normal collection create access.
- `server/jobs/fixtureTask.ts`: returns a supplied marker and worker process ID; retains completed job records for durability inspection.
- `scripts/payloadRuntime.ts`: loads Next environment files and initializes Payload.
- `scripts/bootstrapAdmin.ts`: controlled first-admin creation, refuses to overwrite existing admin. Not yet exercised against PostgreSQL.
- `scripts/worker.ts`: continuously runs the `compatibility` queue or one cycle with `--once`; graceful shutdown and database cleanup.
- `scripts/fixtureJob.ts`: queues or inspects a fixture job using trusted local APIs.
- `.env.example` and `docs/backend-spike-setup.md`: server environment/setup instructions; README links to setup.

These files are a compatibility spike, not the final assessment service or production worker recovery implementation.

## What was actually verified

Passed before this handoff:

- Package installation and declared peer compatibility.
- `npm.cmd exec next -- typegen` after the route move.
- `npm.cmd run typecheck`.
- `npm.cmd run lint`.
- `npm.cmd test`: eight existing tests across three prototype test files.
- `npm.cmd run build`: compiled `/`, `/admin/[[...segments]]`, `/api/[...slug]`, `/q/[id]`, `/report/[token]`.

The production build used an ephemeral process-only random secret and a localhost placeholder database URL. **It did not connect to PostgreSQL.** Passing the build does not prove admin login, authorization hooks, bootstrap, queue persistence, worker runtime imports, or migrations.

No browser end-to-end check was run after the Payload integration. No live Gemini or Resend calls, emails, database migration, or deployment occurred. Formatting was run on new code; a later command mistakenly included `.env.example`, which Prettier cannot parse. Run Markdown formatting separately and do not report that mixed command as a successful whole-tree format check.

npm reported nine dependency advisories (one low, eight moderate). Investigate applicability before release; do not force-upgrade incompatible dependencies or attribute all advisories to new code without comparing the baseline.

## Immediate next task: finish task 1

- [ ] Reinspect the diff, installed package versions, and relevant Payload types/docs.
- [ ] Establish a disposable PostgreSQL database. Docker/psql were not found locally during inspection. An asynchronous preference question was asked, but the owner did not answer it. No DB source has been selected and no connection credentials were supplied.
- [ ] Add a private local `DATABASE_URL` and random `PAYLOAD_SECRET`. Never print or commit secrets; preserve the existing UI environment flags.
- [ ] Initialize only the disposable development schema. Do not enable schema push on valuable or production data. Disable push before multi-process verification.
- [ ] Execute local bootstrap, verify login and protected access, and check first-user/public job endpoints cannot bypass the guards. Test against a fresh DB as well as an existing admin.
- [ ] Queue fixture in process A, let it exit; run worker in process B, let it exit; inspect persisted completion/output in process C. Verify marker matches and another inspect does not rerun the task.
- [ ] Run the continuous worker, verify clean stop/restart and the behavior of an interrupted task. Document unsupported recovery instead of treating a one-cycle check as lease-recovery proof.
- [ ] Check worker commands resolve TypeScript/config/environment modules correctly under the actual runtime. A successful Next build does not test `tsx` execution.
- [ ] Generate/check Payload types and import map as needed. Review generated files and lint handling; do not disable type safety to hide incompatibilities.
- [ ] Verify public/admin pages in a browser, including absence of public layout wrapping admin.
- [ ] Run typecheck, lint, tests, and build again after fixes. Record exact evidence, then update/move the spike spec according to repository instructions.

Useful commands after setting up the environment:

```powershell
npm.cmd run admin:bootstrap
npm.cmd run job:fixture -- queue
npm.cmd run worker:once
npm.cmd run job:fixture -- inspect <printed-job-id>
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

### Watch points before relying on the spike

- Bootstrap currently does count-then-create: run as a single controlled local command. Concurrent bootstrap protection needs a deliberate design/test before broader use.
- Worker `--once` output and job-inspection output need explicit failure assertions in automated integration checks; do not infer task success from process startup alone.
- `tsx` is currently a dev dependency. The final production worker image must include its runner or use a verified compiled worker artifact; `npm ci --omit=dev` alone will not provide it.
- There are no production migrations or Docker files yet. Schema-push setup is a disposable-spike mechanism only.
- Existing prototypes still save to localStorage and use mock reports. Payload installation has not made user answers persistent in PostgreSQL.

## Subsequent tasks

Continue the ordered tasks in STEP_4_BACKEND_DESIGN.md after the compatibility task is verified:

1. Shared validated contracts and async frontend adapter boundaries.
2. Collections, migrations, CMS editing, and atomic immutable publication.
3. Anonymous ownership, database autosave/resume, concurrency and validation.
4. Configuration-driven scoring and evidence coverage.
5. Submit snapshots, durable outbox/jobs, Gemini rubric evaluation and one clarification.
6. Report generation, eligible priorities, partial/error handling and retries.
7. Resend notification requests, delivery deduplication and private expiring links.
8. Contact capture and admin lead/submission browsing.
9. Adapter/UI integration, Docker/CI/observability/backups, and preview verification.

Keep working in bounded reviewed tasks, not a blind whole-plan loop. The repository asks for Ralph; no Ralph executable/tool/skill was found in this session. Recheck availability, or transparently follow the specified bounded implement/check/fix process directly. Do not claim an unavailable orchestration tool ran.

## Definition of a useful next handoff

State the completed task, concrete files changed, commands and real runtime checks passed, unresolved issues, and the next bounded task. Keep the backend plan and spike status accurate. No percentage estimate substitutes for these acceptance checks, and nothing in this handoff authorizes publishing, paid purchases, sending unsolicited messages, or deleting retained data.
