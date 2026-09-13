# CMS content and atomic publication

Status: complete and locally verified. This is Task 4 from `STEP_4_BACKEND_DESIGN.md`.

## Scope

Provide Payload-admin editing for the landing page and a questionnaire draft's display definition using basic fields. A server-only publication service validates the draft, creates an immutable published snapshot with a SHA-256 content hash, advances the questionnaire publication pointer, and creates the next editable draft in one database transaction.

## Acceptance criteria

- Authenticated administrators can edit the landing global and questionnaire draft category/question fields; anonymous generic Payload access remains denied.
- Only the publication service can create a published questionnaire version. Published versions reject ordinary updates and deletes.
- Publishing validates stable keys, references, question type/options, and selection limits before any publication pointer moves.
- Competing attempts cannot publish the same version number. A failed publish leaves no partial publication or draft pointer change.
- A published version contains an immutable canonical definition and hash; the next draft is a copy that can be edited independently.

## Exclusions

Public assessment read endpoints, session/submission ownership, scoring configuration, relational question children, cache invalidation outbox, and UI-adapter integration are later tasks.

## Verification results

- A fresh `workflow_task4_check` PostgreSQL database applied both migrations with `PAYLOAD_SCHEMA_PUSH=false`, then seeded editable landing and questionnaire content.
- The publication verification exercised a real transaction: published version creation, a 64-character SHA-256 snapshot hash, normal-edit rejection for the published version, and two concurrent publishes with exactly one winner.
- The previous Task 3 seed was migrated safely: its unpublished placeholder draft was upgraded with editable foundation content, while existing content remained unchanged on later seeds.
- `npm run typecheck`, `npm run lint`, `npm test` (15 tests), and the production build passed.
