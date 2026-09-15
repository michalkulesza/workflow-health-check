# Database initialization and assessment error handling — repair handoff

Prepared: 2026-09-15. Status: planned; no repairs implemented by this planning session.

## 1. Objective

Make database initialization failures, later database outages, malformed requests, and client fetch failures fail predictably. Return sanitized API errors, preserve user input, and provide honest recovery actions. Eliminate the separate Payload initialization unhandled rejection without suppressing unrelated programming errors.

The triggering log contains PostgreSQL authentication failure for user `workflow_spike`, an exception escaping the landing API, and `unhandledRejection: undefined`. Correcting credentials and correcting error handling are separate work items.

Read `general.md`, `AGENTS.md`, and `typescript-react-guidelines.md` before implementation, plus installed Next.js guides for affected route/error APIs. Inspect current branch/status and dependency versions. There are extensive concurrent UI, backend, test, configuration, and formatting changes; preserve them and stage only this task's work. Recheck this investigation against the current files before editing.

## 2. Findings and evidence

### A. Two independent failure paths

Installed `@payloadcms/db-postgres/dist/connect.js` calls `this.rejectInitializing()` without a reason on connection failure (line 104 during inspection), then throws a connection Error. Its adapter factory creates a separate `initializing` promise in `dist/index.js`; transaction initialization awaits that promise later. Catching `getPayload()` handles the thrown connection error but does not necessarily observe that separate rejection.

An isolated reproduction imported the installed `connect` function and supplied a fake pool whose `connect()` throws. With the main exception explicitly caught, the subprocess still emitted:

```text
connection exception caught: Error: cannot connect to Postgres: simulated authentication failure
secondary unhandled rejection: undefined
```

No real database, credentials, or application records were used. This establishes the secondary rejection independently of the landing route. Recheck the behavior after any dependency change. Do not assume an upstream release fixes it without a regression run.

### B. Missing application error boundaries

All 15 inspected route files under `app/(frontend)/api/assessment/v1/` call `getPayload()` without an encompassing route boundary:

- Landing, questionnaire-by-ID, questionnaire resume, sessions.
- Submission creation/read, answer save, progress, submit, clarification, report.
- Notification, contact, report-grant exchange, current report grant.

The transaction catches in contact, notification, and grant exchange roll back and rethrow. They do not encompass initialization or connection checkout. The health readiness route already catches its main failure and returns 503/no-store, but can still encounter the adapter's separate rejected promise.

Next can catch an awaited route exception and produce a framework 500. That is distinct from the process-level unhandled rejection; both need attention. The existing `server/assessment/response.ts` formats errors but is not an error boundary.

### C. Related failure behavior

- `schema.safeParse(await request.json())` does not handle malformed JSON: `request.json()` throws before schema validation runs.
- `components/Assessment.tsx` polling catches and discards errors. Users may remain waiting with no explanation of the outage.
- `components/PrivateReport.tsx` presents every fetch failure as an invalid/expired/used link, including transient backend failures.
- Landing and initial assessment loading already catch client failures; retain these boundaries and provide useful retries where absent.
- CLI entry points generally have top-level catches; do not mistake these for missing route boundaries. The adapter rejection repair must also work for CLI/worker initialization.
- `payload.config.ts` throws for missing configuration at module import time. An HTTP handler wrapper cannot catch failures that occur before the handler is loaded. Keep configuration fail-fast and test/document it separately from request-time database outages.

## 3. Proposed implementation

### E1. Establish baseline and diagnose connection configuration safely

Record the current dependency versions and relevant existing test results. Compare the effective development database target with the intended running PostgreSQL service using sanitized host/port/database/user fields only. Check process-variable precedence, private environment files, host versus container ports, and the role actually configured in the persistent database.

The log proves rejected authentication, not which configuration source is wrong. Do not infer that `workflow_spike` must be the username merely because it is a database name. Do not print URLs/passwords, reset roles, or recreate volumes to make the check pass. Changing Compose initialization variables does not establish the current credentials of an already initialized volume. If a known local configuration mismatch can be corrected within scope, preserve other local settings and record the correction without secrets; otherwise state the exact remaining operator action.

### E2. Fix the adapter initialization promise lifecycle

Preferred approach: a narrow, version-documented application adapter wrapper at the shared Payload configuration boundary. Inspect the actual adapter factory API/types first. Attach a rejection observer to every newly created `initializing` promise before connection begins, including any replacement on destroy/reinitialization/HMR. Preserve the original rejected promise for legitimate awaiters; do not convert initialization failure into successful readiness. Propagate a real sanitized Error reason rather than undefined where the lifecycle permits.

If the installed lifecycle cannot be wrapped reliably, use a reproducible, committed dependency patch or a narrowly verified compatible upstream fix. Explain and test the chosen mechanism. A manual edit inside ignored `node_modules` is not deliverable; a dependency-wide upgrade is not the default solution. Keep web, admin, CLI, and worker on the same fix through shared config.

Do not install a production `process.on('unhandledRejection', () => {})` listener, ignore all undefined rejections, or globally suppress errors. Tests may observe process rejection events inside isolated child processes to assert the regression.

Verify initial failure, concurrent initialization callers, retry after failure, and recreated adapter state. Do not claim safe same-process recovery if the tested library lifecycle requires restarting the process; document the exact recovery procedure instead. No infinite automatic retries for authentication failure.

### E3. Add one typed assessment route boundary

Add a reusable route wrapper/helper alongside `server/assessment/response.ts`. Preserve each route's Request/context signature, including asynchronous params. Wrap the whole awaited handler body, including initialization, session/ownership queries, connection checkout, and response construction. Apply it consistently to all 15 custom assessment route files.

| Failure | HTTP behavior |
| --- | --- |
| Known database initialization/connectivity outage | 503, existing `temporary_failure` error code, generic service-unavailable message |
| Unexpected application exception | 500, compatible generic error envelope; do not mislabel every exception as database downtime |
| Malformed JSON or schema-invalid request | 400, `bad_request`, safe validation message |
| Existing expected auth/not-found/conflict/validation response | Preserve status, code, field errors, and revision semantics |
| Readiness dependency failure | Preserve 503/no-store and existing health response shape |

All error responses use `Cache-Control: no-store` and a request identifier. Successful landing caching remains unchanged; errors must never inherit its public caching header. Preserve cookies, CSRF/origin validation, ownership checks, transaction boundaries, and idempotency. Avoid broad catch-and-return-null patterns that turn an outage into an empty report or 404.

Use typed errors or well-defined database codes/causes where possible; do not classify solely by arbitrary message substrings. Allowlist safe log metadata such as route template, operation, request ID, failure category, and database error code. Do not log request bodies, answers, email addresses, report tokens, cookies, raw URLs, connection strings, or unfiltered database error objects. Request ID should link the response to the application log. Account for the adapter's own logger so it does not bypass the intended redaction; document any remaining library logging limits.

Inspect Payload-generated admin/REST handling separately: do not wrap vendor routes with the assessment JSON contract. Confirm that the shared initialization fix covers them and that initialization fails visibly without a detached rejection.

### E4. Parse requests and clean up transactions safely

Introduce a shared JSON parsing helper that catches body parsing errors only, then runs the existing schema. Do not map an arbitrary SyntaxError from application code to a client 400. Retain existing authentication ordering rather than revealing validation details to unauthorized callers.

Ensure failed transaction rollback cannot mask the original exception. Always release checked-out clients in finally; a failed checkout has no client to release. Keep rollback diagnostics sanitized. The outer boundary must observe the original failure after cleanup. Do not change transaction semantics or retry mutations blindly after ambiguous commit outcomes.

### E5. Surface recoverable client failures

- Assessment polling: preserve the last valid report/submission, show a quiet service-unavailable status and explicit Retry, clear it on recovery, and avoid stacked/overlapping polls. Stop work or ignore stale results after unmount/screen changes. Use bounded retry/backoff if automatic retry remains; do not leave a permanently unexplained spinner.
- Private report: distinguish invalid/expired access from network/5xx failures. Show neutral unavailable access for the former and a retryable service error for the latter without exposing private details.
- Private grant recovery must account for single-use exchange: if exchange succeeds but fetching the current report fails, retry the current-report fetch rather than re-consuming the token. For an ambiguous exchange response, check the existing report session safely before concluding the link is invalid. Do not broaden permissions or change grant lifetime.
- Landing and initial assessment: maintain meaningful loading/error/retry states, avoid duplicate sessions/submissions during retry, and do not describe a server outage solely as the user's connection problem.
- Save, submit, contact, and notification: retain drafts and existing logical mutation IDs on retry; ensure the normalized API errors remain compatible with current client handling.

Coordinate with the active form redesign rather than replacing its component structure. Keep this task focused on failure behavior, not visual redesign.

## 4. Regression and runtime verification

Tests should exercise actual failure paths rather than assert that files contain try/catch blocks.

| Scenario | Required evidence |
| --- | --- |
| Adapter connection failure with caught main error | Isolated child process reports no unhandled rejection after fix; regression fails against the original implementation |
| Initialization consumers/lifecycle | Concurrent getPayload callers fail predictably; new/reinitialized adapter promise handled; recovery policy verified |
| Every custom assessment endpoint fails initialization | Parameterized handler tests assert 503, valid envelope, no-store, safe message and request ID; use valid inputs/origin where needed to reach initialization |
| Database fails after initialization | Session lookup, query, pool checkout, and transaction failure examples receive normalized errors and release acquired clients |
| Unexpected programming exception | Generic 500 rather than false 503 or success |
| Malformed JSON | Each body-reading endpoint returns 400 after applicable auth checks; schema validation behavior retained |
| Existing expected errors | 401/403/404/409, revision and field-error semantics remain unchanged |
| Logging | Captured application/library output contains no supplied secret/token/email/answer sentinels; response request ID matches application diagnostic |
| Polling failure/recovery | User sees actionable error; last good data retained; retry recovers; no overlapping requests or stale updates |
| Private link failure after successful exchange | Retry loads current report using the existing grant session; no second exchange consumes/rejects the valid session |
| CLI/worker startup failure | Nonzero exit and controlled diagnostic, no secondary unhandled rejection or hung background process |
| Disposable running preview | Wrong credentials and unreachable DB produce controlled failures; liveness stays available, readiness is 503; restoring correct config and documented restart/retry restores real API functionality |

Use fake connections and test-only mocks for unit failures, plus a disposable database for runtime verification. Do not disrupt the owner's active preview or send provider requests. Scope observation listeners to test child processes. Confirm actual stderr/exit status; a mocked `getPayload` rejection alone cannot prove the adapter fix.

Run focused tests first, then project formatting/lint/typecheck/unit/integration/build/browser checks appropriate to changed behavior. Capture real exit codes and counts separately. Preserve baseline failures from concurrent work and explain them instead of weakening CI or hiding skips.

## 5. Execution order and stop conditions

1. E1: baseline and sanitized configuration diagnosis.
2. E2: adapter regression and shared lifecycle fix; prove it before assuming route catches solve the log.
3. E3/E4: shared HTTP boundary, request parsing, and cleanup, with endpoint coverage.
4. E5: client recovery feedback, including single-use private-link retry.
5. Runtime verification, diff review, runbook notes, and evidence update.

Use a task branch/worktree and the repository's bounded implement/check/fix workflow. Recheck Ralph availability and record the fallback if unavailable. Reassess after three repeated failures of the same fix/check rather than broadening into a dependency or backend rewrite.

## 6. Definition of done and execution record

The original failure is understood, produces controlled service errors without a detached rejection, and users can recover without losing inputs or invalidating valid report sessions. Configuration issues are resolved or precisely documented; no database reset is required as a routine fix.

| Item | Evidence |
| --- | --- |
| Baseline revision/versions and preserved edits | Pending |
| Sanitized credential/target diagnosis | Pending |
| Adapter mechanism and reproduction before/after | Pending |
| Route/parser/transaction coverage | Pending |
| Client/private-grant recovery checks | Pending |
| CLI/worker and preview failure/recovery evidence | Pending |
| Verification commands, exit codes and counts | Pending |
| Remaining limitations | Pending |

Keep this document active until required acceptance passes, then move it to `docs/specs/done/`. Update operation instructions with the supported recovery procedure. No deployment, credential rotation, volume deletion, or live provider traffic is authorized by this plan alone.

## 7. Handoff prompt

> Implement `docs/specs/ERROR_HANDLING_REPAIR_HANDOFF.md`. Preserve concurrent form/backend changes. Start with the reproduced Payload adapter initialization rejection, then apply consistent API error boundaries and malformed-JSON handling across assessment routes. Fix client polling and private-link retry feedback, preserve permissions and mutation semantics, and verify controlled failures and recovery with isolated tests. Record exact outcomes; do not silence global unhandled rejections or reset database volumes.
