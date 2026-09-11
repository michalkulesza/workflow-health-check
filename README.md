# Workflow Check prototype

A clickable Step 3 prototype of a workflow assessment for creative professionals. It uses Next.js, React, TypeScript, and React Hook Form.

## Run it

Requires a current Node.js release.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. The stable questionnaire route is `http://localhost:3000/q/5dc13945-9cb8-4e6b-b504-187c885e0e34`.

Checks:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test:e2e
npm.cmd start
```

## Review scenarios

Expand **Prototype scenarios** at the bottom of the landing page. Each scenario is also available with `?scenario=` on the questionnaire route: `happy`, `one`, `healthy`, `clarification`, `insufficient`, `save-failure`, `resume`, `ai-failure`, `notification-error`, and `contact-error`. Alternative scenarios preload fictional answers and open near the state they demonstrate, so they do not require all 16 questions to be repeated.

Mock cross-device report states are at `/report/ready-demo` and `/report/expired`. The **Reset prototype progress** control clears local progress for the current fixture.

The happy path accepts arbitrary answers and uses configured deterministic scoring helpers for the rule-based categories. Because no real AI runs in this step, the completed happy-path narrative is a named sample report tied to the fictional scenario answers; it must not be treated as analysis of arbitrary free text.

## Working and simulated boundaries

Working UI includes the landing page, data-driven questions, validation, selection limits and exclusivity, required accompanying text, review/edit navigation, local same-browser persistence, one clarification, result variants, contact and notification form states, responsive layouts, focus handling, reduced motion, and noindex metadata on questionnaire/report routes.

All services are local mocks. Browser storage stands in for PostgreSQL persistence; fixed adapters stand in for Payload content, Gemini evaluation, Resend notification, authentication/private report links, and lead creation. No email is sent and no personal data should be entered during review. The questionnaire UUID identifies public content and is not used as a private submission credential.

## Step 4 decisions retained

Production still needs decisions on evidence coverage, retry/backoff and clarification recovery, session and expiring-report security, data retention/access rules, Q5 and Q9 scoring validity, Q7’s provisional last value, required flags, Q13 wording, overlapping Q2 labels, and rubric calibration. Payload/PostgreSQL integration, authentication, Gemini, Resend, Docker deployment, and the admin pipeline remain outside this prototype.
