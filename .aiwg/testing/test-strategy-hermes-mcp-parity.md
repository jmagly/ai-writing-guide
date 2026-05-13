# Test Strategy: Hermes MCP Parity

**Status**: Draft
**Date**: 2026-05-13
**References**:
- @.aiwg/architecture/sketch-hermes-mcp-parity.md
- @.aiwg/risks/risks-hermes-mcp-parity.md

## Scope

End-to-end validation of: the new MCP surface (~25 new tools), the Hermes deployer changes (path fix, AGENTS.md inlining, `.hermes.md`), and the migration path for existing Hermes users.

## Test Layers

### L1 — Unit (server.mjs tool handlers)

Each new MCP tool gets a unit test that exercises:
- Schema validity (JSON Schema parses; matches MCP spec)
- Happy path (valid args → expected result shape)
- Error paths (invalid args, missing project root, missing artifact)
- Security gates (`command-run` rejects non-allowlisted commands; `confirmed: true` required for destructive)

Coverage target: ≥80% on `src/mcp/server.mjs`. Per-tool min ≥5 cases.

### L2 — Integration (MCP server ↔ AIWG subsystems)

- `discover` returns same shape as `aiwg discover --json` CLI
- `skill-show` returns same body as `aiwg show skill <name>`
- `command-run` end-to-end: tool call → CLI dispatch → exit code + stdout/stderr propagation
- Storage subsystem tools (memory, kb, etc.) round-trip values through `resolveStorage()`
- Notifications: `aiwg use sdlc` triggers `notifications/tools/list_changed`

### L3 — Hermes integration (UAT)

- Greenfield session test: clean Ollama setup, `hermes mcp add aiwg --command aiwg --args mcp serve`, verify all 25+ tools enumerate
- Skill recursion test: deploy `aiwg use --provider hermes`, verify Hermes scans `~/.hermes/skills/.aiwg/` and lists kernel + standard skills
- AGENTS.md inlining test: confirm top-6 rules present, total ≤20K chars
- Curator survival test: deploy skills, wait simulated 7-day Curator pass, verify AIWG flag prevents archival (or document fallback)
- Migration test: pre-populate `~/.hermes/.aiwg/skills/` with old layout, run `aiwg refresh --provider hermes`, verify migration to new path + cleanup of old

### L4 — Cross-platform regression

- Deploy SDLC to claude, codex, copilot, cursor, factory, warp, windsurf, opencode, openclaw — verify no regressions
- Verify the 4 working MCP tools (`artifact-read`, `artifact-write`, `template-render`, `agent-list`) unchanged in behavior
- Verify `workflow-run` returns deprecation hint, still doesn't crash

## Test Data

- Sample `.aiwg/` corpus with: 5 use cases, 2 ADRs, 1 SAD, 1 test plan, 1 risk register (for `artifact-read` tests)
- Fixtures for index queries: known skills/agents/commands/rules with deterministic scores
- Stub Ollama / mock Hermes MCP client for L3 tests where real Ollama unavailable

## Quality Gates

| Gate | Criterion | Owner |
|------|-----------|-------|
| Unit coverage | ≥80% on changed files | CI |
| All L1 tests pass | 0 failures | CI |
| MCP schema validity | All tools validate against MCP 2025-11-25 spec | CI |
| Schema budget | Default toolset ≤2.5K tokens | CI lint |
| Tool name lint | No collision after `[^A-Za-z0-9_]` → `_` | CI lint |
| UAT pass on real Hermes | All L3 scenarios green | manual gate before stable tag |
| `npm run uat` | All 9 existing UAT tests pass | CI |
| `npm run uat:serve-live` (optional) | Pass when sandbox available | CI |

## Reproducibility

All tests run in strict mode (temperature=0, fixed seed) where ML/LLM behavior is involved. Hermes integration tests (L3) pin the Hermes version under test in `.aiwg/working/hermes-uat/version.txt` and re-run on Hermes minor bumps.

## Out of Scope

- Performance benchmarking against Hermes's native skill execution (separate epic if needed)
- Multi-Hermes-instance / cross-session state tests (separate epic if Ralph/MC support multi-tenant)
- Cross-OS testing (Windows-specific path handling) — covered by base AIWG CI matrix
