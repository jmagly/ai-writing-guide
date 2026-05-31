# AIWG MCP Capability Audit

Status: v2026.5.13 audit pass for #1533

AIWG's MCP server is a provider-agnostic optional hook. The baseline integration path for every provider is file deployment plus the CLI bridge: `aiwg discover` to find a capability and `aiwg show <type> <name>` to fetch it. MCP adds structured, model-callable access to the same catalog and to selected project operations, but no provider should depend on MCP for basic AIWG reachability.

## Current Tool Inventory

### Core tools, always registered

The default `aiwg mcp serve` surface currently registers 16 tools:

| Tool | Status | Boundary |
|---|---|---|
| `discover` | active | Cross-type ranked search; mirrors `aiwg discover --json` |
| `skill-list` / `skill-show` | active | Skill catalog enumeration and full body fetch |
| `command-list` / `command-show` | active | CLI command catalog and command spec lookup |
| `rule-list` / `rule-show` | active | Rule catalog and rule body fetch; CLI equivalent is `aiwg show rule <name>` |
| `agent-list` / `agent-show` | active | Agent catalog and full agent definition fetch |
| `template-list` / `template-show` / `template-render` | active | Template catalog, raw body fetch, and simple rendering |
| `command-run` | active | Allow-listed CLI dispatch; destructive commands require `confirmed: true` |
| `artifact-read` / `artifact-write` | active | Project-required `.aiwg/` artifact IO |
| `workflow-run` | deprecated | Compatibility stub only; use `command-run` for execution |

### Opt-in toolsets

`AIWG_MCP_TOOLSETS` or `aiwg mcp serve --toolsets=<csv>` enables 45 additional tools:

| Toolset | Tools | Count | Boundary decision |
|---|---:|---:|---|
| `memory` | `memory-*`, `reflections-*` list/get/put/delete/path | 10 | Project state, off by default because it writes persistent memory |
| `kb` | `kb-*` list/get/put/delete/path | 5 | Knowledge-base state, off by default because it can be large and writeable |
| `research` | `provenance-*`, `research-store-*` list/get/put/delete/path | 10 | Research corpus/provenance state, opt-in by domain |
| `activity-log` | show/append/stats | 3 | Lightweight but project-specific event stream |
| `index` | build/query/deps/stats | 4 | Project graph operations; `index-build` can be expensive |
| `ralph` | start/status/abort/attach | 4 | Long-running loops; start/abort require confirmation semantics |
| `mc` | start/dispatch/status/stop/list | 5 | Mission Control orchestration; stop is destructive |
| `ops` | status/list/use/push | 4 | Operational workspace actions; push is shared-state affecting |

`core` is always implicit. `all` expands to all opt-in toolsets. Unknown toolset names warn and are skipped rather than aborting server startup.

## Provider-Agnostic Positioning

MCP configuration belongs to the user or workspace, not to a specific AIWG provider adapter. The same `aiwg mcp serve` process can be connected from Claude, Codex, Cursor, Factory, GitHub Copilot, OpenCode, Warp, Windsurf, Hermes, OpenClaw, or any other MCP-capable host.

Provider adapters should therefore say:

- Baseline: deploy files and use `aiwg discover` / `aiwg show`.
- Optional enrichment: connect `aiwg mcp serve` for structured tool calls.
- No provider requires MCP for skills, discovery, or rule reachability.

Hermes now follows this framing: rules are compressed into `AGENTS.md` as `### Rule:` sections, with full rule bodies reachable by `aiwg show rule <name>`; MCP exposes the same rule path when configured.

## Install, Inject, and Profile UX Check

The current CLI surface is coherent but should be described as two related flows:

| Flow | Commands | Current state |
|---|---|---|
| AIWG's own server | `aiwg mcp serve [--toolsets=...]`, `aiwg mcp install <provider>`, `aiwg mcp info` | Serves the AIWG catalog and project tools; install writes provider-specific config where a file path is known |
| External server registry | `aiwg mcp add/update/remove/list`, `aiwg mcp inject`, `aiwg mcp profile` | Maintains registered third-party MCP servers and injects selected sets into provider configs |

Profiles are named server subsets stored in `~/.aiwg/mcp-profiles.json`. Built-in presets are `minimal`, `dev`, `ops`, `research`, `incident`, and `full`. The profile model is provider-agnostic; provider overrides may deny high-risk tools for a given host.

Ephemeral profile launch remains the cleanest default where supported: `aiwg session --profile <name>` injects a temporary config for Claude and creates a profile-scoped runtime home for Codex. Persistent injection remains available through `aiwg mcp inject --provider <name> --profile <name>`.

## What MCP Uniquely Adds

MCP adds value when the host can call tools directly:

- Structured JSON schemas for catalog lookup, command dispatch, artifact IO, and subsystem operations.
- Runtime tool availability without copying large skill or rule bodies into context.
- Cross-provider access to the same external MCP server registry and profile presets.
- Long-running orchestration controls where the host can poll status tools.
- A standard integration surface for non-AIWG systems that cannot read `AGENTS.md` but can call MCP.

The CLI + `AGENTS.md` bridge already covers:

- Capability discovery through `aiwg discover`.
- Full body fetches through `aiwg show skill|agent|command|rule`.
- Rule delivery for providers that load generated context files.
- Operator-driven command execution from a shell.

Decision: keep MCP optional and lean by default. Do not move baseline rule or skill delivery behind MCP. Use opt-in toolsets for writeable, project-specific, expensive, or long-running surfaces.

## Recommendations

- Keep the 16-tool core for now, but treat `workflow-run` as deprecated compatibility debt and remove it only in a major compatibility window.
- Keep `command-run` in core; it is the structured equivalent of the CLI bridge and preserves one canonical execution path.
- Keep memory, research, activity-log, index, ralph, mc, and ops outside core because they expand schema size, touch project state, or trigger long-running/shared-state operations.
- Update provider docs that still say MCP is required or that only the legacy five-tool surface exists.
- Re-measure schema token cost after each toolset change and publish the core/all count in release notes.
