# Payload and worker compatibility spike

Status: verified complete on `backend/payload-worker-spike` (2026-09-11).

## Bounded task

Prove that Payload 3.89.0 works with the existing Next.js/React application and that a separate TypeScript worker can execute a durable fixture job against PostgreSQL. Preserve the public UI and existing uncommitted changes. This is task 1 of STEP_4_BACKEND_DESIGN.md, not the entire backend build.

Acceptance:

- Matching Payload packages install without peer-dependency bypasses.
- Admin routes and current public routes build in separate layout groups.
- Anonymous admin/user/job writes are denied; bootstrap is a local explicit command.
- A fixture can be queued in one process, executed in a separate worker process, and inspected in a third process after restart.
- Typecheck, lint, relevant tests, and production build pass; actual database verification is recorded separately from compilation.

## Workflow

The repository requests Ralph. No Ralph executable, tool, or skill is available in this environment. Apply its prescribed bounded implement/check/fix loop directly: at most three iterations before reassessing repeated failures, save source/spec progress, review changes to checks, and report real verification results. Do not claim a Ralph tool ran.

## Initial findings

- npm registry reports @payloadcms/next 3.89.0 accepts Next.js >=16.2.6 <17; PostgreSQL adapter requires payload 3.89.0.
- `compose.yaml` defines a disposable PostgreSQL 16 service bound to `127.0.0.1:55432`, with credentials in ignored `.env.development.local`.
- Docker Desktop / Docker Engine with Compose v2 is not installed or available on `PATH` in this workspace, so the service has not started and database verification cannot yet run.
- Existing prototype edits are present on this branch and must not be staged, reverted, or attributed to this task.

## Tasks

- [x] Inspect instructions, prototype, and package peer requirements.
- [x] Create branch.
- [x] Install pinned packages without peer-dependency bypasses.
- [x] Add minimal protected Payload configuration, admin routes, and bootstrap command.
- [x] Add durable fixture task and worker/queue/inspect commands.
- [x] Generate Payload types and import map; verify the TypeScript worker entrypoints load their environment and configuration.
- [x] Production build compiles public/admin routes together; runtime admin check still needs PostgreSQL.
- [x] Verify durable queue across processes with PostgreSQL.
- [x] Document setup, limitations, and checks; move this spec to done after this verified status update.

## Verification so far

- Next.js production build passed, including `/`, `/admin/[[...segments]]`, `/api/[...slug]`, `/q/[id]`, and `/report/[token]`.
- Type checking and lint passed.
- All eight existing unit tests passed. These are prototype tests, not evidence of PostgreSQL or admin authorization behavior.
- `payload generate:types` and `payload generate:importmap` pass. The generated import map is consumed as JavaScript with a companion declaration file, so it stays generator-owned without weakening type checking or linting.
- The worker, fixture CLI, and bootstrap CLI now reach Payload's PostgreSQL adapter when invoked through `tsx`; they no longer fail while loading TypeScript/configuration modules. Their intentionally invalid placeholder connection was refused because no PostgreSQL service is available, so it is not database verification.
- Current static verification after the runtime fixes: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (8 tests), `npm.cmd run build`, and `git diff --check` all pass. The Payload CLI emits Node 26's `module.register()` deprecation warning, but completes successfully.
- Public routes moved to `(frontend)` without changing their URLs or component contents; the existing stylesheet remains at `app/globals.css`.
- Build validation used an ephemeral process-only secret and a disposable-localhost connection placeholder; it did not establish a database connection.
- Database-backed admin/bootstrap/access checks and queue/worker/inspect persistence verification remain pending a disposable PostgreSQL instance.
- The generated ignored local development environment file has the disposable database URL and stable Payload secret. Temporary bootstrap credentials were removed after the initial admin was created.
- npm reported nine dependency advisories (one low, eight moderate); review before production rather than applying a blind force upgrade during this compatibility spike.

## PostgreSQL verification (2026-09-11)

- Docker Desktop 29.7.2 and Compose 5.5.1 started the disposable `postgres:16.11-alpine` service successfully. Its only host binding is `127.0.0.1:55432`; Compose reported the service healthy.
- The first `admin:bootstrap` command initialized the disposable schema with schema push enabled and created the configured initial administrator. A second invocation refused with `An admin already exists; bootstrap will not overwrite it`. Schema push was then disabled before multi-process verification, and the temporary bootstrap credentials were removed from the ignored local environment file.
- An isolated server on port 3001 verified HTTP access control: anonymous `GET /api/admins` returned 403, anonymous `POST /api/admins/first-register` returned 403, and anonymous `GET /api/payload-jobs/run` returned 401. Admin login returned 200 and issued a cookie; using that cookie, `GET /api/admins` returned 200 while `/api/payload-jobs/run` still returned 401. The admin page returned 200 separately from the public route group.
- A fixture job was queued in process A as job `1`, with marker `a8887657-ec1e-43e2-b042-8dff3424e4c8`. Process B (`worker:once`, PID 25484) completed it. Two separate later inspect processes both returned the same persisted completion timestamp, marker, and worker PID, with no error and no additional execution log. Inspection does not rerun completed work.
- A production build against the live disposable database passed after the runtime fixes, alongside typecheck, lint, unit tests (8 tests), generated Payload types/import map, Prettier checks for changed files, and `git diff --check`.

The continuous-worker interruption/lease-recovery behavior remains intentionally outside this fixture spike; it is a later durable worker lifecycle task. No production migration, provider call, email, deployment, or public UI change was made.

Setup instructions: `docs/backend-spike-setup.md`. Task 1 is complete; proceed next with task 2, shared validated domain contracts and async frontend adapter boundaries.
