# TypeScript + React Engineering Guidelines

Apply these rules whenever changing TypeScript, JavaScript, React, CSS, or
browser-facing code in this repository.

## Core principles

- Optimize for the next reader: use explicit names, small modules, and
  unsurprising control flow.
- Keep one source of truth for each fact. Derive values instead of duplicating
  state.
- Put behavior at the narrowest sensible layer: components render and
  coordinate, API clients transport data, hooks own reusable stateful behavior,
  and pure helpers transform data.
- Treat loading, empty, error, retry, success, permission, accessibility, and
  responsive states as part of the requirement.
- Keep changes scoped. Do not reformat or refactor unrelated files.

## TypeScript

- Do not introduce implicit `any`. Use `unknown` at untrusted boundaries and
  narrow it with validation.
- Reuse domain types from their owner instead of recreating API shapes.
- Model finite values with unions or enums, and distinguish intentional `null`
  from an omitted optional field.
- Prefer discriminated unions to related boolean flags when only some
  combinations are valid.
- Avoid non-null assertions and assertions used only to silence uncertainty.
- Use `import type` for type-only imports.

## React

- Use focused components with one recognizable responsibility. Extract
  substantial nested UI or reusable stateful behavior.
- Keep render logic declarative; move meaningful transformations into named
  pure helpers.
- Use stable domain IDs as list keys, never array indexes for mutable lists.
- Do not mutate props, state, or fetched data.
- Do not copy props into state unless the component deliberately owns an
  editable draft and defines its reset behavior.
- Use effects only to synchronize with external systems. Include complete
  dependencies and clean up acquired resources.
- Guard asynchronous completion from stale responses; prefer `AbortController`
  where supported.

## Forms, errors, and accessibility

- Use controlled form fields where validation, submission, or reset behavior
  matters.
- Make repeated user actions safe: disable or deduplicate while requests are
  pending, and ensure server operations can be retried safely.
- Show actionable errors; never silently discard a failed user action.
- Prefer native semantic controls. Every interactive element must be keyboard
  reachable, visibly focusable, and have an accessible name.
- Communicate loading, validation, and live changes without relying on color.
- Keep DOM order logical across responsive layouts and respect reduced-motion
  preferences.

## Security and privacy

- Treat browser input, storage, URLs, files, and API data as untrusted.
- Validate data at the boundary and encode URL segments and redirects.
- Never expose secrets or tokens in client code, logs, test output, or
  user-facing errors.
- Do not render untrusted HTML without a reviewed sanitization boundary.

## Verification

- Add or update focused tests for changed behavior and practical regressions.
- Run applicable formatting, lint, type checking, tests, and production build
  commands.
- Review the diff for accidental logging, dead code, unsafe assertions,
  missing cleanup, and unrelated changes.
