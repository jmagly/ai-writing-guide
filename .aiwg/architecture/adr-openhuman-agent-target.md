# ADR: OpenHuman Agent Deployment Target — Two-Tier (Markdown Host + Curated TOML Harness)

**Status**: Accepted
**Date**: 2026-06-05
**Deciders**: Joseph Magly
**Tags**: provider, openhuman, agents, deployment, induction

---

## Context

OpenHuman ([tinyhumansai/openhuman](https://github.com/tinyhumansai/openhuman)) is being inducted as AIWG's 11th deployment provider (epic #1552). It is an OSS personal-AI runtime — Rust core (`openhuman-core`) + React/Tauri desktop shell — that ships `.agents/`, `AGENTS.md`, `.claude/`, and `.codex/` conventions out of the box.

Inducting a provider requires deciding **where AIWG agent personas are deployed** and **in what format**. OpenHuman surfaced a non-obvious complication: it exposes **two distinct agent surfaces** with different formats and different consumers. The original epic conflated them. This ADR resolves the decision (issue #1554) from a ground-truth read of `src/openhuman/agent/harness/`.

### The two surfaces (ground truth)

1. **Cross-provider markdown personas — `.agents/agents/*.md`**
   Markdown + YAML frontmatter (`name`, `description`, `model: inherit`) — identical in shape to Claude Code agents. These are consumed by **external coding hosts** (Claude Code / Codex / Factory) operating inside an OpenHuman workspace, which OpenHuman can drive as inference backends (`src/openhuman/inference/provider/claude_code/`, `.../factory.rs`). They are **not** read by OpenHuman's own agent harness.

2. **Native harness specialists — `<ws>/agents/*.toml` + `~/.openhuman/agents/*.toml`**
   OpenHuman's `spawn_subagent` registry. The loader (`definition_loader.rs:22-100`) scans **`.toml` only** (`if ext != "toml" { continue }`), non-recursive, one definition per file, no trust-marker gate. Definitions are `AgentDefinition` (`definition.rs:61-243`): **required** `id`, `when_to_use`, non-empty `system_prompt`; everything else defaults. `[system_prompt]` accepts `inline = "…"` or `file = "…"` (TOML-authored agents cannot use the runtime-only `Dynamic` source).

### Decisive harness mechanics

- **`file` prompt resolution** (`subagent_runner/tool_prep.rs:171-238`): tries `<ws>/agent/prompts/<path>` (escape-guarded to that root), then `<ws>/<path>` (escape-guarded to `<ws>`), else empty body. Read **raw — YAML frontmatter is NOT stripped**. Resolution is against the **active workspace at spawn**, not `~/.openhuman`.
- Builtins load separately and **merge** with custom file defs → `id` collisions and delegation-menu bloat are real risks (every custom `Worker` becomes an orchestrator delegation target).
- A `Worker` (default `AgentTier`) with a non-empty `subagents` list is **rejected** by the loader.
- `ModelSpec` (`definition.rs:453-484`) is OpenHuman's own namespace: `Inherit` (default), `Exact("neocortex-mk1")`, `Hint("reasoning"|"coding"|"agentic"|"local")` → resolves to `{hint}-v1`. (`neocortex` is OpenHuman's model backend, a sibling repo — not a deployment target.)
- `ToolScope` (`:489-501`) defaults to `Wildcard` (inherit parent tools); `Named` silently drops names absent from the parent registry at spawn.

## Decision

Adopt a **two-tier** agent deployment model for OpenHuman. **`aiwg use` performs no markdown→TOML body conversion.**

### Tier 1 — Host integration (default, ships first)

Deploy AIWG agent markdown **as-is** to `.agents/agents/*.md`; skills to `.agents/skills/` + `.openhuman/skills/`; commands/rules aggregated via `AGENTS.md`. No TOML, no conversion. This reaches OpenHuman whenever it drives an external coding host in the workspace, and is what makes OpenHuman "already AIWG-aware." Tracked in #1555 (scoped to Tier 1) and #1556/#1557.

### Tier 2 — Native-harness specialists (opt-in, follow-up #1559)

Register **curated, explicitly-selected** AIWG agents as OpenHuman harness specialists by generating thin TOML **stubs** plus bootstrapped prompt bodies — never transcoding the persona into TOML, never dumping all ~198 agents.

**Resolved parameters (decided 2026-06-05):**

| Parameter | Decision | Rationale |
|---|---|---|
| **Selection** | CLI flag `--harness-agents=a,b,…` | Explicit, per-invocation, discoverable; no hidden persistent state |
| **Default when opted-in w/o names** | **Emit nothing** | The user always chooses exactly which specialists enter the delegation menu; zero surprise routing bloat |
| **Model** | **Omit `[model]` → `Inherit`** | OpenHuman's model namespace (`neocortex-*`, hints) doesn't map cleanly to AIWG `sonnet/opus/haiku`; heuristic hint-map deferred |
| **Default deploy (no flag)** | Zero harness files | Tier-1 only |

**Stub shape by scope** (forced by `file` resolving against the active workspace):

| Scope | Stub | Prompt source |
|---|---|---|
| project (default) | `<project>/agents/aiwg_<id>.toml` | `[system_prompt] file = "aiwg/<id>.md"` → frontmatter-stripped body at `<project>/agent/prompts/aiwg/<id>.md` |
| user (`--user`) | `~/.openhuman/agents/aiwg_<id>.toml` | `[system_prompt] inline = '''<stripped body>'''` (self-contained — a `file=` would resolve against arbitrary workspaces) |

### Frontmatter mapping (AIWG agent → `AgentDefinition` TOML)

| TOML field | Source | Notes |
|---|---|---|
| `id` | `aiwg_` + snake(slug) | namespace prevents builtin collision; defines AIWG-owned cleanup namespace |
| `when_to_use` | AIWG `description` | required; whitespace-normalized |
| `display_name` | AIWG human name | optional, set |
| `system_prompt` | AIWG body **minus frontmatter** | `file` (project) / `inline '''…'''` (user) |
| `model`, `tools`, `agent_tier`, `iteration_policy`, `sandbox_mode`, `temperature` | **omitted → defaults** | inherit/Wildcard/Worker/Strict/None |

## Alternatives considered

1. **Treat `.agents/agents/*.md` as THE agent target (single tier).** Rejected — it does not reach OpenHuman's own harness; it only feeds external hosts. Mislabels the integration.
2. **Zero-copy: point Tier-2 `file` at the Tier-1 `.agents/agents/<id>.md`.** Resolvable via the second fallback, but read raw → AIWG YAML frontmatter leaks into the system prompt. Rejected.
3. **Full markdown→TOML transcode (`inline` everywhere, incl. project scope).** Bulky; persona lives inside TOML; poor diffs. `inline` reserved for user scope where `file` cannot resolve.
4. **1:1 model/tool mapping in v1.** AIWG↔OpenHuman namespaces differ; produces silent drops and mis-routing. Inherit defaults; translation tables deferred.

## Consequences

**Positive**
- Default deploy is non-invasive: markdown personas + skills + AGENTS.md, no TOML, no harness mutation.
- Persona bodies remain the single source of truth; Tier-2 stubs reference them.
- Curated opt-in keeps OpenHuman's delegation routing clean.
- `aiwg_`-namespacing gives `refresh`/`remove`/`doctor` a safe ownership boundary.

**Negative / costs**
- Tier-2 carries OpenHuman-specific constraints (frontmatter strip, `agent/prompts/` placement, project-vs-user prompt-source split) the emitter must encode.
- Model and tool fidelity are intentionally lossy in v1 (inherit only).

**Deferred** (future enhancements, not v1)
- AIWG-model → OpenHuman `[model] hint` heuristic map (needs OpenHuman's full hint vocabulary).
- AIWG-tool → `ToolScope::Named` / `disallowed_tools` translation table.
- Per-archetype `sandbox_mode = read_only` (reviewers/researchers); `iteration_policy = extended` (multi-step agents).
- `skill_filter` wiring.

## References

- Epic #1552 · this ADR resolves #1554 · Tier-1 #1555 · Tier-2 #1559
- `src/openhuman/agent/harness/definition_loader.rs:22-100`, `:155-167`
- `src/openhuman/agent/harness/definition.rs:61-243` (AgentDefinition), `:431-447` (PromptSource), `:453-484` (ModelSpec), `:489-501` (ToolScope), `:267-283` (AgentTier)
- `src/openhuman/agent/harness/subagent_runner/tool_prep.rs:171-238` (prompt resolution)
- `openhuman-skills/docs/SKILL_SPEC.md` (skills contract — see #1553)

---

## Addendum (2026-06-12, #1553 follow-up): skills install globally, not project-scoped

**Field finding.** OpenHuman is a persistent compose app whose **Skills library
scans the user-scope tree** (`~/.openhuman/skills/`, `~/.agents/skills/`) —
`ops_discover.rs` scans those roots **unconditionally**, while project-scope
roots (`<ws>/.openhuman/skills/`) are gated by a workspace trust marker. The
original "Decision" deployed kernel skills project-scoped (`<ws>/.openhuman/skills/`),
so a fresh `aiwg use --provider openhuman` left the app's Skills library empty
("No skills found — place Hermes-style folders under `~/.openhuman/skills`").

**Revised decision.** Skills install **globally/home-dir, mirroring OpenClaw**:

- Kernel skills → `~/.openhuman/skills/<name>/SKILL.md` (ungated user scope, one-level — exactly what the Skills library surfaces).
- Standard skills → `~/.openhuman/.aiwg/skills/` (sequestered, `aiwg discover`).
- Rules → `~/.openhuman/.aiwg/rules/` (full bodies for `aiwg show rule`).
- **Personas + `AGENTS.md` remain workspace-scoped** (`.agents/agents/`, `<ws>/AGENTS.md`) — the external coding hosts OpenHuman drives read them from the workspace. This is the one place the original Decision still holds.

The project-scope **trust marker is no longer written** — user scope is ungated,
so it was always moot for the global install. `aiwg use --provider openhuman`
emits a guidance line pointing operators at `~/.openhuman/skills/`.

Implementation: `tools/agents/providers/openhuman.mjs` (the deploy writer),
`src/cli/handlers/use.ts`, `src/smiths/platform-paths.ts`,
`src/smiths/skillsmith/{platform-resolver,namespace-adapter}.ts`,
`src/cli/handlers/regenerate.ts`. Absolute home paths flow through the existing
`isAbsolute ? abs : join(target, …)` handling (deploy-agents.mjs, discovery.ts,
platform-paths.ts). Trust-marker code from the first #1553 pass reverted.

---

## Addendum (2026-07-15, #1784/#1785): complete corpus and project bridge

The deployed contract is now explicit:

- The default OpenHuman deploy copies no markdown personas.
- Kernel skills and full rule bodies remain user-global under
  `~/.openhuman/skills/` and `~/.openhuman/.aiwg/rules/`.
- Curated native TOML harness agents remain opt-in under
  `~/.openhuman/agents/` through `--harness-agents`.
- Every project deploy renders an `AGENTS.md` bridge at the project root.
- The bridge's on-demand section indexes the complete installed corpus across
  framework, addon, and extension passes; a later pass must not truncate an
  earlier pass's entries.

This supersedes the earlier claim that workspace markdown personas remain an
OpenHuman deployment target. The project bridge, not `.agents/agents/`, is the
default project-scoped OpenHuman artifact.
