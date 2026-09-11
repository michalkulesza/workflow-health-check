# Shared contracts and async adapter boundary

Status: verified complete on `backend/payload-worker-spike` (2026-09-11). This is task 2 from `STEP_4_BACKEND_DESIGN.md`.

## Scope

Introduce validated, server-neutral assessment request and response contracts plus an asynchronous adapter interface. Keep the active prototype UI and its scenario controls unchanged; UI integration belongs to task 12.

## Acceptance criteria

- Zod schemas define the public landing/questionnaire projection, anonymous submission lifecycle, answer/progress mutations, report states, contact/notification requests, and API error shape.
- Production DTOs contain no `scenario`, artificial delay, or failure-toggle fields.
- An asynchronous in-memory adapter conforms to the same interface and enforces revision/mutation boundaries used by a future HTTP implementation.
- Contract tests cover valid parsing, rejected malformed requests, stale revisions, mutation deduplication, and absence of prototype-only controls.
- Existing UI checks remain green without changing its behavior.

## Exclusions

No Payload collections, HTTP routes, browser/session ownership, PostgreSQL persistence, scoring engine migration, email delivery, or UI adapter migration. Those are later bounded tasks.

## Verification

- Production DTO schemas reject prototype-only fields such as `scenario` and validate malformed answer mutations.
- The in-memory adapter deduplicates an identical mutation, rejects a reused mutation ID with different data, and returns a typed stale-revision conflict rather than overwriting newer data.
- The HTTP adapter serializes only validated DTOs, validates responses, and maps validated API errors to a typed adapter error.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (15 tests), a production build with the disposable local server environment, and `git diff --check` pass.

Task 2 is complete. The next bounded task is task 3: PostgreSQL/Payload collections, controlled migrations, and protected admin bootstrap built on these contracts.
