# Leafworks visual design system

Status: maintained design reference. Created 2026-09-14 from the supplied questionnaire montage (`IMG_1602.png`) and landing-page reference (`IMG_9913.png`).

Use this document when designing or implementing public-facing components. Values below are deliberate, reusable interpretations of the screenshots, not sampled source-design measurements. The exact original typeface is unknown. This document defines the target visual system; existing `app/globals.css` still uses an older warm palette and square controls. Adoption is incremental and requires explicit implementation work.

This is a living reference, not an implementation checklist to archive after one feature. Completed adoption specifications belong in `docs/specs/done/`; this reference stays here.

## 1. Design direction and scope

The experience should feel calm, clear, practical, and spacious: near-black text, white backgrounds, restrained cool-gray sections, green actions, and occasional blue highlights. Hierarchy comes from typography and spacing before borders or shadows.

- Use one prominent action per decision area. Keep supporting navigation visually quieter.
- Use generous whitespace, left-aligned text, thin outline icons, and regular-weight headings.
- Reserve soft green/blue overlapping circles for decorative edges and report covers.
- Use photography of real creative workspaces with neutral daylight, simple compositions, and room for the surrounding content.
- Avoid heavy gradients on functional controls, dense dashboards, oversized shadows, all-bold typography, and arbitrary accent colors.

The reference wordmark reads “LEAFWORKS”; the current product is named “Workflow Check.” Apply the visual wordmark treatment to the configured product name until a naming change is separately approved. Payment screens, €49 pricing, six-step counts, claims about completion time, testimonial quotes, and email promises are reference content, not authorization to add those product features or claims. Derive actual content and progress from the existing product and published questionnaire.

## 2. Color tokens

Use semantic tokens in components. Hex values are the initial light-theme standard; no dark theme is defined yet. Future dark mode is an explicit requirement for token architecture: keep surface, text, action, selection, status, shadow, and decoration semantics separate and provide a theme override boundary. Components must not embed light-specific color literals. Implementing a dark palette, system-preference switching, or a theme toggle is a separate task. See [the form redesign handoff](FORM_REDESIGN_HANDOFF.md) for the first scoped adoption.

| Token | Value | Purpose |
| --- | --- | --- |
| `--color-bg` | `#FFFFFF` | Main page and panel background |
| `--color-bg-subtle` | `#F5F7F8` | Alternating marketing sections, questionnaire outer canvas |
| `--color-surface` | `#FFFFFF` | Cards, fields, menus |
| `--color-text` | `#111827` | Headings and body text |
| `--color-text-muted` | `#566173` | Helper text, descriptions, metadata |
| `--color-border` | `#DCE2E8` | Decorative card borders and dividers |
| `--color-control-border` | `#7C8798` | Unselected input/radio/checkbox boundary |
| `--color-track` | `#E2E6EB` | Progress and score tracks |
| `--color-primary` | `#008516` | Primary action and selection marker |
| `--color-primary-hover` | `#006D12` | Primary hover |
| `--color-primary-active` | `#00570E` | Primary pressed |
| `--color-primary-soft` | `#EDF8EF` | Selected choices, practical tip panels |
| `--color-primary-border` | `#008516` | Selected control boundary |
| `--color-accent` | `#005BEA` | Links, informational icons, occasional alternate CTA |
| `--color-accent-hover` | `#0048BC` | Blue action hover |
| `--color-accent-soft` | `#EEF4FF` | Informational panels |
| `--color-on-solid` | `#FFFFFF` | Text/icons on green and blue actions |
| `--color-success` | `#007A20` | Confirmed success with text/icon |
| `--color-warning` | `#855100` | Warning text/icon |
| `--color-warning-soft` | `#FFF7E6` | Warning background |
| `--color-danger` | `#B42318` | Validation, failed save, destructive actions |
| `--color-danger-soft` | `#FFF1F0` | Error background |
| `--color-disabled-bg` | `#E8ECF0` | Disabled control background |
| `--color-disabled-text` | `#657083` | Disabled label |
| `--color-focus` | `#005BEA` | Keyboard focus outline |

White text on the chosen green/blue and muted text on white are intended for normal text. Verify contrast in the rendered component, especially when combining translucent layers: normal text at least 4.5:1, large text at least 3:1, meaningful control boundaries and state indicators at least 3:1 against adjacent colors. The pale decorative border must not be the sole indicator of an input; use the stronger control border for its native marker. Do not rely on hue alone for selection, success, failure, or score interpretation.

Green identifies actions and selections; blue identifies supporting information. A green score bar does not automatically mean “healthy”: show the actual category label and numeric/text interpretation supplied by the backend.

## 3. Typography

Use `Arial, Helvetica, sans-serif` initially. It matches the neutral sans-serif direction and the existing dependency-free stack. If the source font becomes available, evaluate it as a separate global change; do not mix new fonts into individual components.

Base size is `16px` (`1rem`); respect browser text settings. Express component sizes in rem, with the pixel equivalents below as design references.

| Role | Mobile / desktop size | Line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Hero/display | 40 / 56px | 1.06 | 400 | -0.035em |
| Page title | 32 / 40px | 1.15 | 400 | -0.025em |
| Section title | 28 / 36px | 1.2 | 400 | -0.025em |
| Question title | 26 / 32px | 1.22 | 400 | -0.02em |
| Card title | 20 / 22px | 1.3 | 400 | -0.015em |
| Lead paragraph | 18px | 1.5 | 400 | 0 |
| Body / form value | 16px | 1.5 | 400 | 0 |
| Supporting copy | 14px | 1.5 | 400 | 0 |
| Metadata | 12px | 1.5 | 400 | 0.02em |
| Eyebrow | 12px | 1.4 | 600 | 0.14em |
| Button label | 16px | 1.25 | 600 | 0 |
| Wordmark | 13px | 1.2 | 600 | 0.24em |

Eyebrows and wordmarks are uppercase; body copy and actions use sentence case. Avoid uppercase instructions. Use real heading levels independently of their visual size. Limit prose to about 60–65 characters per line and hero copy to about 40–48. Let headings wrap naturally; use explicit line breaks only in a reviewed marketing composition that still works on small screens and at enlarged text sizes.

## 4. Spacing and layout tokens

Use a 4px base scale; select from these values before introducing another spacing value.

| Token | Value | Common use |
| --- | --- | --- |
| `--space-1` | 4px | Tight inline relationships |
| `--space-2` | 8px | Icon/label gaps, stacked choice gaps |
| `--space-3` | 12px | Helper spacing, compact panel padding |
| `--space-4` | 16px | Control padding, small card gaps |
| `--space-5` | 20px | Mobile page gutter |
| `--space-6` | 24px | Panel padding, related content groups |
| `--space-8` | 32px | Desktop panel padding, heading-to-content groups |
| `--space-10` | 40px | Desktop page gutter, larger group gaps |
| `--space-12` | 48px | Mobile section padding, major group gaps |
| `--space-16` | 64px | Tablet/compact desktop section padding |
| `--space-20` | 80px | Desktop marketing section padding |
| `--space-24` | 96px | Optional spacious hero/feature section padding |

### Page layouts

| Layout | Rule |
| --- | --- |
| Marketing container | Centered, maximum 1200px content width; 20px gutters on mobile, 32px tablet, 40px desktop |
| Marketing hero | One column below 960px; two balanced columns above, 48px gap; copy and image vertically centered |
| Marketing section | 48px vertical padding mobile; 64px tablet; 80px desktop |
| Feature grid | One column below 640px, two from 640px, four from 960px; 24–32px gaps |
| Questionnaire shell | White panel, maximum 640px including padding; centered on subtle canvas on desktop; full-width white surface on mobile |
| Questionnaire padding | 20px on mobile, 32px from 640px; never shrink controls to reproduce the montage proportions |
| Report content | Maximum 800px; single-column reading flow; secondary summaries may form columns when space permits |
| Navigation | Minimum 72px desktop height; allow wrapping or a deliberate mobile menu; no horizontal clipping |

Breakpoints are content thresholds: 640px and 960px. At 320px wide the page must still work without horizontal scrolling. Test 390px, 768px, and 1280px as representative sizes. Long translations, errors, and 200% text enlargement must be allowed to increase height.

The montage contains separate screen examples; it is not an eight-card production layout. Questionnaire actions belong after the content, with Back at the start and Next at the end. On short screens allow normal scrolling. A sticky action area, if needed, requires safe-area padding and enough content clearance to keep fields and focus visible above it.

## 5. Shape, borders, and elevation

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 6px | Checkbox marker, small badges |
| `--radius-control` | 12px | Inputs, textareas, short multi-choice cards |
| `--radius-card` | 16px | Report, tip, and selection panels |
| `--radius-pill` | 999px | Buttons, progress tracks, simple single-choice rows |
| `--border-width` | 1px | Default border |
| `--shadow-card` | `0 8px 24px rgb(17 24 39 / 8%)` | Floating report preview or elevated panel |
| `--shadow-overlay` | `0 16px 48px rgb(17 24 39 / 16%)` | Dialog/menu elevation when needed |

Most cards and fields have no shadow. Keep structural images rectangular; use restrained rounding only where it belongs to a card. Long multiline choice cards use the control radius instead of a capsule that crowds text. Shadows do not replace a visible boundary or modal backdrop.

## 6. Buttons and links

| Variant | Appearance | Usage |
| --- | --- | --- |
| Primary | Green fill, white label, pill shape | Start, Next, submit, main conversion |
| Secondary | White surface, decorative border, dark label, pill shape | Back, cancel, supporting actions |
| Accent | Blue fill, white label, pill shape | Deliberate transition to additional detail; use sparingly |
| Text link | Blue or dark green text, underline in prose | Inline navigation and less prominent actions |
| Destructive | Danger fill and explicit verb | Only an actual destructive operation |

Default button: minimum 48px height, 24px horizontal padding, 12px label/icon gap. Large marketing CTA: minimum 52px height, 28px horizontal padding. Compact button: minimum 44px height, 20px horizontal padding, 14px label. Icon-only controls are at least 44 × 44px with an accessible name. Height is a minimum, not a clipping constraint; accommodate wrapped labels.

Use inline-flex alignment and a 20px arrow icon for forward actions; Back gets a left arrow. Mobile main CTAs may fill their container; questionnaire navigation can remain a two-ended row while it fits. Never place competing green and blue primary actions beside each other for the same decision.

State rules:

- Hover: darker semantic fill; secondary buttons use the subtle surface and stronger boundary.
- Pressed: primary active fill; avoid movement that shifts the layout.
- Focus-visible: 3px blue outline, 3px offset, with sufficient white separation on solid controls. Keep it visible around the whole control.
- Disabled: explicit disabled colors, no hover effect, native disabled semantics where applicable. If a prerequisite is unclear, explain it nearby.
- Loading: retain button width and a meaningful label such as “Saving…”; prevent duplicate submission and expose busy state. Do not announce every spinner frame.
- Failed action: restore retry affordance and show a specific nearby error without losing data.

Use links for navigation and buttons for actions. Do not apply a global filled style to every `button`; variants are explicit.

## 7. Form controls and questionnaire patterns

### Choice rows

Single-choice options use a vertical radio group, 8px row gap, minimum 48px row height, 12px vertical and 16px horizontal padding. Marker is 20px, with a 12px gap to text. Short options use pill corners. The entire associated label is clickable.

Multi-choice options use checkboxes and 12px corners. Two columns are allowed only when both labels fit comfortably; otherwise use one. Use a minimum 56px row height for wrapped labels, allowing further growth. Keep row-major reading and keyboard order; do not visually reorder answer options.

Unselected: white background, pale outer border, strong native marker boundary. Selected: pale green background, green border, green radio dot or white check on a green checkbox. Hover: subtle background and stronger border. Focus: outline the whole choice via its input focus state. Keep the actual input accessible and keyboard-operable; do not replace it with an unlabelled clickable div.

Use a fieldset and visible legend where appropriate. Radio arrows and Space follow native behavior. A multi-selection maximum appears in helper text. On reaching a limit, explain it; keep selected answers removable. An “Other” follow-up field appears with its own label and helper/error association.

### Text fields

Inputs have minimum 48px height, 12px radius, 12px vertical / 16px horizontal padding, and 16px text. Textareas start at 144px tall and resize vertically. Labels are 14px/600 with an 8px gap. Help and error text is 14px with an 8px gap after the field. Placeholder text supplements a persistent label.

Focus uses the shared ring. Invalid fields use the danger border, `aria-invalid`, and an associated text error. A required marker must be explained; optional fields should say “Optional.” Keep entered content after validation or network errors.

### Progress and saving

Progress track is 6px high with pill ends; fill is green. Place the current step count nearby using 14px text and tabular numerals. The number of steps comes from the active flow, not the screenshot's six screens. Label the progress element accessibly. Do not show synthetic analysis percentages while waiting on a worker.

Use quiet, persistent save feedback: “Saving…”, “Saved”, or “Couldn’t save. Retry.” Announce meaningful updates politely without repeating each keystroke. A green next button must not imply that an unsaved answer is persisted.

## 8. Cards, reports, and supporting components

| Component | Recipe |
| --- | --- |
| Standard card | White surface, 1px pale border, 16px radius, 24px padding (16px compact), no shadow |
| Practical tip | Pale green surface, 16px radius, 16–24px padding, 24px outline icon, short heading and actionable text |
| Score row | Icon, category label, track and numeric value; 16px padding, 12px radius; value never conveyed by bar/color alone |
| Report priority | Standard card with title, actual result, concise explanation, and pale supporting “Next step” area |
| Information/error notice | Semantic tinted background, icon plus heading/text, 16–24px padding; include a recovery action where possible |
| FAQ accordion | Divider rows, minimum 48px trigger, 16px vertical padding; visible question, chevron and expanded state; native details/summary is suitable |
| Step indicator | 36px numbered circle, 16px text gap; connectors decorative; stack on mobile |
| Confirmation | 40px outlined success icon, 24px gap to title, readable centered copy, primary follow-up action |
| Loading/empty state | Explain what is happening or absent; reserve stable space; show retry/back/help where relevant |

Report layouts must distinguish complete, pending, partial, insufficient, and failed results with explicit wording. Do not present an empty priority list as success unless the result actually means that. Private or invalid report access gets a neutral unavailable state without revealing assessment details.

Price and checkout component styling can reuse the same cards and radio controls if payment is later in scope. Do not introduce a paywall from the reference alone. Testimonials require real approved quotes; mock testimonials must not ship as customer evidence.

## 9. Imagery, icons, and decoration

Use one consistent outline icon family at 20px for controls and 24–32px for features, with approximately 1.5–2px strokes. Avoid mixed filled/outlined styles and emoji as UI icons. Decorative icons have no accessible name; icon-only actions do.

Photography: neutral white/gray workspace, natural green plants, daylight, uncluttered creative tools. Suggested crops: 4:3 hero, 3:2 supporting image. Keep focal points intact across mobile crops and provide meaningful alt text only when the image conveys information. Avoid embedding functional text in images.

Decorative circles: green `#CDEECE` and blue `#89BEFF`, approximately 35–60% opacity, overlapping and clipped at a panel edge. Their diameter can range from 160 to 320px by composition. They sit behind content, ignore pointer events, and are hidden from assistive technology. Never place essential copy on a busy overlap. Do not reproduce image compression/grain artifacts as a UI texture.

## 10. Motion and layers

Use 120ms for hover/press color transitions, 180ms for disclosure/state transitions, and up to 240ms for progress width changes, with `ease-out`. Avoid `transition: all`. Respect reduced motion by removing transforms, smooth scrolling, and nonessential animation; retain textual status information.

Layer tokens: base `0`, sticky navigation/actions `10`, popover `20`, modal backdrop/dialog `40/50`, toast `60`. A modal needs focus management, an accessible title, Escape handling where appropriate, and focus restoration. Toasts supplement persistent form errors; they must not be the only place a failed save is explained.

## 11. Adoption and component contract

When implementing this system, define the semantic tokens once in `app/globals.css`, scoped so they do not accidentally restyle Payload admin. Components consume tokens instead of scattering literal values. Existing legacy mappings for migration are:

| Current token | Target token |
| --- | --- |
| `--ink` | `--color-text` |
| `--muted` | `--color-text-muted` |
| `--paper` | `--color-bg` |
| `--white` | `--color-surface` |
| `--accent` | `--color-primary` |
| `--accent-dark` | `--color-primary-hover` |
| `--line` | `--color-border` |
| `--soft` | `--color-bg-subtle` |
| `--success` | `--color-success` |
| `--error` | `--color-danger` |

Do not blindly change the old `--accent` everywhere: informational eyebrows and links may need blue, while interactive markers need green. Replace old 3–4px choice/button corners, inset selected stripes, heavy headings, and hard-offset shadows when the corresponding component is adopted.

Before adding a new public component:

- Identify its semantic role and reuse an existing button, card, field, notice, or layout recipe.
- Define default, hover, focus, active, disabled, loading, empty, error, and success states where applicable.
- Use the token palette and spacing scale; document any new shared token here before spreading exceptions.
- Check keyboard operation, visible focus, accessible naming, contrast, and non-color state cues.
- Check narrow screens, long labels, zoom, reduced motion, and validation text without clipped content.
- Preserve API/session behavior and genuine result states while applying visual changes.
- Add a component example or visual test when an actual implementation is introduced; this document alone does not verify a rendered UI.

Suggested reference in future tasks: “Follow `docs/specs/DESIGN_SYSTEM.md`; reuse its semantic tokens, component recipes, responsive rules, and accessibility states.”
