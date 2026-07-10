# ADR: Skill Usage Telemetry and Targeted Transcript Analysis

**Status:** Proposed
**Date:** 2026-07-10
**Issue:** #1649
**Related:** `src/cli/command-log.ts`, `.aiwg/architecture/adr-configurable-storage-backends.md`, #1611

## Context

AIWG needs local usage signal for two different decisions:

- product maintenance: which commands, skills, and agents are load-bearing vs. unused
- operator assistance: which relevant but under-used capabilities should be suggested in a project

The existing command log already records opt-in `aiwg <command>` invocations with bounded JSONL,
project/global scopes, project-relative path context, and counts. That covers direct CLI usage, but
it misses most harness-native usage: kernel skills, slash commands, subagents, and `aiwg show` →
follow-on invocation patterns often happen inside provider transcripts rather than through a direct
AIWG process. The feature therefore needs two complementary collectors that write the same
privacy-preserving event shape.

## Decision

Adopt a unified, local-first **skill usage event** stream with two opt-in ingestion paths:

1. **CLI utilization counter.** Extend `src/cli/command-log.ts` so a top-level command invocation can
   also emit a normalized usage identity for known AIWG artifacts: command, skill, agent, rule,
   framework, addon, extension, or unknown. The initial implementation should recognize stable CLI
   shapes such as `aiwg run skill <name>`, `aiwg show skill <name>`, `aiwg show agent <name>`,
   `aiwg discover <query>` followed by `show` within the same invocation ID, and regular top-level
   commands.
2. **Targeted transcript analyzer.** Add an explicit CLI command that analyzes a user-supplied
   transcript path and appends extracted usage events. It must never scan provider directories
   ambiently. The first supported transcript format is Claude Code JSONL because it commonly records
   tool invocations and file/session metadata as line-delimited JSON.

Both collectors use one toggle and one event schema. Tracking is off by default. When disabled, the
CLI path returns before path resolution or store writes, and the transcript analyzer exits without
writing. The feature records identifiers and counts only; it never stores prompts, argument payloads,
chat content, stdout/stderr, absolute paths, or file contents.

## Toggle and Precedence

Add `telemetry.skill_usage` to project config as the primary discoverable switch:

```json
{
  "telemetry": {
    "skill_usage": {
      "enabled": false,
      "scopes": ["project"],
      "max_bytes": 1048576
    }
  }
}
```

`command_log` remains supported as a compatibility alias for CLI command-log behavior. During the
transition, effective settings are resolved in this order:

1. `AIWG_SKILL_USAGE=off|project|global|both|all`
2. `.aiwg/aiwg.config.telemetry.skill_usage`
3. `.aiwg/aiwg.config.command_log`
4. disabled

This keeps existing opt-in command-log users working while exposing a single future-facing switch for
both collectors.

## Unified Event Schema

Events are JSONL records. Version 1 is append-only and intentionally small:

```ts
interface SkillUsageEventV1 {
  schema_version: 1;
  event_type: 'aiwg.skill_usage';
  timestamp: string;
  invocation_id?: string;
  source: 'cli' | 'transcript';
  provider?: 'claude-code' | 'codex' | 'opencode' | 'warp' | 'unknown';
  artifact: {
    kind: 'command' | 'skill' | 'agent' | 'rule' | 'framework' | 'addon' | 'extension' | 'unknown';
    id: string;
    namespace?: string;
    version?: string;
  };
  action: 'invoke' | 'show' | 'discover' | 'delegate' | 'unknown';
  outcome?: 'ok' | 'failed' | 'unknown';
  duration_ms?: number;
  aiwg_version: string;
  project?: {
    root_hash: string;
    relative_path: string;
  };
  cwd_hash: string;
  scope: 'project' | 'global';
}
```

Privacy notes:

- `artifact.id` is the stable AIWG identifier, not raw prompt text.
- `namespace` and `version` are emitted only when known from an AIWG registry or skill frontmatter.
- Transcript events store the transcript file hash only in analyzer output summaries, not in each
  persisted event, unless a later audit mode introduces a separate opt-in provenance stream.
- Aggregated sharing is out of scope and must require a separate explicit opt-in.

## Store Layout and Rotation

Use bounded JSONL stores consistent with command-log:

- project: `.aiwg/telemetry/skill-usage.jsonl`
- global: `$XDG_STATE_HOME/aiwg/skill-usage.jsonl` or `~/.local/state/aiwg/skill-usage.jsonl`

The first implementation may use the same bounded append helper as command-log. A follow-up should
route the project store through `resolveStorage('telemetry')` after the storage subsystem adds a
`telemetry` root. Until then, storage redirection is honored for global state through `XDG_STATE_HOME`
and for project attribution through path context.

## Path-Awareness Contract

Every event must carry the same path context model:

- `cwd_hash`: SHA-256 hash prefix of the resolved cwd
- `project.root_hash`: SHA-256 hash prefix of the nearest project root
- `project.relative_path`: normalized project-relative cwd, or `.` at the root
- no absolute project paths in persisted events

For transcript analysis, the operator supplies `--project-root` or runs the analyzer from the intended
project. The analyzer resolves path context from that root/cwd and tags every extracted event with
that context. It must not infer attribution by reading arbitrary path strings from transcript text.

## Attribution Identity

Minimum reliable identity is:

| Source | Reliable first identifier | Notes |
|---|---|---|
| CLI top-level command | `artifact.kind=command`, `id=<command>` | Already available in router. |
| `aiwg run skill <name>` | `artifact.kind=skill`, `id=<name>` | Registry version may be added when lookup is cheap. |
| `aiwg show skill <name>` | `artifact.kind=skill`, `action=show` | Not proof of execution, but useful interest signal. |
| `aiwg show agent <name>` | `artifact.kind=agent`, `action=show` | Same interest-signal semantics. |
| Harness skill/tool call | provider-specific artifact id | Only emit when a tool/skill name is structurally present. |
| Free-form chat mention | no event | Text mentions are not reliable invocation evidence. |

If a provider transcript lacks a structural invocation signal, the analyzer must skip the line rather
than guess from content.

## Chat-Log Support Matrix

| Provider/log | Format | Invocation signal | Support first? | Decision |
|---|---|---|---|---|
| Claude Code session log | JSONL | structured tool-use / skill-use objects where present; slash-command messages only when separately typed as command events | Yes | Primary target for Tool 2. |
| Codex CLI/session artifacts | evolving JSON/event stream | tool call and goal/task events, but session log location/shape is not stable enough to commit here | Later | Add after a fixture is captured from current Codex. |
| OpenCode | JSON or markdown transcripts depending on host | command/tool records vary by integration | Later | Requires fixtures per host version. |
| Warp AI | app-owned chat/session storage | not guaranteed user-readable or stable | No | Do not parse until an export format exists. |
| Plain markdown chat logs | markdown text | free-form mentions only | No | Too noisy; accept only explicit future sidecar format. |

## CLI Surface

Add a new command family rather than overloading `command-log`:

```bash
aiwg skill-usage [--json] [--scope project|global|all] [--limit N]
aiwg skill-usage ingest-transcript <path> --provider claude-code [--project-root <path>] [--dry-run] [--json]
```

`command-log` can remain as a compatibility report over CLI-command events, but `skill-usage` is the
long-term user surface for heatmap, cold-spots, and suggestion work.

## Phased Delivery

1. **Extend command-log counter.** Add unified event emission for top-level commands and stable
   `run skill` / `show skill|agent` shapes, with unit tests proving opt-in no-op and no payloads.
2. **Targeted transcript analyzer.** Parse Claude Code JSONL fixtures and append only structurally
   identified skill/agent events with project path context.
3. **`aiwg skill-usage` report.** Render frequency x recency heatmap, cold-spots, and a stable JSON
   schema over the unified store.
4. **Suggestion/diversity layer.** Use local history plus the capability index to return at least one
   deterministic under-used relevant skill from a fixture.
5. **Aggregation opt-in.** Separate, explicit aggregated export path; no network or sharing behavior
   in the base collectors.

## Consequences

**Positive**

- Preserves local-first privacy while creating enough signal for roadmap and per-user assistance.
- Avoids false precision by separating `show`/interest from `invoke`/execution.
- Keeps transcript analysis targeted and auditable.
- Reuses existing command-log rotation and path-context concepts.

**Negative / risks**

- Provider transcript formats are unstable; each supported format needs fixtures and versioned
  parser tests.
- `show` and `discover` chains are interest signals, not execution proof; reporting must label them
  separately.
- Storage adapter routing needs a small storage-subsystem expansion before telemetry can use
  `resolveStorage` directly.

## Alternatives Considered

1. **CLI counter only.** Rejected because most skill usage occurs inside provider harnesses and would
   remain invisible.
2. **Ambient provider-directory scanner.** Rejected for privacy and performance; targeted analysis is
   explicit and inspectable.
3. **Store raw transcript excerpts for better attribution.** Rejected; violates identifiers/counts-only
   requirement and creates unnecessary sensitive-data risk.
4. **Count free-form mentions as invocations.** Rejected because chat text is not a reliable usage
   signal.

## Acceptance Mapping

| #1649 requirement | Decision evidence |
|---|---|
| Opt-in/off by default | Toggle and precedence section. |
| Tool 1 project/global path-aware counter | CLI utilization counter, event schema, path-awareness contract. |
| Tool 2 targeted transcript analysis | Targeted transcript analyzer and support matrix. |
| Heatmap/cold-spots JSON | CLI surface and phased delivery step 3. |
| Suggestion layer | Phased delivery step 4. |
| Bounded stores/privacy | Store layout, rotation, and privacy notes. |
