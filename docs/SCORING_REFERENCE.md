# Questionnaire scoring reference

Last updated: 2026-09-11.

This records the scoring decisions from the design interview. It is a reference for the future implementation and master plan, not an implemented scoring engine. Items marked **provisional** or **unresolved** still need a decision.

## Shared rules

- Every scored question or grouped AI evaluation returns a normalized score: **0 = worst, 1 = best**.
- `clamp(x, 0, 1) = min(1, max(0, x))` applies to every scoring formula.
- Questions have CMS-configurable weights, defaulting to 1 (equal weight).
- A grouped AI rubric contributes one weighted score, not one copy per answer.
- Unscored answers inform AI analysis and recommendations without contributing points.
- Required/optional is configurable per question in the CMS.
- A skipped or insufficient answer is missing evidence, never a zero score.
- Explicit “Not applicable” answers are excluded from expected scoring weight.
- Options, weights, curves, rubrics, and thresholds are CMS data. Editing them should require no deployment or schema change.
- Published versions freeze questions and scoring settings. Each submission references its exact version. Recalculation creates a new scoring run instead of overwriting history.

## Category calculation

For usable scores `s_i` and their configured weights `w_i`:

```text
categoryNormalizedScore = clamp(sum(w_i * s_i) / sum(w_i), 0, 1)
categoryPoints = categoryNormalizedScore * category.maxPoints
```

Only usable scores enter this average. Missing evidence is handled separately through coverage; it does not become zero. If there are no usable scores, there is no numeric category score.

**Agreed default:** each scored category has a maximum of 20 points, editable per category in the CMS.

Example: scores 0.75, 0.80, and 0.50 with equal weights average to approximately 0.6833. A category with a 20-point maximum receives approximately 13.67 points.

### Evidence coverage

Coverage is in scope. Its proposed calculation is:

```text
coverage = usableScoringWeight / expectedApplicableScoringWeight
```

Explicit “Not applicable” answers reduce the expected applicable weight. Skipped and insufficient answers remain missing evidence. Categories below the configured minimum have their score withheld and are excluded from priority selection. No applicable scoring weight means no numeric score.

**Provisional:** 60% minimum coverage was suggested, but not finalized. Review the threshold and edge cases before implementation.

## 01. Your work — unscored

Q1 (type of creative work), Q2 (active project count), and Q3 (non-creative time use, choose up to four) provide context only.

## 02. Following a project — scored

### Q4: Finding the status of Project X

Single choice; the selected option supplies the score.

| Answer | Score |
| --- | ---: |
| I can see it immediately | 1.00 |
| I check one place | 0.75 |
| I check a couple of places | 0.50 |
| I search through messages/emails/files | 0.25 |
| I usually need to reconstruct what's happening | 0.00 |

### Q5: Where project information lives

Strategy: `multi_select_quality_quantity`.

| Option | Quality value |
| --- | ---: |
| Notion / Airtable | 1.00 |
| Project management software | 1.00 |
| Google Drive / Dropbox | 0.80 |
| Spreadsheet / Google Docs | 0.65 |
| Calendar | 0.65 |
| Notes | 0.50 |
| Email | 0.30 |
| WhatsApp / DMs | 0.15 |
| Somewhere else | 0.50 |
| Mostly in my head | 0.00 |

“Somewhere else” requires accompanying text. Its default quality is 0.50; the current formula does not ask AI to reclassify that text.

Quality is the average value of selected options. Quantity is determined by selection count:

| Selected options | Quantity score |
| --- | ---: |
| 1 | 1.00 |
| 2 | 0.80 |
| 3 | 0.55 |
| 4 | 0.30 |
| 5 or more | 0.00 |

```text
quality = sum(selected option values) / selected option count
score = clamp(0.60 * quality + 0.40 * quantity, 0, 1)
```

**Agreed override:** if “Mostly in my head” is the only selected option, score 0. Otherwise, it participates in the normal average and selection count. The override must be declarative CMS configuration, not executable JavaScript entered by the admin.

Examples:

| Selection | Calculation | Score |
| --- | --- | ---: |
| Notion / Airtable only | 0.60 × 1 + 0.40 × 1 | 1.00 |
| Notion / Airtable + Google Drive / Dropbox | 0.60 × 0.90 + 0.40 × 0.80 | 0.86 |
| Email + WhatsApp / DMs | 0.60 × 0.225 + 0.40 × 0.80 | 0.455 |
| Somewhere else only | 0.60 × 0.50 + 0.40 × 1 | 0.70 |
| Mostly in my head only | Explicit override | 0.00 |
| Notion / Airtable + Mostly in my head | 0.60 × 0.50 + 0.40 × 0.80 | 0.62 |

Zero selected options is not a valid calculated score: use required-question validation or missing-answer handling.

### Q6: Knowing the next step

| Answer | Score |
| --- | ---: |
| The next step is clearly recorded | 1.00 |
| I have a task/list/calendar | 0.75 |
| I check messages or emails | 0.50 |
| I usually just know/remember | 0.25 |
| It depends on the project | 0.00 |

## 03. Other people — scored

### Q7: Tracking what you are waiting for

| Answer | Score |
| --- | ---: |
| It's recorded somewhere | 1.00 |
| Calendar/reminder | 0.75 |
| I remember it | 0.50 |
| I search the conversation when I need it | 0.25 |
| I often forget and realise later | **Proposed: 0.00** |

The final option had no explicit value in the supplied questionnaire; confirm 0.00.

### Q8: Collaboration problems

Strategy: `multi_select_weighted`. Below, penalties are positive magnitudes to subtract from health, avoiding ambiguity about subtracting negative numbers.

| Problem | Penalty |
| --- | ---: |
| People don't know what they are supposed to do | 3.0 |
| I forget to follow up | 2.0 |
| People forget things | 1.5 |
| Information gets lost in messages | 2.0 |
| I have to repeat the same information | 1.5 |
| Nobody is sure what the latest version is | 2.5 |
| Deadlines move without being updated | 2.5 |
| Collaboration works pretty smoothly | 0.0 |
| Something else | 1.5 |

**Agreed denominator: 16.5**, including “Something else.” That option requires text. “Collaboration works pretty smoothly” is exclusive and scores 1.

```text
score = clamp(1 - sum(selected penalties) / 16.5, 0, 1)
```

Examples:

- Forgetting to follow up + unclear latest version: `1 - 4.5 / 16.5 ≈ 0.7273`.
- All seven named problems without “Something else”: `1 - 15 / 16.5 ≈ 0.0909`.
- All problems including “Something else”: `0`.

The penalty sum already increases with the number of selected problems. There is no additional quantity multiplier in this agreed formula.

## 04. The admin layer — scored

### Q9: Administrative tasks managed manually

Strategy: `multi_select_count`.

The nine named tasks are contracts/agreements, invoices, payment tracking, file organisation, scheduling, deliverables, client/collaborator information, rights/credits information, and recurring tasks.

- **“Other” remains**, requires accompanying text, and counts as one manual task.
- **“None of these” remains**, is exclusive, and scores 1. It does not count as a task.

**Agreed initial curve:**

```text
score = clamp(1 - selectedTaskCount / 10, 0, 1)
```

Examples: 2 tasks → 0.8; 5 tasks → 0.5; all 10 → 0. The curve is editable in the CMS. An unanswered question is missing evidence, not “None of these.”

### Q10: Recurring work

| Answer | Supplied score |
| --- | ---: |
| It's built into a system/process | 1.00 |
| I have a recurring reminder | 0.75 |
| I use a checklist/template | 0.50 |
| I remember to do it | 0.25 |
| I deal with it when it comes up | 0.00 |
| I don't really have recurring tasks | Not applicable — excluded from scoring and expected coverage weight |

**Agreed:** no recurring tasks is not applicable, rather than a perfect score. If Q9 scores 0.40 and Q10 is not applicable, this category scores 0.40 × 20 = 8/20 (40%), with full evidence coverage when Q9 is its only applicable scoring unit. Awarding Q10 full points instead would produce 14/20 (70%) with equal weights; that approach was rejected.

## 05. Your own friction — AI-scored

Q11–13 are evaluated together with one category-level rubric:

- Q11: What is the most frustrating part of running your creative work?
- Q12: What do you find yourself repeatedly doing that feels unnecessarily manual?
- Q13: Think about the last time you felt overwhelmed by your workload. What caused it, how did you handle it, and has anything changed since?

The Q13 revision was recommended and permission to revise the questionnaire was given; final wording remains editable.

**A high score means effective management of work despite frustrations.** It does not simply mean little reported frustration. Evaluate evidence of control, repeatability, and recovery from problems. Use frustration and impact when selecting priorities.

### Rubric structure

The CMS defines five levels, each with a description and example answer:

| Level | Normalized score |
| --- | ---: |
| 1 — weakest | 0.00 |
| 2 | 0.25 |
| 3 | 0.50 |
| 4 | 0.75 |
| 5 — strongest | 1.00 |

AI selects a level and explains its choice, or returns insufficient information. Initial level descriptions, example answers, and evaluation guidance are drafted in [AI_RUBRIC_INITIAL.md](AI_RUBRIC_INITIAL.md) for initial CMS content and review. CMS rubrics can evaluate a single question or a group and specify which other answers provide context, together with model/prompt versions.

AI scores affect customer results immediately, without human review. Relevant unscored answers can inform evaluation and the final summary without directly earning points.

### Clarification and failure handling

- Evaluate after the main questionnaire so all context is available.
- If evidence is insufficient, ask one targeted follow-up. If it remains insufficient, mark the evaluation unknown instead of assigning zero. Save both original and follow-up answers.
- Retry Gemini a few times on temporary failure; exact retry count and timing remain to be configured.
- If retries fail, show available deterministic results, clearly mark AI-dependent analysis pending, and offer optional notification through Resend.
- The notification uses a private, expiring report link that works on another device. It does not automatically create a sales lead.

## 06. The magic question — unscored

Q14 (what they would delegate forever), Q15 (where they want a better system), and Q16 (estimated weekly time lost) provide context and impact signals only. They do not directly contribute points.

## Selecting and displaying priorities

- Category health and recommended intervention priority are separate concepts.
- Compare categories using normalized scores, not raw points with different maximums.
- Each scored category has a CMS-configurable attention threshold, initially **below 60%** (`categoryNormalizedScore < 0.60`). With a 20-point maximum, this means below 12 points. Exactly 60% is not below the threshold. Compare unrounded scores.
- Categories below their threshold and with sufficient evidence are eligible. Gemini selects up to two using scores, reported impact, and business context, and explains its choices.
- The customer initially sees only the selected priority categories, personalized explanations, and a practical first step. Do not generate detailed reports for every other category upfront.
- All relevant answers, including unscored sections, still inform the analysis.
- Allow “No major issues identified” rather than forcing a negative finding. Keep the configurable CTA available.
- An incomplete AI assessment must not be represented as a completed finding of no issues.

## CTA and lead capture

- Results have no email gate.
- The CTA collects required email, optional name, and an optional message, linked to the assessment.
- Submitting the CTA creates a New lead in the admin pipeline: New → Contacted → In progress → Closed.
- Email provided only for a delayed-report notification does not create a sales lead.

## Review TODOs for the master plan

- [ ] Review minimum scoring coverage, the provisional 60% threshold, grouped AI scores, skipped questions, and insufficient answers. Coverage stays in scope; this TODO is for tuning it. Explicit “Not applicable” answers remain excluded from expected weight.
- [ ] Review Q5 tool-choice scoring. A well-maintained spreadsheet may outperform a neglected Notion workspace; multiple tools do not necessarily mean fragmentation. Consider keeping the tool list as unscored context and adding: **“How reliably can you find the current information you need for a project?”** Keep current Q5 wording and scoring for now.
- [ ] Review Q9 manual-task scoring. Manually sending two invoices per month may work perfectly well. Consider keeping the manual-task list as unscored context and adding: **“How often do administrative tasks get delayed, missed, or need redoing?”** Keep current Q9 wording and count-based strategy for now.
- [x] Confirm Q9's initial linear count curve: `clamp(1 - selectedTaskCount / 10, 0, 1)`.
- [ ] Explicitly confirm Q7's final option value (proposed: 0).
- [x] Treat Q10's “I don't really have recurring tasks” as not applicable, excluding it from scoring and expected coverage weight.
- [x] Draft five friction-rubric levels and examples as initial CMS content in AI_RUBRIC_INITIAL.md.
- [ ] Review the initial rubric against representative answers and confirm final Q13 wording.
- [x] Set initial category maximum points to 20 and attention thresholds to below 60%, both CMS-editable.
- [ ] Finalize the separate minimum evidence coverage threshold; the suggested 60% coverage remains provisional.
- [ ] Define deterministic tie-breaking/fallback priority behaviour if AI selection is unavailable, without implying AI analysis has completed.
- [ ] Carry this reference and its unresolved decisions into the final master plan Markdown file.
