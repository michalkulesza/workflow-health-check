# Workflow Check prototype

A clickable Step 3 prototype of a workflow assessment for creative professionals. It uses Next.js, React, TypeScript, and React Hook Form.

## Run it

The backend compatibility spike adds Payload at `/admin` and a separate fixture worker. See [backend setup](docs/backend-spike-setup.md) for database, server environment, admin bootstrap, and durable-job verification. Assessment data still uses prototype mocks at this stage.

Requires a current Node.js release.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. The stable questionnaire route is `http://localhost:3000/q/5dc13945-9cb8-4e6b-b504-187c885e0e34`.

To show live scoring details for each question, copy `.env.example` to `.env.local`, set `NEXT_PUBLIC_SCORING_DEBUG=true`, and restart the development server. The developer panel shows selected inputs, the configured formula, normalized score, and current point contribution on question and review screens. The flag is client-visible and must remain disabled for the normal customer experience.

For access from another device on your LAN, run `npm.cmd run dev -- --hostname 0.0.0.0` and open `http://<computer-LAN-IP>:3000`. Development origins in the private IPv4 ranges `192.168.*.*`, `10.*.*.*`, and `172.16.*.*` through `172.31.*.*` are allowed by `next.config.mjs`, including hot reload. Restart the dev server after changing this configuration. This setting allows origin hostnames; it does not change firewall rules or production access. IPv6 addresses and custom LAN hostnames need explicit entries if used.

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

If the development server is already running, point the browser tests at it:

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
npm run test:e2e
```

## Review scenarios

Expand **Prototype scenarios** at the bottom of the landing page. Each scenario is also available with `?scenario=` on the questionnaire route: `happy`, `one`, `healthy`, `clarification`, `insufficient`, `save-failure`, `resume`, `ai-failure`, `notification-error`, and `contact-error`. Alternative scenarios preload fictional answers and open near the state they demonstrate, so they do not require all 16 questions to be repeated.

Mock cross-device report states are at `/report/ready-demo` and `/report/expired`. The **Reset prototype progress** control clears local progress for the current fixture.

The happy path accepts arbitrary answers and uses configured deterministic scoring helpers for the rule-based categories. Because no real AI runs in this step, the completed happy-path narrative is a named sample report tied to the fictional scenario answers; it must not be treated as analysis of arbitrary free text.

## Working and simulated boundaries

Working UI includes the landing page, data-driven questions, validation, selection limits and exclusivity, required accompanying text, review/edit navigation, local same-browser persistence, one clarification, result variants, a separate full-screen contact and confirmation flow, notification form states, responsive layouts, focus handling, reduced motion, and noindex metadata on questionnaire/report routes.

An opt-in environment-controlled scoring panel is available for prototype review. It explains deterministic scoring only; Q11–Q13 remain one grouped simulated AI score and therefore do not produce live per-question points.

All services are local mocks. Browser storage stands in for PostgreSQL persistence; fixed adapters stand in for Payload content, Gemini evaluation, Resend notification, authentication/private report links, and lead creation. No email is sent and no personal data should be entered during review. The questionnaire UUID identifies public content and is not used as a private submission credential.

## Step 4 decisions retained

Production still needs decisions on evidence coverage, retry/backoff and clarification recovery, session and expiring-report security, data retention/access rules, Q5 and Q9 scoring validity, Q7’s provisional last value, required flags, Q13 wording, overlapping Q2 labels, and rubric calibration. Payload/PostgreSQL integration, authentication, Gemini, Resend, Docker deployment, and the admin pipeline remain outside this prototype.
