# Prototype engineering decisions

These decisions specialize the portable TypeScript/React guidelines for the Step 3 prototype.

- Package manager: npm, pinned in `package.json`; pnpm is unavailable in the current Windows environment.
- Runtime and package versions: `package.json` and `package-lock.json`.
- App directory: repository root using the Next.js App Router.
- State and services: local React state plus typed mock adapters. No remote server state exists in Step 3, so React Query is deferred with the production API.
- Styling: tokenized plain CSS. The handoff asks for a small prototype with styling dependencies used sparingly; Tailwind may be reconsidered when the V2 Figma system is implemented.
- Component library: none.
- Internationalization: English-only prototype fixture content. Locale infrastructure is deferred until supported production locales are chosen.
- Unit tests: Vitest.
- Browser and accessibility tests: Playwright with axe-core.
- Error reporting: none in the local-only prototype.

The prototype retains all integration boundaries: Payload, PostgreSQL, Gemini, Resend, authentication, private report links, deployment, and production error reporting remain Step 4 work.
