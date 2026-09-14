# General Engineering Guidelines

This document contains portable instructions for AI/ML coding assistants. It
is intended to be symlinked into any project as an instruction file, such as
`AGENTS.md` or `CLAUDE.md`.

## Follow applicable guidelines

- Read and follow all instruction files that apply to the files and technology
  being changed.
- When a project uses TypeScript, JavaScript, React, CSS, Tailwind, web UI, or
  related frontend technology, always read and follow
  `typescript-react-guidelines.md` before planning or making changes.
- Treat repository-specific instructions as authoritative when they conflict
  with these general defaults.

## Specifications and documentation

- Put every newly created specification or Markdown planning document in
  `docs/specs/`. Create the directory if it does not exist.
- Keep the document updated while its implementation is in progress so that it
  reflects the current decisions and scope.
- After the implementation is finished and verified, move the document to
  `docs/specs/done/`. Create the `done` directory if it does not exist.

## New feature workflow

Follow these steps for every new feature. Do not begin implementation until the
requirements and technical approach are sufficiently settled.

| Step | What to do | Required outcome |
| --- | --- | --- |
| 1. Clarify | Define the user, problem, desired outcome, scope, and exclusions. Use `grill-me` when important details are unclear. | Short problem brief |
| 2. Specify | Define acceptance criteria, permissions, edge cases, and UI states. Prototype uncertain interactions. | Testable specification |
| 3. Plan | Inspect the codebase and propose an approach. Review architecture, data and API changes, risks, and recovery. | Reviewed plan divided into small tasks |
| 4. Build | Give the AI one bounded task with relevant context, constraints, acceptance criteria, and verification commands. Work on a branch or worktree. | Focused implementation |
| 5. Verify | Run checks, exercise the application, inspect the diff and tests, and resolve review findings. | Evidence that the requirements pass |
| 6. Release | Check configuration, migrations, monitoring, ownership, and rollback. Validate in staging or a preview environment. | Controlled release |
| 7. Observe | Check errors, performance, user feedback, and the original success measure. | Follow-up decisions |

### Ralph for feature work

Use Ralph during step 4, after the requirements are settled and completion can
be checked. A Ralph task must have:

- one bounded task with acceptance criteria;
- a branch or worktree and saved progress;
- an implement, check, and fix loop;
- a time, iteration, or spending limit;
- a stop condition for repeated failures or missing decisions;
- review of changes to tests and CI; and
- a reviewable final diff with verification evidence.

## New application workflow

Follow these steps when creating a new application.

| Step | What to do | Required outcome |
| --- | --- | --- |
| 1. Validate the problem | Identify the user, their problem, existing alternatives, and evidence that they need the app. Use `grill-me` to clarify and seek feedback from potential users. | Clear problem and target audience |
| 2. Define version 1 | Choose one core user journey. Set acceptance criteria, success measures, budget, and exclusions. | Small, explicit first-release scope |
| 3. Prototype the experience | Sketch screens and navigation. Prototype uncertain interactions. Include mobile, loading, empty, and error states. | A flow users understand |
| 4. Design the system | Have the AI propose the architecture, data model, APIs, authentication, hosting, and integrations. Review trade-offs and investigate unknowns. | Technical plan the team can explain |
| 5. Set up foundations | Create the repository, local setup, sample data, agent instructions, CI, secrets handling, and preview deployment. | Minimal app that builds and deploys reliably |
| 6. Build one complete journey | Implement the smallest useful path through the UI, backend, database, and permissions. Test it in the deployed preview. | One real use case working end to end |
| 7. Expand incrementally | For each feature, specify, plan, build, verify, and review. Use Ralph for bounded implementation tasks. | Reviewed version 1 |
| 8. Check launch readiness | Verify security, failure handling, accessibility, performance, monitoring, backups, and recovery. | Evidence the app is ready for initial users |
| 9. Launch small | Configure production, run smoke tests, invite an initial audience, and monitor. Assign responsibility for support. | Working app with real users |
| 10. Measure and iterate | Track task completion, usage, errors, costs, and feedback against the original goal. | Evidence for what to build next |

### Ralph for application work

Use Ralph during steps 6 and 7, after the relevant scope and technical approach
are settled. A Ralph task must have:

- one bounded task with clear acceptance criteria;
- a branch or worktree, saved progress, and verification commands;
- an implement, check, and fix loop;
- a time, iteration, or spending limit;
- a stop condition for repeated failures or missing decisions; and
- review of the diff, tests, and verification evidence before merging.

## Launch checklist

Before launching an application, confirm that:

- the core journey works in the deployed environment;
- permissions and important failure paths are tested;
- code and tests have been reviewed;
- production secrets and configuration are handled correctly;
- monitoring exists and a named owner will respond to failures;
- important data can be restored;
- the release can be disabled, rolled back, or repaired; and
- feedback can be collected and success can be measured.
