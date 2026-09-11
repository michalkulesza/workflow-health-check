# Step 3 handoff: workflow assessment prototype

## Instructions for the receiving model

Build a clickable browser prototype of the experience specified here. This document is self-contained: the original conversation is not required. Complete the prototype, run it, and verify the key journeys. Do not stop at sketches or a proposed plan.

**Scope is Step 3 only:** prototype the public experience with local fixture data and simulated services. Do not build production database persistence, Payload integration, authentication, Gemini calls, Resend sending, or deployment. Clearly report these as simulated in the developer README and handoff, without cluttering the customer-facing UI with implementation details.

Inspect the repository and any applicable agent instructions before changing files. Reuse existing foundations if present. At the time of writing, the workspace contains planning Markdown files and a Git directory, but no implemented application. Verify the actual state rather than assuming this remains true.

Use this specification as the baseline. Make reasonable reversible visual and implementation choices without another design interview. Record unresolved production decisions; do not silently treat them as settled.

## Product and current stage

The owner wants to help customers identify and fix workflow problems. There has been no customer validation yet. The first app is a small public experiment to learn whether people complete an assessment, recognize its findings, and request help.

The initial questionnaire targets creative professionals: producers, artists/musicians, DJs, songwriters, managers, and others. The eventual engine must support other audiences and questionnaires through CMS data.

Step 2 is complete enough to prototype. This step must produce a usable mobile and desktop experience before detailed system design and backend implementation. A full Figma design will come from the owner in V2. V1 needs a simple, consistent, pleasant interface now.

## Technical and design direction

- Use React, TypeScript, Next.js, and React Hook Form. The agreed production app will use Next.js with Payload and PostgreSQL; do not introduce a separate Vite or Python application.
- Prefer a small implementation with reusable components and typed fixture definitions. Choose styling/animation dependencies sparingly. No AI-generated images or complex illustration work is needed.
- Use neutral colors, one accent color, readable typography, generous spacing, and restrained transitions. Use a working name such as “Workflow Check” if a name is needed; keep it editable in fixture content.
- Implement responsive mobile and desktop layouts, visible focus states, semantic inputs, keyboard navigation, readable contrast, and reduced-motion support.
- Avoid invented testimonials, promises of guaranteed savings, fake customer counts, or claims of diagnostic validation.
- Keep content and questionnaire definitions separate from rendering logic so they can later come from Payload. The prototype is not an excuse to hard-code each question into its own page component.
- Local browser storage can simulate same-browser resume. It is not the production persistence solution. A production build will save answers to PostgreSQL and use private submission credentials.
- Supply a brief README with setup, run/build/check commands, scenario access, and the boundary between working UI and simulated services.

## Core journey

```text
Landing page → Questions, one at a time → Review answers → Analysis
                                                        ↓ if needed
                                                  One clarification
                                                        ↓
                                               Results → Contact → Confirmation
```

Visitors may also open the questionnaire directly. No account and no email gate are required to start, finish, or view results.

If analysis repeatedly fails, show available deterministic results with AI pending and offer an optional report-ready email notification. That email is distinct from the sales CTA.

## Screens and interactions

### 1. Landing page

Include:

- A short headline about identifying workflow friction and spending less effort on avoidable admin.
- Supporting text explaining what the assessment provides.
- Who it is for.
- Three short steps: answer questions, receive priorities, optionally get help.
- A primary “Check your workflow” button linked to the configured questionnaire.
- A clear statement that results do not require an email address.

The landing page doubles as the assessment introduction; do not add a redundant mandatory introduction screen after Start. A direct questionnaire visit should still provide enough context to understand the form.

**Future CMS requirement:** headline, supporting copy, audience section, how-it-works steps, button label, linked questionnaire, page title, and meta description must be editable through basic Payload fields. For this prototype, represent those as a typed landing-content fixture rendered through a fixed layout. Changing fixture content must not require editing component markup.

The public landing page is intended to be indexable in production. Questionnaire routes, including draft previews and live forms, and result routes are noindex and absent from sitemaps. Set route metadata appropriately in the prototype. Do not build an admin draft route solely to demonstrate this.

### 2. Question screen

- Exactly one core question is visible at a time.
- Show category context, question text, any selection instructions, progress, Back/Next controls, and save status.
- Use an explicit Next button; selecting an answer should not unexpectedly advance the screen.
- Preserve answers when going backward and when editing from review.
- Required/optional, text requirements, and selection limits come from the fixture definition.
- Use real radio/checkbox semantics with comfortably sized clickable option rows.
- Show a text field when a configured Other option is selected; require its text before proceeding.
- Exclusive options deselect other options; selecting another option deselects the exclusive one.
- A skipped optional answer remains distinct from a zero score, “None,” or not applicable.
- Progress should reflect the 16 core questions. Explain a clarification as one extra step, rather than unexpectedly changing the original total.
- Show Saving, Saved, and a recoverable save-failed state. Do not claim that an answer was saved when simulated persistence failed.

**Provisional fixture default:** require Q1–13 and Q16; make Q14–15 optional. This has not been chosen as final production configuration. All required flags must be data-driven and easy to revise.

### 3. Resume

- Refresh or leave and return in the same browser: restore the fixture version, saved answers, and a sensible current step.
- Provide a clear continue action when returning through the landing page. Do not silently create a new assessment over an unfinished one.
- The public questionnaire UUID identifies the questionnaire, not a private answer record.
- Local prototype storage can hold dummy answers. Do not implement arbitrary submission lookup based on a public questionnaire identifier and imply that it is secure.
- Include a development-only way to reset fixture progress so reviewers can repeat scenarios. This is not a customer/admin test-submission feature.

### 4. Review answers

- Show answers grouped by category, with edit actions returning to the correct question.
- Show skipped optional answers clearly.
- An edited answer is reflected on returning to review.
- Submit for analysis only after current required fields are valid and the simulated save has succeeded.
- Prevent duplicate submit actions while processing.

### 5. Analysis and clarification

- Provide calm, honest processing feedback. Do not show fabricated precise progress percentages for AI work.
- Simulate processing through a service adapter with bounded short delays; make review scenarios deterministic and quick to reach.
- If evidence is vague, ask one targeted clarification after all core questions. Display a short explanation of why it helps.
- Save the clarification answer and proceed to analysis again. Never loop into a second clarification.
- Provide a fixture for “still insufficient”: AI score is absent/unknown, not zero.
- Relevant answers from unscored sections influence example findings, but do not receive scores.

### 6. Results

Normal completed results show **up to two categories needing attention**, already expanded, with:

- Category name and score out of its maximum (default 20).
- A clear “Needs attention” label.
- A concise personalized explanation grounded in the fixture respondent's answers.
- One practical first step per priority.
- The configurable contact CTA.

Do not add collapsed cards for every other category, detailed AI reports for healthy categories, or on-demand AI expansion. Those designs were discussed and intentionally deferred.

Include fixtures for:

- Two priorities.
- One priority.
- A fully evaluated report with no major issues identified. Keep the optional CTA available and do not force a problem.
- Insufficient AI evidence. Explain the limit; do not confuse it with a healthy result.

### 7. AI failure and report notification

- Simulate a few failed attempts followed by fallback; the exact production retry policy is not yet finalized.
- Show deterministic results that are available and clearly mark AI analysis as pending. This is the agreed exception to the completed report's priorities-only presentation.
- Offer an optional email field and “Notify me when ready” action.
- Show invalid email, submitting, success, and recoverable failure states.
- Simulate notification signup only; do not send email or claim a real email was sent.
- Production will use Resend and a private expiring link that opens the completed report on another device without an account. Demonstrate the report-link landing and expired-link states with dummy fixtures, not real authentication.
- Email supplied here must not create a sales lead or imply interest in paid help.
- A developer scenario may simulate eventual report readiness. If clarification is still needed when AI recovers, do not pretend the report is complete; record the final recovery workflow as a Step 4 decision.

### 8. Contact CTA and confirmation

- CTA copy is configurable; the paid offer is not decided. Do not add checkout, calendar booking, prices, or a fixed service package.
- Required email; optional name; optional message.
- The request is associated with the assessment.
- Show validation, submitting, success, and recoverable failure states. Prevent duplicates while submitting.
- Production will create a New lead in Payload. Prototype this with a mock adapter/local fixture; do not build an admin pipeline UI in this step.
- Confirmation should acknowledge the request without promising an unagreed response time.

## Full initial questionnaire fixture

Use stable internal question and option IDs. Display labels are editable data, not identifiers. Category membership and ordering are also data-driven. The first form has a stable random UUID route, for example `/q/5dc13945-9cb8-4e6b-b504-187c885e0e34`.

All main questions are shared by respondents. Do not add branching based on prior answers. The one AI clarification is the exception.

### Category 01: Your work — unscored context

**Q1. What best describes your work?** Single choice.

- Producer
- Artist / musician
- DJ
- Songwriter
- Manager
- Other creative professional
- Something else

**Q2. How many projects are usually active at the same time?** Single choice.

- 1–2
- 3–5
- 6–10
- 10+
- It varies a lot

Keep supplied labels for the prototype. The overlap at 10 is a copy-review TODO, not permission to silently change the question.

**Q3. Which parts of your work take up the most time outside the actual creative work?** Multiple choice; choose up to four.

- Finding information/files
- Email/messages
- Following up with people
- Scheduling
- Contracts/agreements
- Invoicing/payments
- Project planning
- Repeating admin tasks
- Keeping track of deadlines
- Other

Q1/Q3 Other text requirements were not explicitly settled; do not add a requirement solely because the label says Other. Q5/Q8/Q9 explicitly require accompanying text.

### Category 02: Following a project — scored

**Q4. Imagine someone asks you: “What's happening with Project X?” What would you normally do?** Single choice.

| Option | Value |
| --- | ---: |
| I can see it immediately | 1 |
| I check one place | 0.75 |
| I check a couple of places | 0.5 |
| I search through messages/emails/files | 0.25 |
| I usually need to reconstruct what's happening | 0 |

**Q5. Where does the information for a typical project live?** Multiple choice.

| Option | Quality value |
| --- | ---: |
| Notion / Airtable | 1 |
| Project management software | 1 |
| Google Drive / Dropbox | 0.8 |
| Spreadsheet / Google Docs | 0.65 |
| Calendar | 0.65 |
| Notes | 0.5 |
| Email | 0.3 |
| WhatsApp / DMs | 0.15 |
| Somewhere else — requires text | 0.5 |
| Mostly in my head | 0 |

**Q6. When a project moves forward, how do you usually know what needs to happen next?** Single choice.

| Option | Value |
| --- | ---: |
| The next step is clearly recorded | 1 |
| I have a task/list/calendar | 0.75 |
| I check messages or emails | 0.5 |
| I usually just know/remember | 0.25 |
| It depends on the project | 0 |

### Category 03: Other people — scored

**Q7. When you're waiting for someone else, how do you keep track of it?** Single choice.

| Option | Value |
| --- | ---: |
| It's recorded somewhere | 1 |
| Calendar/reminder | 0.75 |
| I remember it | 0.5 |
| I search the conversation when I need it | 0.25 |
| I often forget and realise later | 0 — provisional fixture default |

**Q8. Which of these collaboration problems happen to you?** Multiple choice.

| Option | Penalty magnitude |
| --- | ---: |
| People don't know what they are supposed to do | 3 |
| I forget to follow up | 2 |
| People forget things | 1.5 |
| Information gets lost in messages | 2 |
| I have to repeat the same information | 1.5 |
| Nobody is sure what the latest version is | 2.5 |
| Deadlines move without being updated | 2.5 |
| Collaboration works pretty smoothly — exclusive | 0 |
| Something else — requires text | 1.5 |

### Category 04: The admin layer — scored

**Q9. Which administrative tasks do you currently manage manually?** Multiple choice.

- Contracts / agreements
- Invoices
- Payment tracking
- File organisation
- Scheduling
- Deliverables
- Client/collaborator information
- Rights / credits information
- Recurring tasks
- None of these — exclusive, scores 1
- Other — requires text, counts as one task

**Q10. When something needs to happen regularly, what usually happens?** Single choice.

| Option | Value |
| --- | ---: |
| It's built into a system/process | 1 |
| I have a recurring reminder | 0.75 |
| I use a checklist/template | 0.5 |
| I remember to do it | 0.25 |
| I deal with it when it comes up | 0 |
| I don't really have recurring tasks | Not applicable; no score |

### Category 05: Your own friction — one grouped AI score

**Q11. What is the most frustrating part of running your creative work?** Open text.

**Q12. What do you find yourself repeatedly doing that feels unnecessarily manual?** Open text.

**Q13. Think about the last time you felt overwhelmed by your workload. What caused it, how did you handle it, and has anything changed since?** Open text. This incorporates the suggested revision; wording remains editable.

### Category 06: The magic question — unscored context

**Q14. If someone could quietly take one annoying part of your work away forever, what would you give them?** Open text.

**Q15. Is there anything you currently wish you had a better system for?** Open text.

**Q16. Roughly how much time do you think you lose each week to searching, chasing, repeating or admin?** Single choice.

- Almost none
- <1 hour
- 1–3 hours
- 3–5 hours
- 5+ hours
- I have no idea

## Scoring rules for coherent prototype results

Implement a small local deterministic calculator or use clearly defined, internally consistent scenario fixtures. Do not call Gemini. If the prototype calculates scores from entered answers, use reusable strategies and configuration rather than question-ID-specific formulas.

Never display option scoring values in the respondent's question UI unless deliberately reviewing a developer fixture.

```text
clamp(x) = min(1, max(0, x))
single choice = selected option value
Q5 = clamp(0.6 * average(selected quality values) + 0.4 * quantityScore)
  quantityScore: 1 selection → 1; 2 → 0.8; 3 → 0.55; 4 → 0.3; 5+ → 0
  override: Mostly in my head selected alone → 0
Q8 = clamp(1 - sum(selected positive penalty magnitudes) / 16.5)
Q9 = clamp(1 - selected task count / 10)
  None of these → 1; Other counts once
categoryNormalizedScore = sum(weight * usable score) / sum(usable weights)
categoryPoints = categoryNormalizedScore * category.maxPoints
```

- Default question/group weights: 1. Default scored category maximum: 20.
- Scoring strategies are separate from input types: `none`, `single_choice_value`, `multi_select_count`, `multi_select_weighted`, `multi_select_quality_quantity`, `ai_rubric`.
- Q5 examples: Notion alone = 1; Notion + Drive = 0.86; Email + DMs = 0.455; head alone = 0; Notion + head = 0.62.
- Q8 examples: penalties 2 + 2.5 produce approximately 0.7273; all penalties including Other produce 0. No extra quantity multiplier.
- Q9 examples: two tasks = 0.8; five = 0.5; ten = 0.
- Q10 not applicable is excluded from both scoring and expected coverage weight. Q9 = 0.4 plus Q10 not applicable means category 8/20, not 14/20.
- Below 60% is eligible for attention; exactly 60% is not. Compare unrounded scores. At the 20-point default, eligibility is below 12/20.
- Unknown/skipped answers are not zero. No usable score means no numeric category score.
- Minimum evidence coverage is in scope for production but its starting threshold is undecided. A 60% fixture setting is allowed only if documented as provisional and distinct from the confirmed 60% attention threshold.
- Coverage = usable scoring weight / expected applicable scoring weight. Withhold insufficiently covered categories from priority selection. Not-applicable answers reduce the denominator; skipped/insufficient answers do not.
- Evaluate Q11–13 as one scoring unit, not three identical scores. Mock rubric levels: 0 reactive/repeatedly losing control; 0.25 some unreliable structure; 0.5 partly reliable with recurring gaps; 0.75 generally reliable with specific weaknesses; 1 reliable and resilient under disruption.
- AI scoring measures effective process management, not lack of stress, writing quality, or tool choice. A vague answer means insufficient information, not poor health.
- Production priority selection considers eligible category scores, reported impact, and relevant context, including unscored answers. Prototype narratives must match their sample answers; do not present a fixed narrative as if it understood arbitrary free text.

## Prototype service boundaries and fixtures

Use interfaces/adapters for loading landing content, loading a questionnaire definition, saving answers, retrieving progress, submitting analysis, receiving clarification/results, requesting notification, and submitting contact. The adapters are local mocks now and replaceable later.

Provide named scenarios through a developer-only fixture route/control or documented setup. This is a prototype review aid, not the dedicated production test mode the owner explicitly declined.

| Scenario | Required demonstration |
| --- | --- |
| Happy path | Landing → 16 questions → review → two priorities → contact success |
| One priority | Exactly one eligible priority; no fabricated second issue |
| Healthy | Completed assessment with no major issues; CTA remains available |
| Clarification | One follow-up, then a completed report |
| Insufficient | One follow-up, then unknown AI score and an honest limited result |
| Save failure | Visible failed save, preserved input, successful retry |
| Resume | Return after reload, restore prior answers and progress |
| AI failure | Simulated retries, deterministic fallback, optional notification |
| Notification error | Validation/request error with retry and confirmation |
| Report link | Completed mock report and expired-link state |
| Contact error | Invalid email and failed submission without losing entered fields |

Avoid unbounded timers, actual message sending, and real personal data in fixtures. Explain in the README how sample reports relate to sample answers and how the normal arbitrary-answer path handles mocked AI.

## Tasks, in order

### A. Establish the runnable prototype

- [ ] Inspect repo/instructions and choose the smallest Next.js setup compatible with the agreed stack.
- [ ] Add scripts, TypeScript, React Hook Form, styling, and concise setup documentation.
- [ ] Create typed landing content, questionnaire/version, question/option, progress, and result fixtures.
- [ ] Add mock service boundaries and deterministic scenario selection for development review.

### B. Build the primary experience

- [ ] Implement the CMS-ready landing content renderer and linked start action.
- [ ] Build reusable single-choice, multi-choice, and text question controls.
- [ ] Implement required flags, selection limit, exclusive options, and required accompanying text.
- [ ] Add progress, Back/Next, accessible question transitions, and review/edit navigation.
- [ ] Simulate autosave, restore same-browser progress, and show save failures honestly.
- [ ] Build processing and one-time clarification screens.
- [ ] Build two-priority, one-priority, healthy, and insufficient result states.
- [ ] Build contact form, validation, submitting/error states, and confirmation.

### C. Cover alternative states

- [ ] Add simulated AI retry/fallback and optional notification signup.
- [ ] Add mock report-link and expired-link states.
- [ ] Ensure every named scenario is easy to reach without manually answering the entire form each time.
- [ ] Set questionnaire/results noindex metadata and keep landing metadata separate.

### D. Verify and hand off

- [ ] Run type checking and production build; fix relevant failures.
- [ ] Verify an actual happy-path click-through on mobile and desktop using a browser tool if available.
- [ ] Check Q3 selection cap, Q8/Q9 exclusivity, Q5/Q8/Q9 Other text, review editing, reload/resume, and save-failure recovery.
- [ ] Verify keyboard operation, focus after transitions, error association, no horizontal overflow, and reduced motion.
- [ ] Verify each named result/failure scenario and prevent double submit while pending.
- [ ] Add focused automated tests where they verify substantive behavior, especially local scoring if implemented and navigation/persistence regressions. Do not pad with tests that mirror static markup.
- [ ] Record commands run, passing checks, and any browser verification that could not be performed. Do not claim checks that were not run.
- [ ] Update README with exact run instructions, fixture/scenario access, known limitations, and simulated integration boundaries.
- [ ] Provide a concise completion report with runnable preview instructions and remaining Step 4 decisions. No production deployment is required.

## Definition of done

The owner can open a local browser, use the landing page, complete and revise the assessment, resume after reload, view each report state, and try contact/notification interactions. Layout works on mobile and desktop. Scenarios are reproducible, and the README explains exactly what is mocked. Production backend integration remains clearly outside this deliverable.

## Constraints to preserve for later implementation

These guide component/data boundaries; they are not tasks to build during Step 3.

- Payload provides the private admin interface in the same Next.js app. One admin role. Use basic CMS fields initially; custom visual builders are deferred.
- Public landing content is editable in Payload. Publishing content must refresh served content without deployment.
- Questions, validation, curves, rubrics, weights, and result configuration are data. No executable JS entered by CMS users; new ordinary content requires no code/schema change.
- Published questionnaire versions are immutable. Stable UUID URLs serve the latest version to new respondents; existing submissions keep their original version.
- No questionnaire disabling/blocking flow. No dedicated test/real submission mode in the production feature set.
- Every production answer/follow-up is persisted in PostgreSQL. New scoring runs preserve old results.
- Admin can browse submissions and scores, add notes, and manage New → Contacted → In progress → Closed leads. No need to prototype that standard Payload interface now.
- Public questionnaire UUIDs and noindex directives do not protect private data. Production credentials, sessions, report-link expiry, and access rules need Step 4 design.
- Gemini is server-side; Resend is only used when needed. No secrets in frontend code.
- Deploy one application with PostgreSQL on the user's VPS in Docker later. Operating budget is flexible; this prototype needs no paid integration.

## Deferred decisions and review TODOs to retain

- [ ] Review Q5 scoring: a maintained spreadsheet can outperform a neglected Notion workspace; multiple tools do not necessarily mean fragmentation. Future alternative: keep tool list unscored and ask “How reliably can you find the current information you need for a project?” **Keep current Q5 in the prototype.**
- [ ] Review Q9 scoring: manually sending two invoices a month may be appropriate. Future alternative: keep task list unscored and ask “How often do administrative tasks get delayed, missed, or need redoing?” **Keep current Q9 in the prototype.**
- [ ] Review minimum coverage and missing-evidence edge cases; do not remove coverage from future scope. Exclude explicit not-applicable answers from expected weight.
- [ ] Confirm Q7 last-option score, required flags, Q13 wording, overlapping Q2 range labels, and final rubric calibration before production publication.
- [ ] Decide retry limits/backoff, recovery if clarification is pending, notification behavior, real session/report-link expiry, retention, and access rules during Step 4.
- [ ] Consider optional “Was this useful?” feedback later; do not add it as a mandatory step now.
- [ ] Preserve V2 Figma redesign as future work; do not block this minimal prototype on brand assets.

## Optional supporting project documents

If present, consult `V1_SCOPE.md`, `SCORING_REFERENCE.md`, and `AI_RUBRIC_INITIAL.md` for wider context and full draft rubric examples. They are not required to understand this Step 3 brief. Do not interpret their production tasks as authorization to expand this prototype into the full backend build.
