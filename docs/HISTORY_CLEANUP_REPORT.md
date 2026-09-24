# AgentHub OS — History Cleanup Report

- **Date**: 2026-09-24 (UTC)
- **Repository**: landiao5893-netizen/agenthub-os
- **Status**: completed with owner approval

## Summary

- Historical private business data was detected in early commits.
- No API keys, tokens, passwords, or cookies were found.
- Git history was rewritten with owner approval.
- The sensitive paths and sensitive text were removed from all reachable refs.
- A fresh clone verification was completed.
- CI passed after the rewrite.
- Details that could re-expose private business information have been intentionally redacted.

## What was done

1. **Preflight freeze**: remote `main` SHA, tags, release, and CI state were recorded before any change; the remote was re-checked before pushing.
2. **Local backup**: a mirror clone and a full `git bundle --all` were created and verified locally. The backup was never uploaded anywhere.
3. **History rewrite** (via `git filter-repo`, on an isolated mirror clone):
   - Removed the private E2E artifacts and development logs from all reachable commits.
   - Removed older versions of public reports that restated private business details.
   - No `git filter-branch`, no `git push --mirror`, no unconditional force push — branch push used `--force-with-lease` against the recorded preflight SHA.
4. **Verification**:
   - Fresh clone history scan: CLEAN (sensitive paths and text unreachable from all refs).
   - LICENSE, README (EN/ZH), `.github/workflows/ci.yml`, `tests/`, `examples/` all present.
   - Tag `v0.1.0` preserved and re-pointed to its rewritten equivalent commit; the GitHub Release remains bound to it.
   - `npm ci`, `npm run lint`, `npm test`, and `npm run build` all pass.
   - GitHub Actions CI: success.

## Notes

- Reachable history is clean. GitHub may retain unreachable cached objects temporarily; if physical purging of cached views is ever required, contact GitHub Support.
- No credentials were found, so no secrets require rotation.
- Reports in this repository now use generic descriptions (e.g. "private business data", "private endpoint") instead of concrete values.