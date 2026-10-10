# 0019. Scan the React code with React Doctor in CI

Status: Accepted. Partly superseded by [0023](0023-react-doctor-score-off.md): the score is off, because React Doctor's servers compute it from the findings.
Date: 2026-10-08

## Context

The app is built with Claude Code, an AI coding assistant. AI agents tend to leave patterns that pass lint, typecheck and tests but still make React code worse, such as effects that should be derived state, array indexes as keys, unsafe casts and needless re-renders. ESLint with the React hooks rules catches some of them. The owner wanted a check aimed at the rest.

A first scan on 2026-10-08 found 23 warnings and no errors in 116 files. Each one was read against the code, and none was a real bug. They were index keys on lists that never reorder, lookups in arrays of six items or fewer, a one-time import that saves items in order, non-component exports in component files, and one context value in a shadcn component.

## Options

- React Doctor ([millionco/react-doctor](https://github.com/millionco/react-doctor)). A scanner with fixed rules for React: state and effects, performance, accessibility, security and maintainability. Its GitHub Action reports only the issues a pull request adds. It is a third-party action with write access to pull requests, and it sends anonymous usage data unless that is turned off.
- anti-slop ([dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop)). Strict lint rules for TypeScript and JavaScript patterns, copied into the repo. It needs Oxlint, so it would run beside ESLint as a second linter.
- Vercel's react-best-practices agent skill ([vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)). Guidance the agent reads while it writes code. It checks nothing, and it leans toward Next.js.
- aislop ([scanaislop/aislop](https://github.com/scanaislop/aislop)). A scanner for many languages, less focused on React.

## Decision

`.github/workflows/react-doctor.yml` runs React Doctor on every pull request and every push to `main`. It is advisory: it comments on pull requests and never fails the check.

- `directory: app`, because the app is in `app/`. Without it, inline comments point at paths that don't exist.
- The action is pinned to a commit, because it can write to pull requests.
- Telemetry is off (`REACT_DOCTOR_NO_TELEMETRY`).

## Consequences

- A pull request gets a summary comment, and inline comments on new issues only. Warnings already on `main` don't appear on it.
- Pushes to `main` scan the whole app, so the existing warnings show in that run.
- The check can't block a merge. To make it blocking, set `blocking: warning` or `blocking: error` once its findings prove useful.
- Updating the action means changing the pinned commit by hand.
- With telemetry off, the health score may not appear in the commit status.
- Each finding needs reading against the code before a fix. In the first scan, none of the 23 was a real bug.
