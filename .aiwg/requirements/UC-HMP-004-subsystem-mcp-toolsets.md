# UC-HMP-004: Subsystem MCP Toolsets (Full Parity)

**Phase**: Elaboration | **Priority**: P1 | **Status**: Draft

## Reasoning

1. **Problem**: AIWG subsystems (memory, kb, reflections, provenance, research-store, activity-log, index, ralph, mc, ops) are CLI-only. Hermes users cannot reach them.
2. **Constraint**: Schema budget on 8K-Ollama. Exposing all subsystems naively could double schema cost.
3. **Alternatives**: (a) expose all subsystems by default (schema bloat); (b) skip subsystems for Hermes parity (rejected — user chose full parity); (c) opt-in via `AIWG_MCP_TOOLSETS` env (chosen — inspired by mcp-atlassian).
4. **Rationale**: Default core toolset stays lean; users who need a subsystem opt in explicitly. Same model used by production MCP servers with 70+ tools.
5. **Risk**: Operator confusion (R15) — mitigated by quickstart docs + startup hints.

## Primary Actor

Hermes user invoking subsystem operations via MCP.

## Goal

Every AIWG storage subsystem and orchestration primitive reachable via MCP, with opt-in surface control.

## Subsystems in Scope

| Subsystem | Tools |
|-----------|-------|
| memory | `memory-list`, `memory-get`, `memory-put`, `memory-delete`, `memory-append-log` |
| kb | `kb-list`, `kb-get`, `kb-put`, `kb-delete`, `kb-path` |
| reflections | `reflections-list`, `reflections-get`, `reflections-put`, `reflections-delete` |
| provenance | `provenance-list`, `provenance-get`, `provenance-put` |
| research-store | `research-list`, `research-get`, `research-put`, `research-path` |
| activity-log | `activity-log-show`, `activity-log-append`, `activity-log-stats` |
| index | `index-build`, `index-query`, `index-deps`, `index-stats` |
| ralph | `ralph-start`, `ralph-status`, `ralph-abort`, `ralph-attach` |
| mc | `mc-start`, `mc-dispatch`, `mc-status`, `mc-stop`, `mc-watch` |
| ops | `ops-status`, `ops-list`, `ops-use`, `ops-push` |

## Main Success Scenario

1. Operator sets `AIWG_MCP_TOOLSETS=core,memory,kb,ralph` in MCP server env.
2. MCP server registers core (always) + the named toolsets at startup.
3. `notifications/tools/list_changed` emitted to clients.
4. Hermes session sees the expanded tool list and uses it.

## Acceptance Criteria

- [ ] All 10 subsystems implemented as MCP toolsets in `src/mcp/server.mjs` (modular registration)
- [ ] `AIWG_MCP_TOOLSETS=core,memory,kb,...` parsed at server startup
- [ ] Default = `core` (no subsystems unless opted in)
- [ ] Each subsystem registration ≤500 tokens total schema
- [ ] Ralph/MC tools use session-id pattern (return immediately, status polling)
- [ ] All subsystem tools route through `resolveStorage(<subsystem>)` (no direct fs access)
- [ ] CLI: `aiwg mcp serve --toolsets=core,memory` flag mirrors env var
- [ ] Startup log lists registered toolsets clearly
- [ ] Quickstart docs explain toolset selection

## NFR

- Per-subsystem schema ≤500 tokens
- Core toolset + 3 enabled subsystems ≤4K tokens total schema
- Tool name length ≤30 chars

## Out of Scope

- RLM commands (experimental, defer)
- `aiwg run script` (security profile too open; gate behind `unsafe` toolset later)
- Cross-host A2A messaging
