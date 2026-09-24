# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-24

### Added

- Initial AgentHub OS application (Next.js 14 App Router, TypeScript)
- Multi-agent management interface (per-agent configuration, profiles, team view)
- Multi-agent chat (direct and group modes, Markdown rendering, file preview)
- Agent status monitoring (idle / working / waiting)
- Provider configuration with server-side encrypted API-key storage
- Workflow canvas (visual multi-agent workflow orchestration)
- Controller / orchestrator foundations (task decomposition, parallel dispatch, result synthesis)
- Supervisor and quality-gate foundations (multi-dimension scoring, pass/warn/fail, recovery attempts)
- Memory foundations (per-agent persistent local memory)
- Shared workspace foundations (artifacts, downloads)
- Runtime engine and adapters (Hermes, OpenClaw, generic LLM, Mock)
- Authentication and session handling (HMAC-signed session cookie, timing-safe password check)
- Knowledge extraction (document upload and text extraction)
- Hermes integration (chat-run, image generation, video generation API routes)
- Embedded Python worker for Hermes runtime
- Project documentation (EN + ZH), architecture and security model docs
- UI screenshots (dashboard, workflow canvas, login)
- Open-source essentials: MIT license, contributing and security guidelines, roadmap, changelog, audit and validation reports