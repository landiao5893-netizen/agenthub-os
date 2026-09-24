# AgentHub OS Roadmap

This roadmap reflects the actual state of the codebase. "Current" lists what exists today; anything else is planned work. No dates are promised.

## Current

Implemented as of v0.1.0:

- Multi-agent dashboard and management interface
- Multi-agent chat (direct and group modes, Markdown rendering)
- Agent status monitoring (idle / working / waiting states)
- Provider configuration with encrypted API-key storage
- Workflow canvas
- Controller / orchestration foundations (task decomposition, parallel dispatch, synthesis)
- Supervisor / quality-control foundations (5-dimension scoring, pass/warn/fail, failure recovery)
- Memory foundations (per-agent persistent memory)
- Shared workspace foundations (artifacts, downloads)
- Runtime engine with Hermes, OpenClaw, generic LLM, and Mock adapters
- Authentication and session handling (HMAC-signed cookie)
- Knowledge extraction (document upload → text extraction)
- Project documentation (EN + ZH), screenshots
- GitHub Actions CI (lint + offline tests + build on push/PR)
- Offline automated test suite (8 tests: mock runtime, quality gate, engine dispatch, end-to-end pipeline)
- Reproducible offline examples (`examples/mock-content-pipeline`, `examples/mock-dev-pipeline`)

## Next

- Improve Codex integration (no Codex-specific adapter exists yet)
- Improve Hermes integration
- Improve OpenClaw integration
- Standardized runtime adapter interface (unify `src/adapters/` and `src/runtime-engine/adapters/`)
- Better workflow execution tracing
- Better task state persistence
- Better failure recovery
- Permission controls for agent actions
- Secret isolation improvements
- Audit logs
- Improved documentation and onboarding
- Reusable multi-agent workflow examples
- More tests (unit tests for quality gates, auth, provider store)

## Future

- Plugin ecosystem
- Remote runtimes
- Reusable workflow templates
- Agent evaluation and benchmarking
- Shared workspaces across projects
- Community-provided adapters
- More provider integrations
- Better sandboxing for runtime execution
- Permission policy engine

## Guiding principles

- Never claim a feature is finished unless it is verifiable in the code.
- Keep the project honest and early-stage: no fabricated metrics, no fake adoption.
- Prefer small, verifiable increments over large rewrites.