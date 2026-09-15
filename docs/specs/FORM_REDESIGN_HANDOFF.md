# Assessment UI/UX redesign — implementation handoff

Prepared: 2026-09-15. Status: agreed design direction; implementation pending. This session produced a plan only. Use with [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## 1. Objective and approved decisions

Redesign the whole public assessment experience into a calm, accessible, cohesive flow while retaining its real saved-answer, worker, report, and lead behavior. This is a bounded UI feature after the Step 6 journey work, not a replacement for that work.

The owner confirmed these decisions during the grill-me interview:

| Decision | Approved direction |
| --- | --- |
| Scope | Questions, review, processing, clarification, results, and contact, including their loading/error/confirmation states |
| Landing page | Separate task; Image #2 supplies visual direction only |
| Entry | New visitors go directly to question 1; returning visitors with an unfinished assessment see a resume prompt |
| Navigation | Explicit Next; selecting a radio never advances automatically |
| Layout | Centered white panel up to 640px wide on pale gray desktop canvas; full-width white mobile layout with comfortable gutters |
| Choices | Radio rows in one column; multi-select may use two columns when labels fit, one on narrow screens |
| Progress | “Question 3 of 16,” derived from actual question position/count, slim green track, category above question |
| Review | Answers grouped by category with Edit; saving an edit returns directly to review |
| Brand | Keep Workflow Check; use the reference's restrained wordmark styling |
| Results | Up to two existing priority areas with explanation and practical next step, followed by optional contact CTA |
| Commercial scope | Preserve free flow; no checkout, paid tier, all-category dashboard, or six-question reduction |
| Theme | Prepare for future dark mode through semantic tokens; implement and verify light mode now |

## 2. Reference interpretation

Primary reference: supplied `IMG_1602.png` (questionnaire montage). Secondary: `IMG_9913.png` (landing page). Original local paths are `C:/Users/kules/Downloads/IMG_1602.png` and `C:/Users/kules/Downloads/IMG_9913.png`; these are not repository assets. Attach them again if the implementing environment cannot access them. The written system and decisions here remain usable without those files.

Adopt white surfaces, dark regular-weight headings, blue category eyebrows, slim green progress, pill buttons, pale-green selected choices, outline markers, and generous spacing. Use restrained overlapping green/blue circles only on suitable completion/empty areas; keep question controls clear. These are separate screen examples, not an eight-card page.

Follow the precise tokens in DESIGN_SYSTEM.md. Keep its Arial/Helvetica stack for this task. Do not infer a brand rename, payment requirement, testimonial, timing promise, fixed six-step flow, 10-point score scale, or live email delivery from the screenshots. Existing report maximum points and status are authoritative.

## 3. Repository inspection and preservation boundaries

Before changes, read `general.md`, `AGENTS.md`, `typescript-react-guidelines.md`, DESIGN_SYSTEM.md, and the current completed Step 6 evidence at `docs/specs/done/STEP_6_COMPLETE_JOURNEY_HANDOFF.md`. Read installed `node_modules/next/dist/docs/` guidance for layouts, route groups, styling, and any affected APIs before coding. Recheck all paths, branch/status, and active changes.

At planning time the owner has uncommitted provider, job, provenance migration, integration/browser test changes, and a move of Step 6 to `done/`. Preserve these. The Step 6 record now reports completed functional acceptance and live-provider evidence; earlier conversation statements that Step 6 is incomplete are stale. Do not rerun paid provider calls to validate styling.

| Existing entry point | Relevant work |
| --- | --- |
| `components/Assessment.tsx` | Screen orchestration, initialization/resume, save/progress, review, processing, clarification; preserve adapter calls and concurrency semantics |
| `components/QuestionField.tsx` | Native radio/checkbox/text controls, limits, exclusivity, Other fields; improve visuals and accessible feedback |
| `components/ResultsView.tsx` | Existing report variants, priority rendering, notification and contact entry |
| `components/ContactStep.tsx` | Validation, request idempotency, field preservation, contact completion |
| `components/PrivateReport.tsx` | Private report entry and unavailable/access states; reuse report styling without adding edit authority |
| `app/(frontend)/layout.tsx` | Currently wraps public pages with shared header/footer; avoid duplicate assessment branding or changing landing appearance |
| `app/(frontend)/q/[id]/` and `report/[token]/` | Route shells and metadata; keep noindex and existing access behavior |
| `app/globals.css` | Older global styles; migrate assessment styles with scope rather than changing every generic button/main/heading |
| `lib/assessment/` | Domain contracts, real HTTP adapter, validation; reuse, do not replace with a UI mock |
| `lib/formatAnswerForReview.ts` | Inspect available formatter before implementing review answer summaries |
| `tests/previewJourney.spec.ts`, `tests/completeJourney.integration.test.ts` | Concurrently updated Step 6 coverage; inspect latest scenarios before extending |

Observed UI gaps: review currently renders “Answered” instead of actual values; Edit sets the question index but lacks explicit return-to-review intent. Initialization automatically resumes; Back changes local position and clears draft state, so unsaved-edit behavior needs explicit treatment. Contact completion currently closes the form without a dedicated confirmation. Address these narrowly in this feature.

## 4. Screen and behavior specification

### Entry and resume

- New session opens question 1 after a clearly labelled loading state; do not add a welcome gate.
- Offer “Continue your assessment” for a saved in-progress response with meaningful saved progress. Show an appropriate question/category summary, a primary Continue action, and a quiet link back to the site. Do not add a destructive Start over action or another backend session mechanism.
- Show this prompt on fresh entry, not every Next/Back or internal screen transition. Continue preserves the original published version, answers, and progress. Do not pair a resumed version's answers with the latest publication's definition.
- Completed/processing/awaiting-clarification sessions resolve to their appropriate existing state rather than an editable-question resume prompt. An empty response created before the first answer should not create a confusing resume gate.
- Loading failures show Retry with actionable wording; unavailable content stays neutral. Retry must not duplicate a submission.

### Question and navigation

- Compact header with Workflow Check at the start and progress/count at the end; category eyebrow immediately before the question heading. Exactly one visible main landmark and primary heading per screen.
- Show required/optional and selection instructions as quiet helper text. Keep CMS prompt, order, option keys, limits, and scoring untouched.
- Single choice: minimum 48px rows, native radio, 20px marker, 12px icon/text gap, pill corners for short labels. Selected state combines green marker, green border, and pale-green fill.
- Multi choice: native checkboxes, minimum 56px rows when multiline, 12px corners. Maintain source/DOM order in all grids. At the limit show “You can choose up to N options”; selected values remain removable and exclusive options remain usable.
- Other detail appears with a persistent label and associated validation. Textareas use 16px text, at least 144px initial height, and vertical resizing.
- Next validates and waits for acknowledged persistence before advancing. Prevent repeated navigation/submission while a save is pending; no new autosave mechanism or false “Saved” claim is required.
- Back must not silently discard edits. Recommended implementation: retain local drafts by question key during navigation, restore them on return, and flush/validate outstanding edits through existing mutation APIs before review/final submission. Reconcile revisions sequentially. Do not write invalid/incomplete required answers merely to allow Back. Explain that unacknowledged drafts are not yet saved; do not store private answers in new browser storage.
- Preserve server conflict/retry behavior. Surface conflicts explicitly; do not silently overwrite a newer server revision with a local draft.
- At first question omit Back or render it consistently disabled; no unexpected exit action. Keyboard Enter must not accidentally submit the whole assessment or advance a textarea. Preserve native radio arrow/Space behavior.
- Place actions below content; use flexible vertical spacing for a stable baseline on roomy screens, natural document scrolling on short screens. No fixed-height clipping or keyboard-obscuring footer. Save feedback can occupy its own line on narrow screens.

### Review and edit

- Group by published category order. Show actual human-readable selected labels, free text, Other detail, and explicit optional “Skipped” states; reuse the existing formatter where possible.
- Edit has a specific accessible name. Record return-to-review intent separately from question position. In edit mode use “Save and return to review”; after acknowledged success return to the edited answer and restore focus appropriately.
- Cancel edit returns to review without changing the saved answer; warn/confirm only if it would discard a changed local draft. Normal Back navigation retains drafts as above.
- Review remains readable at 640px; allow up to the design system's 800px report/review width on larger screens if needed. Keep final submission separate from editing controls and prevent duplicate logical runs.

### Processing and clarification

- Processing uses calm text and a small accessible activity indicator, backed by actual status polling. Do not invent progress percentages, timed completion, or claims that a report has finished.
- Clarification reuses the question shell and textarea, with “One extra question” or equivalent distinct label; no change to the original question-count denominator and no second follow-up loop.
- Preserve response on failure and offer Retry. Differentiate pending/partial/insufficient/failure states using real contract values. Respect reduced motion and avoid repetitive live announcements.

### Results, notification, and contact

- Show up to two backend-selected priorities in order. Each includes category, actual points/maxPoints, explanation, and visually quiet practical next step. Keep supported healthy results and honest incomplete/unknown states.
- Use design-system cards, restrained notices, and typography. No extra category requests, fabricated narratives, or score recalculation in the browser.
- Keep optional report-ready notification separate from the contact lead. Display a success message only on successful request acknowledgement; preserve address and retry on failure. Capturing a request does not prove inbox delivery.
- Contact stays optional after visible results. Keep required email and optional name/message; preserve normalization and the same logical idempotency key across retries.
- After acknowledged contact success show a concise confirmation such as “Your request has been sent,” with a Back to results action. No invented response-time guarantee. Preserve report context, focus, and prevention of duplicate request submission.
- Private-link report entry reuses the same report components while retaining its restricted permissions. Unavailable links reveal no private content.

## 5. Shared components and future dark mode

Extract focused presentational primitives only where reused: assessment shell/header, action button/link variants, progress, choice row, field help/error, status notice, and report card. Keep data ownership and side effects in the existing orchestration/adapters. Avoid replacing the entire state architecture or introducing a new component framework.

Use semantic CSS variables for background, elevated surface, text, muted text, controls, borders, selection, focus, disabled states, status colors, shadows, and decorations. The implementation may use CSS Modules or an explicit assessment root scope. One token definition owns each color; component rules do not contain light-specific white/black literals, color inversions, or inline hardcoded fills. SVG icons inherit currentColor.

Provide a clear theme override boundary (for example an assessment root with `data-theme="light"`) and document where a future dark token map would attach. Do not read system dark preference or add a toggle, storage, dark palette, or claim dark-mode support in this release. Separate surface and action semantics even when current values coincide, so later dark adaptation does not require component rewrites. Solid-button foreground is a separate token from surface background; decoration opacity and shadows are tokenized too.

Keep landing and Payload admin visually unchanged. If the shared public layout prevents an isolated assessment shell, make a small route-layout separation using documented Next conventions; preserve URLs, metadata, and shared assets. Verify there is no duplicate header/footer, nested main, or route-wide hydration regression. Avoid fragile pathname-dependent hiding of the entire page chrome through ad hoc selectors.

## 6. Ordered implementation tasks

Work on a scoped branch/worktree. Recheck Ralph availability as required by repository instructions; if absent, record it and use a bounded implement/check/fix loop. Limit each task to three fix/check attempts before reassessing a repeated failure. Save reviewable progress without staging unrelated edits.

| ID | Task | Acceptance |
| --- | --- | --- |
| U1 | Inspect current Step 6 state, UI, tests and CSS; record baseline | Exact revision, preserved edits, existing failures and current screenshots recorded |
| U2 | Add scoped semantic tokens and assessment shell/primitives | Light theme matches design system; future override boundary documented; landing/admin unchanged |
| U3 | Redesign all question types and navigation/save feedback | Responsive controls, explicit Next, limits/Other/keyboard behavior, no lost drafts |
| U4 | Add entry/resume and review-edit experience | Correct version/route restoration, actual answer summaries, direct saved return to review |
| U5 | Style processing, clarification, report and contact states | Genuine statuses, two-priority result, notification separation, acknowledged contact confirmation |
| U6 | Run behavioral and visual verification; fix scoped regressions | Real persistence journey passes plus representative desktop/mobile screenshots and accessibility checks |
| U7 | Review diff and update this record and design system if needed | Evidence, limitations and exact run instructions; move this handoff to done only after acceptance |

Implement U2/U3 first and inspect screenshots before propagating the primitives through every screen. This is a visual checkpoint for the implementer, not a requirement to stop for user approval of routine decisions.

## 7. Verification and acceptance

Use the existing npm lockfile and project runtime. Read the current package scripts and Playwright/integration setup; use existing isolated provider harnesses. Ordinary checks must make no live Gemini/Resend calls. Never point fixture-writing tests at customer data.

Run format, lint, typecheck, unit tests, relevant integration regressions, production build, and configured browser tests. Record each exit code and test count separately. Preserve known baseline failures in the record; repair only redesign regressions unless an independent fix is authorized. Update selectors to meaningful labels/roles when copy changes; do not weaken assertions or skip the required path to obtain a pass.

Minimum evidence:

- [ ] Fresh entry, unfinished resume, completed/private-report entry all show the correct screen/version.
- [ ] Single/multi/text/Other controls work by keyboard; selection limit and exclusivity produce clear feedback.
- [ ] Next waits for save; failed save retains values and Retry succeeds; Back/forward retains local drafts.
- [ ] Review shows actual values; edit/save returns directly; revised value reaches the real frozen submit snapshot.
- [ ] Reload restores acknowledged answers; duplicate submit/contact remains one logical action.
- [ ] Processing, one clarification, complete, healthy, insufficient, partial/pending, failure and unavailable states are covered using existing test harnesses where appropriate.
- [ ] Contact invalid email/failure/success and optional notification feedback are verified without external delivery.
- [ ] Complete real API/DB/worker journey still passes with controlled external transport; private access remains denied.
- [ ] Screenshots at 390px and 1280px include radio, dense multi-choice, textarea/Other, review, clarification, results, contact and key errors. Check 320px and 768px for layout behavior too.
- [ ] Keyboard focus survives screen transitions; progress and save messages have meaningful semantics; no hidden-input focus loss.
- [ ] Axe checks on representative screens, manual contrast/focus checks, 200% text zoom, reduced motion, long labels and mobile keyboard/short viewport checks pass without clipped controls or horizontal scrolling.
- [ ] Landing/admin screenshot comparison shows no unintended visual changes; question/report noindex remains intact.
- [ ] Component colors use semantic tokens; light-only theme boundary is documented; no partial automatic dark mode.

Do not use static report fixtures as proof of the real workflow. Isolated visual fixtures can supplement layout coverage only when clearly distinguished from full integration evidence and never exposed through public scenario switches.

## 8. Execution record

| Item | Evidence |
| --- | --- |
| Implementation revision/branch and preserved work | `9154b51` on `master`; existing provider/job/migration changes were retained. Ralph was not present in the repository, so work used a bounded implement/check/fix loop. |
| Baseline checks and screenshots | Baseline inspected from the current public components and existing opt-in Playwright flow. New visual screenshots still require a configured questionnaire and preview runtime. |
| Token/component/layout changes | Added scoped `data-theme="light"` assessment tokens and questionnaire/report primitives in `app/globals.css`; the future dark map attaches to the same scope. |
| Save/resume/review-edit behavior | Question drafts remain in component state across Back/forward; acknowledged saves advance; saved in-progress sessions show a resume prompt; review renders formatted answer values and edited saves return to review. |
| Unit/integration/browser counts and exit codes | `npm run typecheck` exit 0; `npm run lint` exit 0; `npm test` exit 0 (14 files, 36 tests); targeted Prettier check exit 0. `npm run build` compiled, then stopped while collecting API routes because the local `.env.local` has no valid 32-character `PAYLOAD_SECRET`; this is an environment prerequisite, not a redesign compile failure. Full integration/browser runs remain environment-dependent and were not run against a live provider. |
| Mobile/desktop visual and accessibility evidence | CSS includes the 640px assessment breakpoint and native fieldset/radio/checkbox semantics. Configured Playwright visual capture remains pending. |
| Landing/admin isolation and private-route checks | Assessment styles are class-scoped; landing and Payload component rules were not changed. Existing route metadata/access behavior was retained. |
| Theme-readiness review | Components use assessment semantic variables with `data-theme="light"`; no system preference, persistence, or dark palette was added. |
| Remaining limitations | The public parent header/footer still wrap assessment routes, and historical-version questionnaire projection needs a dedicated session-aware endpoint before a resumed old version can be rendered independently of a newer publication. Do not move this handoff to `done/` until the configured visual and full real-journey checks pass. |

## 9. Prompt to hand to the implementing model

> Implement `docs/specs/FORM_REDESIGN_HANDOFF.md` using `docs/specs/DESIGN_SYSTEM.md` and the attached references. Follow the confirmed scope and decisions. Inspect and preserve the current Step 6 work before changes. Implement the whole assessment UI, including resume, review editing, real processing/report states and contact confirmation; retain existing persistence, permissions, scoring and idempotency. Keep Workflow Check branding, the free flow, and a light theme with semantic tokens ready for future dark mode. Leave landing redesign separate. Complete the ordered tasks with visual, accessibility and real-journey verification, and record actual evidence and any remaining blockers in the handoff.
