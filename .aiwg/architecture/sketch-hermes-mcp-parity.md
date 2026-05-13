# Architecture Sketch: Hermes MCP Parity

**Status**: Draft (Elaboration phase)
**Objective**: Achieve full AIWG feature parity for Hermes users
**Owner**: AIWG MCP server
**Date**: 2026-05-13

## References

- @.aiwg/working/issue-planner/research-synthesis.md — consolidated findings
- @.aiwg/working/issue-planner/research-vendor-docs.md — Hermes source audit (v0.13.0)
- @.aiwg/working/issue-planner/research-best-practices.md — MCP design patterns
- @.aiwg/working/issue-planner/research-current-state.md — AIWG internal audit
- @src/mcp/server.mjs — current MCP server (5 tools)
- @tools/agents/providers/hermes.mjs — Hermes deployer

## Reasoning

1. **Problem analysis**: Hermes users cannot reach 90%+ of AIWG. Root causes: (a) standard skills (385) deploy to a path Hermes does not scan; (b) the post-#1212 discovery surface (`aiwg discover`/`aiwg show`) is CLI-only; (c) MCP server hardcodes 2 of 9 frameworks and stubs the only execution tool.
2. **Constraint identification**: Hermes is a Python MCP client with a static command registry, 20K-char AGENTS.md cap, 8K-32K local-Ollama context, recursive `os.walk` skill scan, and `notifications/tools/list_changed` support but unverified elicitation/tasks support.
3. **Alternative consideration**: (a) native deploy everywhere (only works for skills); (b) MCP-only surface (works for everything but no native discovery); (c) hybrid — native for native-capable artifacts, MCP for the rest, AGENTS.md for priming. Chose (c).
4. **Decision rationale**: Each artifact type has a different parity strategy because each carries different constraints. Skills are native (recursive walk works); commands and rules are MCP+AGENTS.md (no native surface possible); subsystems are MCP toolsets behind an env var (schema budget).
5. **Risk assessment**: Schema bloat on 8K-context setups (mitigated by toolset opt-in); curator pruning of AIWG skills (mitigated by metadata flag — verification pending); migration of existing skill paths (mitigated by idempotent migration helper).

## Three-Layer Parity Model

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Native Deploy                                       │
│ ─────────────────────                                        │
│ Kernel skills      → ~/.hermes/skills/        (~9 files)     │
│ Standard skills    → ~/.hermes/skills/.aiwg/  (~385 files)   │
│ Soul              → ~/.hermes/SOUL.md         (project soul) │
│ AGENTS.md         → project root              (routing)      │
│ .hermes.md        → project root              (thin pointer) │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Hermes loads natively)
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: MCP Surface (aiwg mcp serve)                        │
│ ─────────────────────────────────────                        │
│ Core toolset (~12 tools, always on)                          │
│   discover, command-list, command-run                        │
│   skill-list, skill-show, rule-list, rule-show               │
│   agent-list, agent-show                                     │
│   template-list, template-render, template-show              │
│   artifact-read, artifact-write                              │
│   index-query, index-deps, index-stats                       │
│                                                              │
│ Opt-in toolsets via AIWG_MCP_TOOLSETS env var                │
│   memory, kb, reflections, provenance, research-store        │
│   activity-log, ralph, mc, ops                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Hermes calls via MCP per-turn)
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: System-Prompt Priming                               │
│ ───────────────────────────                                  │
│ AGENTS.md (≤20K chars, head-tail truncated above):           │
│   • Routing rules (when to call AIWG)                        │
│   • Memory boundary instructions                             │
│   • Top-6 CRITICAL rules inlined                             │
│     (no-attribution, anti-laziness, citation-policy,         │
│      token-security, versioning, ops-safety)                 │
│   • Pointer to MCP rule-list for the rest                    │
└──────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### DD-1: Three-layer parity model

Each AIWG artifact type maps to exactly one parity layer. Decision matrix:

| Artifact | Layer | Why |
|----------|-------|-----|
| Skills (kernel) | Native | Hermes scans `~/.hermes/skills/` |
| Skills (standard) | Native via `.aiwg/` subdir | Hermes recurses (verified) |
| Commands (~94) | MCP-only | Static Python registry, MCP can't extend |
| Rules (29) | AGENTS.md (top-N) + MCP | No native rules surface; priming + on-demand |
| Agents (191) | AGENTS.md aggregated + MCP | Status quo + parity discoverability |
| Templates | MCP only | No native template surface |
| Artifacts (.aiwg/) | MCP | Already works; preserve |
| Subsystems | MCP toolset (opt-in) | Schema budget constraint |
| Workflows / flows | MCP via command-run | Same as commands |
| Soul | Native | Already works |
| Behaviors | N/A | Hermes has no behavior concept |

### DD-2: Tool naming — no `aiwg-` prefix

Hermes auto-prefixes tool names with `mcp_aiwg_` (verified `tools/mcp_tool.py:2709–2779`). Adding our own `aiwg-` prefix would double-prefix and waste characters in the 64-char tool-name budget. Names use `<domain>-<verb>` form: `skill-list`, `command-run`, `discover`.

### DD-3: Toolset opt-in via env var

Default surface: core 12-ish tools (~2.5K tokens schema cost). Opt-in via `AIWG_MCP_TOOLSETS=memory,kb,ralph,...`. Inspired by mcp-atlassian's 72-tool/21-toolset model. Prevents schema bloat on small-context Ollama setups while preserving full parity for users who need it.

### DD-4: `aiwg-command-run` single-dispatch tool

One MCP tool routes to the 94-command CLI registry. Args: `command` (string, allow-listed against `src/extensions/commands/definitions.ts`), `args` (string array, never shell-interpreted). Spawns via `spawn(cmd, args, {shell: false})`. Logs the command path only, never the args content (token security).

### DD-5: Discover + show family

Symmetric `*-list` and `*-show` pairs for each discoverable artifact:
- `discover` (cross-type, semantic search) — mirrors `aiwg discover`
- `skill-list` / `skill-show`
- `command-list` / `command-show`
- `rule-list` / `rule-show`
- `agent-list` (exists) / `agent-show` (new)
- `template-list` (new) / `template-render` (exists) / `template-show` (new)

### DD-6: Project-required vs global-allowed tools

`findProjectRoot()` currently throws if no `.aiwg/`. Split tools:
- **Project-required**: `artifact-read`, `artifact-write`, `index-query`, memory/kb/etc. subsystems → require `.aiwg/`
- **Global-allowed**: `discover`, `skill-show`, `command-list`, `rule-show`, `agent-show`, `template-list` → fall back to `$AIWG_ROOT/.aiwg/index/`

### DD-7: Destructive op gating

`destructiveHint: true` on `artifact-write`, `command-run` (when command is in destructive allow-list), ralph/mc start, ops mutations. Elicitation likely absent in Hermes v0.13.0; fallback is `isError: true` + `requires_confirmation: true` + `remediation` field. Re-evaluate when Hermes supports elicitation (track upstream).

### DD-8: Long-running operations — session-id pattern

Ralph and Mission Control are async. MCP requests are synchronous. Tools return immediately with a `session_id`; clients poll via `ralph-status`/`mc-status`. Avoids native MCP tasks (likely absent in Hermes).

### DD-9: Curator metadata flag

Hermes v0.12.0+ Curator archives skills on 7-day cycles. AIWG deploys add a "managed by AIWG, do not curate" flag to all SKILL.md frontmatter. Exact flag name pending verification against Hermes PR #20194. Fallback: re-deploy on `aiwg refresh` (idempotent).

### DD-10: Top-N rule inlining

Six CRITICAL rules inline into AGENTS.md (budget: ~19K chars after current 1K AGENTS.md content):
1. `no-attribution` — no AI-tool branding in commits/PRs/code
2. `anti-laziness` — never delete tests / weaken assertions / suppress CI signals
3. `citation-policy` — never fabricate citations/DOIs/URLs
4. `token-security` — never hard-code tokens
5. `versioning` — CalVer format, no leading zeros
6. `ops-safety` — destructive-op gating

Rest of the 29 rules reachable via `mcp_aiwg_rule_list` + `mcp_aiwg_rule_show`.

## Architecture Diagram

```mermaid
graph TB
  H[Hermes Agent v0.13+]
  H -->|loads on session start| K[~/.hermes/skills/ ~9 kernel SKILL.md]
  H -->|loads on session start, recurse| S[~/.hermes/skills/.aiwg/ ~385 standard SKILL.md]
  H -->|loads per-turn ≤20K chars| A[AGENTS.md + .hermes.md project root]

  H -.MCP stdio.->|tools/list, tools/call| M[aiwg mcp serve]
  M -->|core toolset always on| C[discover, *-list/show pairs, command-run]
  M -->|opt-in via AIWG_MCP_TOOLSETS| T[memory, kb, ralph, mc, ops, ...]

  C -->|invokes| R[Extension registry, src/artifacts/]
  T -->|invokes| ST[resolveStorage subsystems]
  R --> DB[(AIWG corpus + .aiwg/)]
  ST --> DB

  M -.notifications/tools/list_changed.->|after aiwg use| H
```

## Backwards Compatibility

| Existing tool | Action | Reason |
|---------------|--------|--------|
| `artifact-read` | Keep, unchanged | Working, stable |
| `artifact-write` | Keep, unchanged | Working, stable |
| `template-render` | Keep, unchanged | Working; split discovery into `template-list` (new) |
| `agent-list` | Keep, unchanged | Working; add `agent-show` (new) |
| `workflow-run` | Mark `_deprecated: true`, redirect to `command-run` | Stub; never executed real workflows |

Existing operators (non-Hermes) using these tools are not affected.

## Non-Functional Requirements

| NFR | Target |
|-----|--------|
| Per-turn schema budget | ≤2.5K tokens for core toolset (Hermes 8K-context viable) |
| Per-tool schema cost | ≤200 tokens (hard cap) |
| Tool name length | ≤30 chars (Hermes prefix eats 9 of 64) |
| Skill discovery time | <500ms cold start on 385-skill corpus |
| MCP server startup | <2s on local Ollama (mounting AIWG_ROOT) |
| Migration safety | Idempotent; old path cleaned after new path verified |
| Backward compat | All 4 working tools unchanged |

## Out of Scope (deferred)

- RLM commands MCP exposure (experimental, defer)
- `aiwg run script` MCP exposure (security profile too open)
- MCP sampling support (not parity-blocking)
- MCP tasks (2025-11-25 experimental, Hermes unverified)
- Behavior-type artifacts (Hermes has no behavior concept)
- Cross-host A2A messaging via MCP (separate epic)
