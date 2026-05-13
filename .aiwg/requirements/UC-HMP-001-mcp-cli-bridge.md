# UC-HMP-001: MCP CLI Bridge for Hermes Parity

**Phase**: Elaboration
**Priority**: P0
**Status**: Draft
**Related**: @.aiwg/architecture/sketch-hermes-mcp-parity.md DD-2, DD-4, DD-5, DD-6

## Reasoning

1. **Problem analysis**: Hermes users cannot invoke the 94 AIWG CLI commands. The current MCP `workflow-run` tool is a stub that returns parsed metadata but never executes.
2. **Constraint identification**: Static Python command registry — MCP cannot extend Hermes's slash-command surface. Per-tool schema budget ~200 tokens.
3. **Alternative consideration**: (a) generate 94 per-command MCP tools (schema bloat); (b) single `command-run` dispatch tool with allow-list (chosen); (c) generic shell exec (security failure).
4. **Decision rationale**: Single dispatch tool keeps schema cost flat; allow-list against `definitions.ts` prevents arbitrary execution; symmetric `command-list`/`command-show` lets the agent introspect before invoking.
5. **Risk assessment**: Allow-list bypass (mitigated: argv array + `shell: false`); destructive-op gating (mitigated: `confirmed: true` flag); discover index global fallback (mitigated: `$AIWG_ROOT/.aiwg/index/` for global-allowed tools).

## Primary Actor

Hermes Agent acting on behalf of a user.

## Goal

Invoke any AIWG CLI command from a Hermes session via MCP, with safety gates equivalent to direct CLI invocation.

## Preconditions

- AIWG MCP server running (`aiwg mcp serve`)
- Hermes configured with the server via `hermes mcp add aiwg`
- `$AIWG_ROOT` set or default location populated

## Main Success Scenario

1. Hermes turn requires AIWG capability (e.g., "create an ADR").
2. Hermes calls `mcp_aiwg_discover` with phrase `"create ADR"`.
3. Discover returns ranked candidates including the relevant skill or command.
4. Hermes calls `mcp_aiwg_command_run` with `command: "flow-architecture-evolution"`, `args: [...]`, `confirmed: true` (if destructive).
5. MCP server validates command against allow-list, spawns CLI process, captures stdout/stderr/exit.
6. Tool returns structured result; Hermes integrates into reply.

## Alternative Flows

**A1 — Command not allow-listed**: MCP returns `isError: true` with `remediation: "Command 'foo' not in allow-list"`. Hermes reports to user.

**A2 — Destructive command without confirmation**: MCP returns `isError: true`, `requires_confirmation: true`. Hermes re-prompts user; on confirmation, re-invokes with `confirmed: true`.

**A3 — Discover from global context (no project root)**: Global-allowed tools fall back to `$AIWG_ROOT/.aiwg/index/`. Project-required tools (artifact-read/write) error cleanly with remediation.

## Acceptance Criteria

- [ ] `discover` tool exposed via MCP, returns same shape as `aiwg discover --json`
- [ ] `command-list`, `command-show`, `command-run` tools registered with valid schemas
- [ ] `command-run` enforces allow-list against `src/extensions/commands/definitions.ts`
- [ ] `command-run` uses `spawn(cmd, args, {shell: false})` — never shell interpretation
- [ ] Destructive commands require `confirmed: true`; without it, returns `isError + requires_confirmation`
- [ ] Symmetric `*-list` and `*-show` pairs for skill, command, rule, agent, template
- [ ] `agent-show` and `template-list`/`template-show` added (gaps in current surface)
- [ ] Global-allowed tools fall back to `$AIWG_ROOT/.aiwg/index/` when no project root
- [ ] `workflow-run` marked `_deprecated: true`, redirects to `command-run`
- [ ] Default toolset (core) ≤2.5K tokens schema cost (measured)
- [ ] Tool names do not collide after `[^A-Za-z0-9_]` → `_` mangling

## Non-Functional Requirements

- Tool name length ≤30 chars
- Per-tool schema ≤200 tokens
- `command-run` latency overhead vs CLI direct invoke ≤100ms (excluding command exec time)

## Implementation Sketch

`src/mcp/server.mjs` adds:
- `registerTool('discover', ...)` — wraps `src/artifacts/query-engine.ts` programmatic API
- `registerTool('command-list', ...)` — enumerates `definitions.ts`
- `registerTool('command-show', ...)` — returns command spec body
- `registerTool('command-run', ...)` — allow-list + `child_process.spawn`
- `registerTool('agent-show', ...)` — wraps existing agent loader
- `registerTool('template-list', ...)` — enumerates templates from corpus
- `registerTool('template-show', ...)` — returns raw template body
- `registerTool('skill-list', ...)`, `registerTool('skill-show', ...)` — wraps `aiwg show skill`
- `registerTool('rule-list', ...)`, `registerTool('rule-show', ...)` — wraps rules corpus

Helper: `splitProjectRequiredVsGlobal()` decides fallback policy per tool.
