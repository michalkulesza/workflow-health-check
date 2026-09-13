# Anonymous sessions and save/resume endpoints

Status: complete and verified on 2026-09-13. This is Task 5 from
`STEP_4_BACKEND_DESIGN.md`.

## Progress (2026-09-13)

- Submission/read/resume responses now use the shared `Submission` DTO and are
  validated at the server boundary; resume includes saved answers.
- Progress updates use a conditional PostgreSQL revision update. Answer writes
  use one PostgreSQL transaction for the revision update, answer upsert, and
  durable `(submission, mutationId)` record. A stale writer receives the
  currently stored revision.
- Answer mutations hash their logical payload. A matching retry returns its
  original revision; reuse with a different payload returns
  `idempotency_mismatch`.
- Answers are checked against the immutable questionnaire-version definition,
  including unknown options, selection limits, exclusive options, and
  required option text. Focused validation tests cover these rules.
- A dedicated `test:integration` suite runs against the explicitly guarded
  disposable `workflow_spike` PostgreSQL database. It covers cross-session
  read/write and resume isolation, missing/invalid origin and CSRF checks,
  stale revisions, retry deduplication, mutation mismatch, and concurrent
  progress/answer updates.
- `payload generate:types`, typecheck, lint, unit tests (17), integration
  tests (2), a production build, and `git diff --check` pass. The production
  build was run with the ignored disposable-development environment loaded;
  the tracked `.env.example` deliberately has no usable Payload secret.

## Scope

Add an opaque, HTTP-only anonymous-session cookie and database-owned session records. Implement narrow assessment API routes for creating a submission from the currently published questionnaire, reading only the caller's own submission/resume state, saving answers/progress with optimistic revisions, and safe retry deduplication.

## Acceptance criteria

- A caller receives no raw session secret and cannot read or mutate another browser's submission by guessing its ID.
- Cookie-authenticated writes require same-origin validation and a CSRF token; private responses are `Cache-Control: no-store`.
- Submission creation validates the current published version; stale displays receive a conflict.
- Answer/progress writes enforce ownership and expected revision, increment revision atomically, and retain client mutation IDs for retry-safe answer writes.
- A second browser/session cannot resume the first session's draft. A stale tab receives the current revision in a conflict response.

## Exclusions

UI adapter integration, final submission/job processing, report access grants, email/contact capture, and public landing/questionnaire projections are later tasks.
