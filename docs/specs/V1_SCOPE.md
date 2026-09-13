# Step 2: First-release scope

Status: Step 2 scope established. The agreed first release uses basic Payload admin fields and a flexible operating budget. Acceptance criteria below make that scope reviewable; the suggested experiment checkpoint remains a planning recommendation. This document feeds the future master plan, alongside [SCORING_REFERENCE.md](SCORING_REFERENCE.md) and [AI_RUBRIC_INITIAL.md](AI_RUBRIC_INITIAL.md).

## Purpose and audience

Launch a small working assessment to test whether creative professionals recognize the workflow problems it identifies and want help fixing them. The first questionnaire targets producers, artists/musicians, DJs, songwriters, managers, and other creative professionals. The underlying application must support additional questionnaires without development for ordinary content changes.

Customer demand and willingness to pay are unvalidated. The user has chosen a public app experiment instead of waiting for pre-build customer interviews. This release should gather evidence, not claim the assessment is scientifically validated or make the full consulting offer final.

## One core journey

1. A visitor arrives on the simple landing page and starts its linked questionnaire, or opens a published questionnaire directly at its random UUID URL.
2. They answer one question at a time, without registration or an email gate. Progress is saved to the database and can resume in the same browser.
3. After the main questions, Gemini evaluates the open answers with relevant context and asks one targeted clarification if necessary.
4. The app calculates scores and displays up to two categories needing attention, with personalized explanations and a practical first step. It can report no major issues when the completed evidence supports that outcome.
5. The visitor optionally submits their email, name, and message through a configurable CTA to request further contact.
6. The admin reviews the assessment and manages the resulting lead in Payload.

If AI processing fails after retries, deterministic results remain available. The visitor can optionally request a Resend notification when the report is ready; its private expiring link works on another device.

## Included in the first release

### Landing page and visual direction

- Include one simple landing page that introduces the service and assessment, explains who it is for and how it works, and links to the questionnaire. It also serves as the introduction for visitors arriving through the homepage, avoiding a redundant introduction step.
- Edit landing-page content through basic Payload admin fields: headline, supporting copy, audience section, how-it-works steps, primary button label, and a relationship selecting its published questionnaire. Resolve the button destination from that questionnaire's stable UUID URL.
- Include editable page title and meta description. The public landing page is indexable; questionnaire pages, draft previews, and private results remain noindex.
- Use a fixed minimal layout for V1, with neutral colors, one accent color, readable typography, generous spacing, and subtle accessible transitions. Provide responsive mobile and desktop layouts.
- Publishing landing-page content updates the served page without a code deployment; refresh any generated/cached public content. Landing-page edits do not change a submission's questionnaire version or historical assessment.
- Full Figma designs and the resulting visual redesign are planned for V2. No general-purpose visual page builder is needed for V1.

### Questionnaire experience

- Seed the supplied questionnaire: six categories and 16 core questions, with Q13 expanded to ask how the situation was handled and what changed. Final wording remains editable.
- Single choice, multiple choice, open text, per-question required/optional settings, selection limits, exclusive choices, and required text for configured options.
- Everyone sees the same core questions. Business context informs AI interpretation, not branching of the main questionnaire.
- A minimal responsive React interface with one question per screen, Back navigation, progress, autosave, and a review step. Animation must support reduced motion and usable keyboard navigation.
- Persist each answer as the respondent progresses. Show save failures and permit retry; a failed save must not be presented as completed persistence.
- Same-browser resume without an account. The public questionnaire identifier is not a credential for accessing answers.
- All questionnaire pages, including admin-only drafts and live forms, and results pages are noindex and absent from sitemaps.

### Scoring and report

- Reusable backend scoring strategies configured per question. Implement the initial questionnaire's single-choice values, count curves, weighted penalties, quality-and-quantity scoring, and grouped AI rubric. Unscored/context-only questions contribute no points.
- Keep Q5's supplied option values and agreed 60/40 formula plus head-only override. Keep Q9's manual-task count approach. Their alternative designs remain review TODOs, not launch replacements.
- CMS-configurable weights, 20-point category maximums, and below-60% attention thresholds.
- AI evaluates Q11–13 together with the five-level initial rubric and can affect results without human review. Relevant unscored answers inform the analysis.
- One targeted follow-up after the main questionnaire when needed. Persist the follow-up and response. Still-insufficient evidence produces no numeric AI score.
- Coverage rules remain in scope. Not-applicable answers are excluded from expected weight; missing/insufficient evidence is not zero. Withhold categories that fail the configured minimum coverage and exclude them from priority selection. The initial threshold is still to be settled.
- Gemini selects up to two eligible categories using scores, impact, and context. Show only those priority categories with personalized advice in the initial full report.
- Do not force a negative finding. Distinguish a completed “No major issues identified” report from incomplete analysis.
- Retry transient AI failures, then expose deterministic results and pending AI status. Continue/retry processing in a way that can complete the promised notification.
- Record scores, rubric/model/prompt versions, evidence, and scoring runs for review. Recalculation creates a new run.

### CMS, submissions, and leads

- One Next.js application: public React frontend and private Payload admin, with PostgreSQL, Gemini, and Resend. Deploy on the user's VPS in Docker.
- One authenticated admin role.
- Create/edit questionnaire content, categories, options, validation, scoring settings, rubrics, and result/CTA configuration through CMS fields. Ordinary edits and new questionnaires require no code deployment or database schema changes.
- Use basic Payload admin fields initially. Custom visual/drag-and-drop questionnaire building is deferred. Question content, scoring configuration, rubrics, validation, and publishing remain editable through the basic fields.
- Draft/publish workflow and version history. Published versions are immutable, including nested questions, options, and scoring settings. Changes are published as a new version.
- A stable random UUID URL per questionnaire serves the latest published version to new submissions. Existing submissions retain their starting version. No disabling/blocking feature and no dedicated test-submission mode.
- Browse/filter submissions and inspect answers, follow-ups, results, scoring history, completion status, and AI status. Historical respondent data and scoring results are read-only in admin; internal notes and lead status are editable.
- CTA fields: required email, optional name, optional message, linked to the assessment.
- Pipeline: New → Contacted → In progress → Closed.
- An email collected only for delayed-report notification does not create a sales lead. Notification must not imply sales consent.

## Acceptance criteria

These are the proposed reviewable conditions for accepting the agreed features. Detailed test design belongs to implementation planning.

| Area | Required observable outcome |
| --- | --- |
| Landing page | The admin can edit landing copy, page metadata, and the linked published questionnaire through Payload. Published changes appear without deployment, and the start button opens the selected form on mobile and desktop. |
| Main journey | A visitor can complete the seeded questionnaire on mobile and desktop, receive a report, and submit the CTA without an account. |
| Persistence | Every acknowledged saved answer survives reload. Same-browser resume restores answers and the correct published version. Failed saves are visible and recoverable. |
| Validation | Exclusive options cannot coexist with other selections; configured text and selection limits are enforced by the backend as well as the UI. |
| Scoring | Worked examples in the scoring reference produce their documented results. All numeric scores stay within 0–1 before category scaling. Missing evidence and not-applicable answers follow their separate rules. |
| AI | A supported answer receives one of five rubric scores; vague evidence triggers at most one clarification; continued insufficiency does not become zero. Structured output is validated. |
| Report | Only eligible priorities are selected; no unsupported customer-specific claims are invented. Incomplete analysis is distinguishable from a healthy completed result. |
| Failures | Simulated Gemini failure exercises retries, deterministic fallback, and optional notification. A notification opens the correct report through a private expiring link. Retries do not create duplicate leads or duplicate logical result notifications. |
| Versioning | Publishing changed content preserves existing submissions and historical results while new submissions use the new version. |
| CMS | The admin can change ordinary question content and scoring settings and publish without a deployment. Draft content is not publicly accessible. |
| Privacy/access | A public questionnaire UUID cannot retrieve another visitor's submission. Drafts and admin operations require admin authentication; private report access requires a valid credential. Secrets remain server-side. |
| Lead handling | CTA submission creates a linked New lead, editable through the pipeline. A report-notification email request alone does not. |
| Discovery | Draft, live questionnaire, and results pages carry noindex directives and are excluded from sitemaps. Noindex does not substitute for authorization. |
| Delivery | The application and PostgreSQL run in Docker on the VPS. Before inviting users, verify basic logging, request/AI abuse limits, backup and restore, and recovery from a restart. |

## Success measures: proposed initial experiment

Launch success means learning whether the assessment is completed, useful, and leads to interest in help. It does not mean proving demand solely from page views or a handful of submissions.

Proposed observation window: review after the first 20 genuine assessment starts, or four weeks after initial distribution, whichever comes first. This is a review checkpoint, not a statistical validation claim or a build deadline. If there is little traffic, review distribution before interpreting missing conversions as a product failure.

Track a small set of first-party aggregate events and operational counters; do not put answer text, email addresses, or private report tokens into analytics logs.

| Measure | Definition | What it helps decide |
| --- | --- | --- |
| Starts and completion | Started submissions; proportion completing core answers | Whether visitors will engage and finish |
| Drop-off by question | Last reached/answered question on inactive unfinished submissions | Which questions or interactions need revision; choose an inactivity window before reporting |
| Report delivery | Completed usable reports / completed core questionnaires | Whether AI and result delivery are reliable |
| Processing | AI failures, retries, duration, and usage/cost per completed assessment | Whether performance and operating cost fit the budget |
| CTA interest | Unique submissions providing CTA contact details / unique submissions viewing results | Whether the findings motivate a next step |
| Lead quality | Admin notes from subsequent contact, if any | Whether reported problems are actionable and customers want assistance |

**Deferred optional enhancement:** add “Was this useful?” with Yes/No and optional feedback after results. This is not required for the initial journey. Initially, use voluntary follow-up conversations, when available, to assess usefulness; completion and CTA conversion alone do not establish diagnostic accuracy.

Do not set arbitrary conversion targets before observing an initial baseline. At the review checkpoint, decide whether to improve questions, revise the report/offer, seek a narrower audience, or continue the experiment. Separate no demand from insufficient distribution and technical failure.

## Budget and delivery constraints

- Hosting: existing VPS, Docker, and PostgreSQL are agreed.
- Incremental operating budget: **flexible**, per the user; no fixed monthly cap is required to finish scope definition. Monitor usage and cost during validation. This is not blanket authorization for paid purchases or service upgrades.
- Build deadline or development-effort budget: not specified. Plan by the smallest complete journey until a constraint is supplied.
- Set appropriate request limits, AI usage monitoring, and cost controls before public distribution; choose concrete values during technical design and model selection.

## Explicit exclusions and deferrals

- No checkout, payment processing, scheduling integration, or fixed paid-service package. V1 ends at contact capture and admin follow-up.
- No customer accounts, client portal, multiple admin roles, or external CRM integration.
- No general cross-device unfinished-form resume; the exception is the agreed private completed-report link in notification email.
- No conditional branching of core questions. The single AI clarification remains included.
- No dedicated test mode or test/real submission flag, and no blocking/disabling questionnaire workflow.
- No expanded personalized report for every category, on-demand AI category details, benchmarking, or automatic implementation of workflow fixes.
- No separate Vite frontend or Python backend.
- No changes to Q5/Q9's underlying scoring assumptions in this release; keep their review TODOs and examples.
- A custom visual questionnaire builder is deferred. Basic Payload CMS editing and publishing are included in V1.
- Full Figma-led visual redesign is deferred to V2. V1 includes a minimal landing page and questionnaire design with structured CMS content fields, not a general-purpose page builder.
- Architecture/APIs, screen prototypes, implementation, and production readiness evidence belong to subsequent steps. This scope document does not claim they are complete.

## Remaining decisions and master-plan TODOs

### Step 2 decisions

- [x] Operating budget is flexible; no fixed monthly cap at this stage.
- [x] Use basic Payload editor fields for initial launch; defer the custom visual builder.
- [x] Define one core journey, acceptance criteria, validation measures, and release exclusions.
- [ ] Revisit the recommended experiment checkpoint when planning distribution; it is not a scope blocker.

### Detailed design decisions before the affected feature is built

- [ ] Finalize minimum coverage, Q7's last option score, and final rubric/question wording; see the scoring reference.
- [ ] Set Gemini model, retry/backoff rules, background recovery, and handling of pending clarification during notification recovery.
- [ ] Specify retention, report-link expiration, cookie/session lifetime, backups, and operational ownership.
- [ ] Define access rules, data schema, APIs, job processing, and draft/published snapshots in Step 4.
- [ ] Decide how the first questionnaire link will reach potential respondents. Noindex forms need deliberate distribution; a launch audience is not yet available.
- [ ] Preserve Q5/Q9 review examples, coverage review, and rubric calibration TODOs in the master plan.
- [ ] Consider a lightweight optional usefulness prompt after observing the initial journey.
- [ ] Revisit a custom visual builder after basic CMS editing has been used for real questionnaire changes.
- [ ] In Step 3, prototype the landing page and questionnaire journey, including mobile, loading, validation, saving errors, AI clarification/failure, no-major-issues results, and contact confirmation.
- [ ] In V2, apply the user's planned Figma designs across the public experience.
- [ ] Consolidate the final master plan after Step 2 decisions, with subsequent steps and explicit release gates.

### Preview and initial-launch verification

- [ ] Install/enable Docker, run the disposable PostgreSQL stack, and record migration, seed, first-admin bootstrap, worker-heartbeat, restart, and persistence evidence.
- [ ] Build and inspect the tagged production-style image; verify the migration, web, and worker roles run from that same image.
- [ ] Run the configured-preview browser smoke suite with `E2E_BASE_URL` and a published `E2E_QUESTIONNAIRE_ID`; record accessibility, noindex, private-access, and invalid-report-token results.
- [ ] Exercise save/resume, submit, clarification or AI fallback, notification, contact CTA, and worker restart recovery against the preview.
- [ ] Record the Docker Compose migration/restart check and an isolated database backup-restore rehearsal.
- [ ] Inspect a CI run on the repository default branch and record its run URL/identifier and Playwright result.
- [ ] Obtain authorized isolated external-preview access (host, origin, secret injection, protection, and owner), then record its protected URL and smoke-test result.
- [ ] Verify the sending domain, production secrets, backup destination, and named launch operator before inviting the first cohort.
