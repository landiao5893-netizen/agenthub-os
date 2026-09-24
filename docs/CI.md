# CI

AgentHub OS uses **GitHub Actions** for continuous validation.

## What CI does

On every push to `main` and every pull request targeting `main`, the `CI` workflow
(runs on `ubuntu-latest`, Node.js 18) executes in order:

1. `npm ci` — install dependencies from the lockfile
2. `npm run lint` — ESLint (via `next lint`)
3. `npm test` — offline Vitest suite (mock runtime, quality gate, runtime dispatch)
4. `npm run build` — production build of the Next.js app

Status badge:

[![CI](https://github.com/landiao5893-netizen/agenthub-os/actions/workflows/ci.yml/badge.svg)](https://github.com/landiao5893-netizen/agenthub-os/actions/workflows/ci.yml)

## Why CI never calls paid APIs

Every step of the pipeline is fully offline:

- The test suite only exercises the **built-in Mock runtime**, the **Supervisor quality gate**, and the **runtime engine dispatch path**. No real LLM, image, video, Hermes, OpenClaw, or external provider is contacted (the mock-runtime test even instruments `fetch` and asserts it is never called).
- `npm run build` compiles the application; it performs no network requests to model providers.
- The workflow contains no secrets and no API tokens. The only environment variables defined are dummy build-time values.

## Test environment variables

The build step requires the two variables that the auth module validates at build time:

| Variable | CI value (dummy) | Purpose |
|---|---|---|
| `AGENTHUB_PASSWORD` | `ci-test-password` | satisfies the auth env check at build time |
| `AGENTHUB_SESSION_SECRET` | `ci-test-session-secret-please-use-32-chars` | satisfies the auth env check at build time |

These are **fake values** used only to let the compiler collect page data. They are never
used at runtime and never touch a real server. No real credential is ever placed in CI.

## Reproducing locally

The CI sequence is exactly:

```bash
npm ci          # or: npm install (uses repo .npmrc)
npm run lint
npm test
AGENTHUB_PASSWORD=ci-test-password \
AGENTHUB_SESSION_SECRET=ci-test-session-secret-please-use-32-chars \
npm run build
```

If this passes locally on Node 18, the same steps pass in CI (same lockfile, same scripts).