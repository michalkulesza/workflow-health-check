# Step 6: One complete assessment journey — implementation handoff

Prepared: 2026-09-13. Reconciled: 2026-09-14. Status: partially verified. The local saved-answer → deterministic/pending report → admin-linked contact journey is recorded as exercised. Full provider-controlled automated completion, clarification, and the remaining regression evidence are outstanding; Step 6 remains active.

This reconciliation reviews existing repository records and test coverage. It does not represent a fresh runtime or remote CI execution. The later verification entries in [V1 scope](V1_SCOPE.md#preview-and-initial-launch-verification) supersede older pending statements in the Step 5 execution record where they describe the same check.

## 1. Objective

This is **Step 6 of the overall application workflow**, not backend task 6 (the scoring engine).

Make one existing questionnaire work end to end through the actual application and verify it in the configured preview:

```text
Published CMS content → landing → anonymous questionnaire → saved answers
→ review/submit → durable worker → AI evaluation/optional clarification
→ scored, grounded report → contact request → linked lead visible in admin
```

Much of this code already exists. Inspect, integrate, test, and fix concrete gaps rather than rewriting it. The owner is independently refining marketing content and form UI. Preserve that work; visual redesign is not part of this task.

## 2. Instructions and prerequisites

- Read `general.md`, `AGENTS.md`, `typescript-react-guidelines.md`, and relevant installed Next.js documentation before implementation.
- Read [Step 5 foundations](done/STEP_5_FOUNDATIONS_HANDOFF.md), [backend design](done/STEP_4_BACKEND_DESIGN.md), [V1 scope](V1_SCOPE.md), [scoring reference](../SCORING_REFERENCE.md), and [AI rubric](AI_RUBRIC_INITIAL.md).
- Inspect branch/status and current verification records. At planning time, Step 5 files have uncommitted changes. Do not revert/stage those as your own or assume Step 5 is complete merely because this brief exists.
- Prerequisites: isolated migrated/seeded PostgreSQL, protected admin, runnable web and separate worker, valid environment, stable published questionnaire UUID, and a usable preview. Resolve only prerequisite blockers needed for this journey; record larger foundation gaps in Step 5.
- Use the repository's bounded task workflow and Ralph if available. If unavailable, document that and follow bounded implement/check/fix cycles directly. Reassess repeated failures rather than silently expanding scope.
- Keep an implementation record here. Move to `docs/specs/done/` only when required verification passes. Missing live provider or preview access is a pending acceptance item, not a reason to fabricate a pass.

## 3. Current code and coverage to inspect

Existing entry points include:

- `lib/assessment/contracts.ts`, `adapter.ts`, `httpAdapter.ts`, `browserAdapter.ts`.
- `server/content/` publication, definitions, and public projection.
- `server/assessment/` sessions, ownership, mutation validation, submission, scoring, reports.
- `server/jobs/` outbox, deterministic scoring, AI evaluation, category aggregation, narrative, report-email tasks.
- `server/ai/`, `server/notifications/`, `server/leads/`.
- Payload collections, migrations, seed/bootstrap scripts, `scripts/worker.ts`.
- `tests/assessmentSessions.integration.test.ts`, provider/service unit tests, and `tests/journeys.spec.ts`.

Current browser coverage includes two smoke tests in `tests/journeys.spec.ts` and an opt-in 16-question flow in `tests/previewJourney.spec.ts`, enabled with `RUN_PREVIEW_JOURNEY=true`. The latter exercises reload/resume, review/submit, optional notification, and contact UI. It does not independently assert persisted scores, run/version/lead linkage, admin stage/note edits, or provider-driven completion. Its notification assertion accepts either a saved request or an error message, so passing that test alone does not prove successful notification persistence. The recorded CI run passed the two smoke tests and skipped the opt-in journey. Existing unit tests cannot substitute for the complete journey.

Check actual DTOs/routes before writing tests; design documents may describe intended interfaces that differ from the final implementation. Correct drift deliberately and update documentation rather than silently accepting broken product requirements.

## 4. Scope: one real vertical slice

Use the existing six-category, 16-question creative-workflow questionnaire. Do not reduce it to a toy one-question form to claim completion. Establish a deterministic test respondent with meaningful, fictional free-text answers and expected deterministic scores. Keep fixture inputs/version in test code or an isolated seed, not in production scenario controls.

### A. Start from published CMS content

- An admin can identify/edit a draft and publish through the supported CMS/admin workflow. If the service exists but no usable publish action is available, add the smallest authenticated action required.
- The landing CTA opens its configured published questionnaire. Public display content comes from the saved definition, not an unrelated static copy.
- New submissions bind to an exact publication. Capture the expected version in the test evidence.
- Normal question/content edits do not require deployment. Test a small harmless content change in the disposable environment and verify it appears after publishing.

### B. Answer, save, resume, and review

- One question at a time, working Back/Next, required/optional behavior, Q3 selection limit, exclusive None/smooth collaboration options, and required accompanying text.
- Establish an anonymous cookie-backed session; no registration or email gate.
- Answer saves reach the backend and PostgreSQL. UI save status reflects acknowledged persistence; failed writes preserve input and expose retry.
- Reload midway: restore the saved answers, navigation, and original questionnaire version. Demonstrate persistence across web restart on disposable preview data.
- Edit an answer from review; confirm the saved revised answer is what submission/scoring consumes.
- Final submit waits for acknowledged saves, validates required answers, and creates one frozen input snapshot/run/outbox request. Rapid double clicks or retry of the same logical request must not duplicate the run.

### C. Worker processing and optional clarification

- The web request queues work and returns; a separate process reads durable work. A request handler computing the whole report synchronously is not equivalent.
- Deterministic scoring, grouped AI evaluation, category aggregation, and narrative flow through their actual services. Persist outputs and provenance.
- Clear processing UI uses real status, not a fixed delay pretending processing finished.
- If initial evidence is insufficient, ask one clarification after the core questions, persist its response, and continue. Never loop into a second clarification. Still-insufficient evidence produces null/unknown, never zero.
- Closing the browser does not cancel work. Returning can retrieve the completed/pending report with the correct session.
- Stop/restart the worker at a controlled boundary. Confirm accepted work remains discoverable and completed stages are not blindly repeated. Scope deeper failure-injection coverage for later if needed, but prove this basic recovery now.

### D. Accurate, understandable report

- Use the agreed config-driven formulas; never accept browser-supplied scores as authoritative.
- Q5 uses 60/40 quality and quantity with the head-alone override. Q8 denominator is 16.5. Q9 is 1−count/10. Q10 no recurring tasks is not applicable.
- Category defaults: 20 points; weights 1; eligibility strictly below normalized 0.6. Grouped Q11–13 contributes once. Coverage follows the configured rule; distinguish the proposed coverage default from the confirmed attention threshold.
- Return up to two eligible priority categories, their points, grounded explanations, and one practical first step each. Unscored answers inform context without earning points.
- No unrelated collapsed category panels or on-demand per-category AI reports. Allow a fully evaluated no-major-issues result without inventing a weakness.
- An incomplete provider stage is not “no major issues.” Clearly label pending, partial, insufficient, and terminal failure states.
- Ensure the displayed result matches the persisted run/version and submitted answers; do not render fixture narratives as if they evaluated arbitrary input.

### E. Contact through to admin

- Results remain accessible before contact details are provided.
- CTA captures required email plus optional name/message, links to the assessment, and persists one New lead.
- Repeated submission of the same logical contact request does not duplicate the lead. Recoverable failure preserves entered values.
- Authenticate as admin in a separate browser context and open the lead/submission: verify answers, version, report, and contact fields correspond to the visitor's journey.
- Update lead stage and internal note; verify persistence after reload. Historical respondent answers/results remain protected from normal editing.

## 5. Test-provider strategy: real internal path, controlled external boundary

Two distinct evidence levels are required; report them separately:

### Repeatable automated journey

Run the real browser, HTTP API, PostgreSQL, outbox, and worker. Stub **only external Gemini/Resend transport** in an isolated test process/environment. The worker must consume those responses through normal schema validation and persist normal results.

- Do not intercept the final report API in Playwright and return a canned report; that skips the core system under test.
- Do not inject a pre-completed report row as a substitute for worker execution.
- Choose a process-level provider adapter/test harness that is inaccessible through public URLs, query parameters, request bodies, or anonymous CMS fields. Production configuration must not silently enable it.
- Put a small bounded scenario set at the provider boundary: successful rubric/narrative, one clarification, insufficient evidence, transient failure, terminal failure. Match evidence references to the actual seeded answers.
- Regular CI has no live provider keys and sends no email. Assert output validation, intermediate persistence, and database state independently of the browser display.

### Controlled live-provider preview check

- With an authorized preview and Gemini credentials, run one actual assessment through the worker's real Gemini adapter. Use fictional non-sensitive respondent data and bounded calls.
- Verify schema-valid rubric and narrative, persisted provider/model/prompt versions, usage, and plausible grounding. Do not assert an exact nondeterministic AI score or prose string.
- Record model identifier, run ID, timings/usage, and outcome without exposing keys or raw private content in logs.
- If credentials are unavailable, finish the repeatable tests and clearly mark live-provider validation pending. Do not call the milestone fully verified against live AI.
- Resend live inbox verification belongs to the notification extension below and requires an explicitly designated test recipient. Do not send messages to arbitrary addresses or real customers from this plan.

## 6. Minimum automated scenario matrix

| Scenario | Evidence required | Preferred layer |
| --- | --- | --- |
| Complete journey | Published form → real saves → queued run → worker report → CTA → admin-linked lead | Playwright + isolated PostgreSQL + worker + provider stub |
| Resume and edit | Saved answers survive reload; review correction enters frozen scoring input | Browser + DB assertion |
| Version pinning | A starts version 1; admin publishes version 2; A resumes version 1; new B starts version 2 | API/DB integration, one browser smoke if useful |
| Save/submit repetition | Save failure retains text; retry succeeds; duplicate final submit yields one logical run | Browser and API integration |
| Clarification | Exactly one follow-up, persisted answer, continuation completes; another round rejected | Worker integration + browser |
| Insufficient/healthy | Unknown does not become zero/healthy; fully supported healthy assessment does not force priority | Worker/report integration |
| Ownership | Separate cookie context cannot read/write another submission or report | HTTP integration |
| Worker restart | Queued work survives interruption and progresses after restart | Process/container integration |
| Grounding/scoring | Deterministic expectations match DB/report; invalid AI evidence/category IDs rejected | Unit + worker integration |
| Lead persistence | Exactly one linked lead visible to admin; stage/note persist | API/DB + admin browser check |

Run the main UI journey on desktop and mobile. Include keyboard operation and accessibility checks at form, clarification, results, and contact; adjust semantic selectors to evolving copy rather than locking tests to incidental CSS.

Do not treat every case as a separate slow full browser journey. Use integration/unit coverage for combinations and a few complete browser paths. Test meaningful behavior, not merely the existence of routes or status codes.

## 7. Adjacent path: notification fallback

This is already a V1 requirement, but it is not necessary to turn Step 6 into a complete launch audit. Prove the boundary while testing provider failure; track any remaining end-to-end email work explicitly for Step 7.

- After bounded failures, deterministic results are usable and AI state is clearly partial/pending/unavailable.
- Optional notification email creates a notification request, not a lead. Unit/integration assertions must prove this distinction.
- When a report becomes available, a controlled email transport captures exactly the intended report-ready message. Do not claim inbox delivery from a captured transport payload.
- If exercising the token path, exchange the issued private grant and verify clean report-only access, expiry/replay behavior, and inability to edit another user's answers.
- Resolve delayed clarification behavior according to the reviewed design; do not announce a complete report if a required clarification is still pending. Proposed timeout behavior is not automatically accepted by this brief.
- Mark live Resend domain/sender/inbox validation pending unless actually performed with configured authorization and a designated recipient.

## 8. Ordered tasks

| ID | Bounded task | Completion criterion |
| --- | --- | --- |
| J1 | Inspect Step 5 evidence and current contracts, services, UI | Record prerequisite gaps and preserve current edits; identify exact published test questionnaire |
| J2 | Build isolated journey fixtures and provider transport harness | Repeatable seed, known deterministic expectations, no public testing bypass or real email |
| J3 | Verify/fix landing → question saves → review → submit integration | Browser data matches persisted versioned answers and one submitted snapshot/run |
| J4 | Verify/fix worker → AI → clarification → report integration | Persisted stage results and report match evidence; one clarification maximum; status/UI agree |
| J5 | Verify/fix contact → linked lead → admin browsing | Admin sees the correct assessment; contact deduplicates; stage/note persist |
| J6 | Add version/ownership/retry/restart regression checks | Required integration cases pass against isolated DB; no hidden skipped cases |
| J7 | Run complete browser journey on desktop/mobile and configured preview | Real API/worker journey executed; traces/screenshots and DB assertions recorded |
| J8 | Run bounded live Gemini preview check when configured | Actual model/usage/report evidence, or explicitly pending with reason |
| J9 | Document notification boundary and remaining Step 7 work | No required feature disappears; live email and unresolved decisions remain visible |
| J10 | Review diff, verify checks, update status and handoff | Evidence distinguishes code implemented, deterministic E2E verified, live verified, and pending |

Fix narrow blockers discovered in these tasks. For broader missing features or visual redesign requests, record a named Step 7 follow-up instead of silently expanding this step.

## 9. Verification commands and environment

Retain the project's existing checks:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Document additional worker/provider-harness and test-seed commands actually introduced. Configure the required test-only DATABASE_URL/opt-in guard, APP_ORIGIN, cookie secrets, E2E_BASE_URL, and E2E_QUESTIONNAIRE_ID privately. Never dump environment files. Do not use normal development/production databases for destructive fixture setup.

Tests must fail if essential preview/provider-harness configuration is missing; no green run with all end-to-end cases skipped. Poll for observable completion within explicit time limits rather than arbitrary long sleeps. Clean up only task-owned disposable data and processes.

## 10. Out of scope

- Brand/UI redesign, new marketing copy, custom visual questionnaire builder, payment/booking implementation, or changing Q5/Q9 scoring assumptions.
- Building every future feature, full provider-quality evaluation, load testing, all operational disaster scenarios, or declaring production launch readiness.
- Broad package upgrades, a second backend framework, replacing Payload, or merging/deploying to production simply because tests passed.
- Inviting users, contacting leads, sending unapproved live messages, or enabling retention deletion.

## 11. Definition of done

One real published questionnaire can be completed in the configured preview, answers persist and resume, its worker produces a valid report from the exact submitted inputs, and the contact action creates a correct admin-visible lead. Repeatable automated coverage proves the internal path with external providers controlled only at their boundary. A separate live Gemini check verifies the actual provider integration when configured.

If live credentials or external preview access are missing, report **automated internal journey verified; live/preview check pending**. Leave this spec active rather than moving it to done while required acceptance remains incomplete. Current UI refinements may continue; do not block on final Figma designs.

## 12. Evidence record — fill during implementation

| Item | Result |
| --- | --- |
| Branch/revision and preserved work | Reconciled against repository records at `2891209`; the historical CI record names `master`. The runtime evidence does not record an exact journey source revision. Existing moves of Steps 3–5 into `done/` are preserved. |
| Step 5 prerequisites verified | The 2026-09-14 records report Docker 29.7.2, PostgreSQL 16.11, 12 migrations, repeat-safe seed, first-admin bootstrap with overwrite refusal, and healthy web/worker. Backup restored into a separate verification database with matching recorded counts. Older Step 5 pending browser/CI entries are superseded by V1 scope's later entries. |
| Test questionnaire UUID/version and fixture case | `tests/completeJourney.integration.test.ts` creates and publishes an isolated 16-question copy of the foundation definition, then saves all 16 fictional answers. It asserts the submitted snapshot, the exact published version ID, and the created run ID. |
| Unit/integration/E2E counts and commands | On 2026-09-14, `npm run typecheck` passed. The provider-controlled complete journey passed alone (1 passed, 1 skipped; 15.1s), and the clarification journey passed alone (1 passed, 1 skipped; 18.7s). The whole integration suite, unit suite, build, and browser journey were not rerun after this change. |
| Web/worker/DB image/process setup | Recorded image `workflow-health-check:preview-local-20260914`, digest `sha256:cab162443ba912e074431d68498c735d731d98317b57adc24bac943312b2b822`; separate migration, web, and worker roles in `workflow-health-preview`. No live provider credentials supplied in the recorded run. |
| Run/report/lead linkage evidence | The complete-journey test proves the submitted 16-answer snapshot becomes one persisted report through six fresh `worker --once` processes. It asserts project 0/0, people 1/22 normalized, admin 0.05/1, and friction 0.25/5; report evidence cites the submitted Q11 text. Duplicate contact requests create one linked New lead with the exact run ID; its contacted stage and note persist through Payload. |
| Mobile/desktop/accessibility results | Recorded 390px mobile landing/form accessibility and overflow smoke checks passed, plus questionnaire noindex and private-route checks. Complete desktop/mobile journey, keyboard, clarification, results, and contact accessibility evidence remains outstanding. |
| Version, ownership, duplicate, restart checks | Existing integration tests cover private access, stale/duplicate answer writes, and duplicate submit. The complete journey executes every outbox stage in a fresh process, and the clarification test rejects a second response while recording exactly two evaluation attempts. The J6 fixture also reclaims an expired deterministic-score lease in a new worker process. Publication version pinning across a content change and review-edit snapshot proof remain pending. |
| Provider-stub vs live Gemini evidence | Test-only Gemini and narrative transports require both `NODE_ENV=test` and `RUN_INTEGRATION_TESTS=true`; no HTTP input can enable them. The passing complete scenario validates grounded AI output and narrative persistence; the clarification scenario persists one prompt/response then completes. Terminal provider failure retries three times and persists a usable partial report without leaving work queued. Live Gemini remains pending. |
| Notification/email scope verified or deferred | Request acceptance is recorded locally. Report-ready transport capture, grant journey, and live Resend sender/inbox delivery are not verified. No actual email delivery is claimed. |
| Preview endpoint/access and results | Local Compose preview `https://localhost`; disposable-only certificate override used for browser checks. External protected preview remains unverified. |
| Open issues and Step 7 task list | Finish the Step 6 provider-controlled complete journey and regression evidence below. Step 7 follow-up: report-ready email delivery and private-link recovery, including configured live sender/recipient validation and any unresolved delayed-clarification behavior. |

### Remaining Step 6 acceptance work

- [x] J1/J3: exact submitted snapshot and publication/run linkage are covered; CMS publish/version pinning across a content change, review correction, and acknowledged-save retry remain.
- [x] J2/J4: test-only provider transport drives the real API, PostgreSQL outbox, and separate worker through full report persistence; the complete and one-clarification cases assert grounded output and known scores.
- [x] J5: duplicate contact capture creates one lead linked to the run; lead stage and notes persist. Separate authenticated-admin browser evidence remains with J7.
- [x] J6: expired-lease recovery and three terminal provider retries are covered. Terminal failure completes with a usable partial report instead of leaving the assessment pending.
- [ ] J7: run the complete required journey on desktop/mobile with keyboard/accessibility checks and no skipped required scenarios; the existing two CI smoke tests do not close this item.
- [ ] J8: perform the bounded live Gemini check when authorized/configured; record model, usage, and run evidence or retain an explicit pending status.
- [ ] J9: prove notification-request separation from leads and capture report-ready transport behavior; retain live inbox delivery as a Step 7 follow-up.
- [ ] J10: consolidate verification artifacts, exact revisions and counts; close Step 6 only when its required acceptance is satisfied.

Next bounded task: J1/J3, publish a harmless version change and prove a pre-existing submission remains pinned to its original version after a review edit. Missing live keys do not block this automated internal work.

The implementing model's final response should state what changed, what ran and passed, what remains pending, and the next bounded feature task. A successful build or a screenshot of a report is not sufficient evidence for this step.
