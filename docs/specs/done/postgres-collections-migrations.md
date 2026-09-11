# PostgreSQL collections, migrations, and admin bootstrap

Status: complete and locally verified. This is task 3 from `STEP_4_BACKEND_DESIGN.md`.

## Scope

Add the persistent collection foundations and migration workflow for versioned questionnaires, anonymous submissions, and answers. Preserve the existing protected admin bootstrap and prohibit public generic CRUD. Leads and notification requests are later task-specific collections, so they are deliberately excluded from this foundation.

## Acceptance criteria

- A fresh disposable PostgreSQL database can be migrated and seeded without schema push.
- A repeat seed is safe and does not overwrite an existing admin or duplicate stable bootstrap content.
- Database-level unique constraints for stable public questionnaire IDs, version numbers, and answer identity are exercised.
- Anonymous generic CRUD remains denied; admin access remains Payload-authenticated.

## Exclusions

CMS publication workflow, anonymous session ownership endpoints, autosave API integration, scoring, jobs, email, and UI adapter migration are separate later tasks.

## Verification results

- A fresh `workflow_migration_check` PostgreSQL database applied the generated migration with `PAYLOAD_SCHEMA_PUSH=false`; migration status reported the baseline as batch 1, ran.
- The initial seed created `Workflow Check` once; a second process reported that the foundation questionnaire already existed and made no change.
- PostgreSQL itself rejected duplicate questionnaire public IDs, duplicate version numbers for a questionnaire, and duplicate answer keys for a submission.
- Anonymous `GET /api/questionnaires` returned `403`; the existing Payload-authenticated admin boundary remains the only generic collection access path.
- `npm run typecheck`, `npm run lint`, `npm test` (15 tests), and the production build passed.
