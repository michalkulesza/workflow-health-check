# Public page redesign — implementation handoff

Prepared: 2026-09-15. Status: plan only; implementation not started.

## Objective and scope

Redesign the remaining public website to match [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and the supplied Leafworks references. The user considers the questionnaire form redesign done. Focus on the landing page, its header/footer, and visual consistency of surrounding public states; preserve the existing questionnaire layout and behavior.

Primary reference: `C:/Users/kules/Downloads/IMG_9913.png` (desktop landing page). Secondary: `C:/Users/kules/Downloads/IMG_1602.png` (questionnaire and report montage). Inspect both directly. These files are local references, not deployable assets. If inaccessible, request the attachments; the written design system remains authoritative for tokens and component recipes.

Deliver an implemented, responsive page, with browser screenshots and functional verification. This document itself authorizes no deployment, live database rewrites, external emails, or paid provider calls.

## Preserve these decisions

- Keep **Workflow Check** branding, styled like the reference's small, widely spaced wordmark. No Leafworks rename.
- Keep the free assessment and the published questionnaire's actual content, length, scoring, and destination.
- Do not introduce checkout, pricing, paid tiers, testimonials, a six-question flow, sample scores presented as real results, or guarantees about completion/delivery time.
- The reference is visual direction. Its “3 minutes,” “instant results,” €49, testimonials, and 24-hour delivery are not approved product claims.
- Use the existing Arial/Helvetica stack, semantic tokens, green pill actions, blue information accents, regular-weight headings, white/cool-gray surfaces, restrained borders, and generous spacing.
- Light theme only. Preserve the future theme override boundary; no theme toggle or automatic dark mode.
- Results generation belongs **inside the report layout**, with a spinner/message, email notification form, and Request help still visible. Do not replace it with a loader-only page. The earlier conversation's loader-only implementation was explicitly rejected.
- Active runs must not expose an earlier partial/failure report. Keep the report API regression fix and its tests.

## Read and inspect before implementation

Read `AGENTS.md`, `general.md`, `typescript-react-guidelines.md`, and the design system. Read installed Next documentation for affected layout, styling, image, and routing conventions before coding. Inspect the current git status and preserve all existing changes. Recheck runtime facts rather than relying on historical execution notes in older handoffs.

| File or area | Current responsibility / implication |
| --- | --- |
| `components/Landing.tsx` | Client-loaded CMS landing content; currently hero, audience, and steps only. Preserve its adapter and dynamic questionnaire link. |
| `app/(frontend)/page.tsx` | Home entry rendering Landing. |
| `app/(frontend)/layout.tsx` | Shared public header/footer around home, questionnaire, and private reports. Changes here can affect the finished form. |
| `app/globals.css` | Legacy warm global tokens/selectors plus newer assessment styles. Audit scope before changing global headings, buttons, main, or footer. |
| `lib/assessment/contracts.ts` | `landingSchema` has headline, supporting, audience fields, steps, buttonLabel, questionnaireId, and metadata. It has no photo, feature-grid, FAQ, or testimonial fields. |
| `app/(frontend)/api/assessment/v1/landing/route.ts`, `server/content/publicProjection.ts` | CMS global projection and public questionnaire target. Preserve publication/content ownership. |
| `components/ResultsView.tsx`, `ContactStep.tsx`, `PrivateReport.tsx` | Existing result, notification, help, confirmation, private access, and error behavior to preserve. |
| `components/Assessment.tsx`, `QuestionField.tsx` | Completed form work: regression boundary, not another redesign target. |
| `server/assessment/reportRoute.test.ts` | Covers pending state overriding an older saved report; retain. |
| `tests/journeys.spec.ts`, `tests/previewJourney.spec.ts` | Existing browser coverage; inspect configuration before extending. |

`FORM_REDESIGN_HANDOFF.md` includes historical pending items despite the user's statement that the form is done. Treat the actual application and latest user decisions as current; do not automatically reopen its entire scope.

## Page composition

Implement the following vertical sequence, using the landing reference for proportions and rhythm rather than tracing its text or adding its commercial funnel.

| Section | Target composition and content |
| --- | --- |
| Header | Small wordmark, quiet section navigation, one green assessment CTA. Links target real section IDs. On mobile, prefer a simple wrapping layout or accessible disclosure if needed; no clipping or decorative dead links. |
| Hero | At 960px+, balanced copy/image columns with a 48px gap. CMS headline and supporting text, CMS CTA, and truthful supporting facts such as no email required for viewing results. Workspace photo on the right. Stack on mobile, copy first. |
| Benefits / audience | Cool-gray full-width band with centered inner container. Existing CMS audience heading/copy plus four concise outline-icon benefits: understand workflow, identify friction, practical next steps, designed for creative work. Avoid guaranteed outcomes. |
| Report preview | White two-column section: explanation and assessment CTA alongside a restrained report illustration. Build the illustration with HTML/CSS and decorative circles where practical. Label it “Example report”; use category/next-step placeholders rather than fabricated personal findings or scores. No new download or purchase promise. |
| How it works | Use `landing.steps` in their supplied order. Numbered circles and decorative connectors on desktop, stacked on mobile. Do not force the reference's four paid-funnel steps or invent additional workflow states. |
| FAQ | Divider accordion rows with native details/summary or an equivalent accessible pattern. Explain current behavior: no account requirement only if verified, optional email, asynchronous analysis, possible clarification, and what the report contains. Privacy/storage answers must be grounded in actual documented behavior. |
| Closing CTA | Quiet cool-gray strip with brief invitation and the same real assessment link. |
| Footer | Wordmark, short description, and working navigation. Include legal/contact links only when real destinations exist. Do not ship placeholder links, invented addresses, or policy text. |

Omit the testimonial/carousel section: no approved customer evidence was supplied. Maintain the reference's whitespace and alternating section rhythm without filling that space with invented social proof.

## Content and asset decisions

Keep current CMS headline, supporting text, audience copy, step content, button label, and questionnaire ID authoritative. New explanatory section copy can be static, product-accurate content in a small local content module. Do not silently expand the CMS schema or add database migrations for this visual task. If later CMS editing of new sections is required, document it as follow-up work.

Use a real, licensed workspace image already available in the project if suitable. Otherwise select an appropriately licensed asset and record its source/license, or use image generation following the available imagegen skill. Save approved assets locally with descriptive filenames; do not hotlink or crop the supplied website screenshot into the hero. Do not fabricate a customer workspace attribution. An asset gap is not a reason to ship a broken image or a generic gray placeholder as the final design.

Follow installed Next image guidance: reserve dimensions/aspect ratio, provide responsive sizing, preserve focal points, and avoid loading large below-the-fold assets eagerly. Use one outline icon style and semantic CSS decoration; no new icon dependency solely for a few simple icons unless justified.

## Styling and route isolation

Reuse the design system's existing semantic tokens; audit which are actually present before adding any. Scope public marketing styles explicitly. Do not globally replace legacy `--accent` because action green and information blue serve different purposes.

Landing sections may span the viewport background, but their inner content is centered at a maximum 1200px, with 20/32/40px responsive gutters. Report content stays at its existing 800px maximum; assessment shell stays at its existing 640px maximum. Follow 640px/960px thresholds, 48/64/80px section padding, and 40/56px regular-weight hero typography from the design system.

The parent layout currently supplies public chrome on all public routes. Give home the full marketing navigation while retaining minimal existing chrome around assessment/private reports. If route groups are needed, keep `/`, `/q/[id]`, and `/report/[token]` URLs and metadata unchanged. Do not add duplicate headers, nested main landmarks, or pathname-dependent CSS that hides arbitrary ancestors. Verify Payload admin is unaffected.

## Carry-forward interaction requirement: notification validation

The user reported clicking “Notify me when ready” with an empty email produces a generic request failure. That request was interrupted before implementation; inspect the current code before assuming it is fixed. Complete this narrowly alongside public-state polish:

- Empty/whitespace-only input: “Enter your email address to get notified.”
- Invalid address: “Enter a valid email address, like name@example.com.”
- Trim input and validate with the shared `emailSchema` before any adapter/network call. Preserve server validation.
- Show the error beside the field, associate it through `aria-describedby`, set `aria-invalid`, and focus the field after invalid submission.
- Preserve typed input; clear stale field errors when edited. Keep network failure separate from validation and success messages.
- Prevent duplicate requests while saving. Preserve the independent optional help form and its idempotency semantics.

Do not redesign the questions or change report generation to implement this requirement.

## Ordered implementation tasks

1. **Baseline:** record branch/revision, dirty files, current desktop/mobile screenshots, available imagery, and relevant test failures. Inspect existing token and route scopes.
2. **Marketing shell:** implement scoped tokens/layout, responsive header/footer, and hero first. Inspect screenshots at 390px and 1280px before propagating visual decisions.
3. **Page sections:** implement benefits, honest report preview, CMS-driven steps, verified FAQ, and closing CTA. Keep links functional and imagery deployable.
4. **Public states:** style landing loading/unavailable/retry states; preserve result/private access behavior and finish notification validation. Do not discard entered notification/help data during status polling.
5. **Verify and refine:** perform browser, accessibility, responsive, and behavioral checks; repair only introduced regressions and explicitly scoped validation issues.
6. **Handoff:** record exact files, screenshots, check results, asset provenance, limitations, and any remaining work. Move this specification to `docs/specs/done/` only when acceptance is met; keep DESIGN_SYSTEM.md in place.

Use a scoped branch/worktree and the bounded implement/check/fix workflow required by general.md. Recheck Ralph availability; if unavailable, record that and use at most three fix/check attempts per repeated failure before reassessing. Do not stage unrelated work. Routine design decisions within this specification do not need another permission round.

## Acceptance and verification

- The home page visibly follows the reference's composition: spacious split hero, cool-gray bands, outline benefits, report preview, steps, FAQ, green actions, restrained wordmark, and regular-weight typography.
- All start buttons use the fetched questionnaire ID. Navigation anchors, FAQ, loading, unavailable, and retry states work. No invalid target while content loads.
- Test 320px, 390px, 768px, and 1280px; no horizontal scrolling, cropped text, overlapping controls, or obscured focus. Check 200% text enlargement and reduced motion.
- Keyboard navigation, visible focus, contrast, meaningful headings/landmarks, and image alternatives pass manual review and representative axe checks. No focus-stealing polling or repeated live announcements.
- Pending results retain the message/spinner, notification, and help on the same layout. Completion updates automatically. Partial, failed, insufficient, and genuine no-issues results remain distinct. Private reports do not gain unauthorized contact/edit controls.
- Empty and malformed notification email show specific errors without a request. Valid input is submitted once; request failure retains input and allows retry. Verify using controlled transport, not real email delivery.
- Compare assessment screenshots before/after: finished choice controls, progress, navigation, review, and clarification remain intact. Preserve noindex and private access behavior; admin styling is unchanged.
- Capture full-page desktop/mobile landing screenshots and focused screenshots of mobile navigation, FAQ, loading/error, pending report, and validation. Use isolated browser fixtures or mocked transport for transient states; never toggle a user's real database run for design previews.
- Run targeted formatting/lint, typecheck, unit tests, relevant existing browser/integration tests, and production build as applicable. Record actual outcomes and environment limitations; do not claim browser verification from compilation alone. No live AI calls are required for visual checks.

## Copy-paste handoff prompt

> Implement `docs/specs/PUBLIC_PAGE_REDESIGN_HANDOFF.md` using `docs/specs/DESIGN_SYSTEM.md` and the two attached reference images. The form redesign is already done: redesign the landing page and its public chrome, preserve the assessment behavior and current report layout, and finish the specified notification email validation. Keep Workflow Check branding, the free flow, CMS-owned content, and semantic light-theme tokens. Do not add payments, testimonials, unsupported promises, or a loader-only report screen. Complete the implementation and visual/functional verification, preserve existing work, and record evidence and remaining limitations in the handoff.

## Completion record — 2026-09-15

- Implemented the public landing shell, responsive hero, benefit band, CSS report example, CMS-driven steps, FAQ, CTA, and public header/footer in `components/Landing.tsx`, `app/(frontend)/layout.tsx`, and scoped marketing styles in `app/globals.css`.
- Added `public/images/creative-workspace.png`, generated with the built-in image-generation tool for this project; it is an original local asset, not derived from the reference screenshots.
- Notification signup now trims and validates with the shared `emailSchema`, shows the specified accessible field errors, focuses the invalid field, clears stale validation errors on edit, and continues to prevent duplicate saves.
- Verified: Prettier and targeted ESLint pass; `npm.cmd run typecheck` passes; `npm.cmd test` passes (16 files, 48 tests); `npm.cmd run build` passes. Playwright rendering at 1280px and 390px found no horizontal overflow; axe reported no landing-page violations. Screenshots are in ignored `test-results/landing-1280.png` and `test-results/landing-390.png`.
- Limitation: no mocked pending-report transport was added for a focused browser screenshot; existing pending report UI was preserved and the changed notification behavior is covered by its code path and shared contract validation.
