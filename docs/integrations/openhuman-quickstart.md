# OpenHuman Quick Start

Deploy AIWG into [OpenHuman](https://github.com/tinyhumansai/openhuman)
(`tinyhumansai/openhuman`) — an open-source personal-AI runtime (Rust core +
React/Tauri desktop shell, single `openhuman-core` binary) with a built-in
coder toolset and an agent harness.

OpenHuman is **AIWG-convention-aware out of the box**: it already ships
`.agents/`, `AGENTS.md`, `.claude/`, and `.codex/`. That makes induction
low-friction — AIWG's cross-provider conventions land where OpenHuman (and the
coding hosts it drives) already look.

> Status: **experimental** (induction epic
> [#1552](https://git.integrolabs.net/roctinam/aiwg/issues/1552)). The
> decision record is `.aiwg/architecture/adr-openhuman-agent-target.md`.

## Architecture

AIWG reaches OpenHuman through two tiers.

**Tier 1 — host integration (default).** AIWG deploys markdown agent personas,
skills, and an `AGENTS.md` bridge using OpenHuman's native conventions. These
reach OpenHuman whenever it drives an external coding host (`claude_code`,
`factory`) inside the workspace, and they prime OpenHuman's own `AGENTS.md`
discovery. No format conversion happens.

**Tier 2 — native harness (opt-in).** OpenHuman's own agent harness
(`spawn_subagent`) loads TOML specialists from `<ws>/agents/*.toml` and
`~/.openhuman/agents/*.toml`. AIWG can register selected agents there with
`--harness-agents=...`. It is curated and flag-gated; the default deploy emits
no native harness stubs.

| Artifact | Where it lands | Notes |
|----------|----------------|-------|
| Agents | `.agents/agents/*.md` | Markdown personas, deployed verbatim (frontmatter intact) |
| Skills (kernel) | `~/.openhuman/skills/` | **Global/home-dir like OpenClaw** — ungated user-scope native scan root (`ops_discover.rs`, one-level); exactly what the app's Skills library surfaces |
| Skills (standard) | `~/.openhuman/.aiwg/skills/` | Sequestered for index-driven discovery (`aiwg discover`) |
| Commands | `AGENTS.md` (aggregated) | OpenHuman has no native command surface; command-skills also deploy as skills |
| Rules | `~/.openhuman/.aiwg/rules/` + `AGENTS.md` | Full bodies on disk for `aiwg show rule`; critical directives inline in `AGENTS.md` |
| Config bridge | `AGENTS.md` | Discover-First orientation |
| Native harness stubs (opt-in) | `<ws>/agents/aiwg_*.toml` + `<ws>/agent/prompts/aiwg/*.md` | Selected only via `--harness-agents`; prompt bodies are frontmatter-stripped |

OpenHuman is "codex-shaped" (AGENTS.md bridge, cross-provider `.agents/`) but
deploys discrete markdown agents and treats commands/rules as aggregated, the
way Hermes does.

## Prerequisites

- OpenHuman installed and running (see the OpenHuman README).
- AIWG installed: `npm install -g aiwg`.

## Quick start

From your project root:

```bash
aiwg use sdlc --provider openhuman
```

This deploys:

- Kernel skills **globally** to `~/.openhuman/skills/`, standard skills to `~/.openhuman/.aiwg/skills/`
- Agent personas to the workspace `.agents/agents/` (Tier 1)
- An `AGENTS.md` bridge at the project root

Verify:

```bash
ls ~/.openhuman/skills/   # kernel skills (global, always-loaded set — appear in the Skills library)
ls .agents/agents/        # markdown personas (workspace-scoped)
cat AGENTS.md             # Discover-First bridge
```

Nothing is written to `<ws>/agents/` or `<ws>/agent/prompts/` unless you select
Tier-2 native harness agents.

## Optional Native Harness Agents

Use `--harness-agents` to expose a small curated set of AIWG specialists through
OpenHuman's `spawn_subagent` registry:

```bash
aiwg use sdlc --provider openhuman --harness-agents=test-engineer,security-auditor
```

Project scope writes thin TOML stubs under `agents/` and stripped prompt bodies
under `agent/prompts/aiwg/`. User scope writes self-contained inline TOML stubs
under `~/.openhuman/agents/`:

```bash
aiwg use sdlc --provider openhuman --scope user --harness-agents=test-engineer
```

Re-run `aiwg doctor --provider openhuman` to validate the optional Tier-2
stubs. The default no-selector deploy remains Tier-1 only.

## Why skills install globally (no trust marker needed)

OpenHuman's skill scanner (`src/openhuman/workflows/ops_discover.rs`) scans
**user-scope** roots (`~/.openhuman/skills/`, `~/.agents/skills/`)
**unconditionally** — and its Skills library surfaces exactly that user-scope
set ("place Hermes-style folders under `~/.openhuman/skills`"). AIWG therefore
installs the kernel set there, like OpenClaw's home-dir model. No trust marker
is involved.

The trust marker only governs **project-scope** roots (`<ws>/.openhuman/skills/`),
which AIWG no longer deploys to. Personas and the `AGENTS.md` bridge stay
workspace-scoped because the external coding hosts OpenHuman drives
(`claude_code`/`factory`) read them from the workspace.
(Resolution tracked in [#1553](https://git.integrolabs.net/roctinam/aiwg/issues/1553).)

## Caveat: skill execution is being rebuilt

OpenHuman removed its QuickJS skills runtime; `src/openhuman/skills/` is
metadata/discovery-only at present. **Discovery, install, and catalog rendering
work today; end-to-end skill execution does not yet.** AIWG targets
discovery/deploy parity first. Check the current OpenHuman domain modules before
assuming a skill runs end-to-end.

## Bidirectional relationship

The integration runs both ways. OpenHuman can itself **drive** other agents as
inference backends — it ships drivers for `claude_code`
(`src/openhuman/inference/provider/claude_code/`) and `factory`. When it does,
the AIWG markdown personas in `.agents/agents/` and the `AGENTS.md` bridge are
exactly what those hosts read. So a single Tier-1 deploy serves both OpenHuman's
own discovery and the coding hosts it orchestrates.

## Discover-First inside OpenHuman

Most AIWG skills are not loaded into context; they are reached on demand:

```bash
aiwg discover "create a security review"   # rank matching skills/agents
aiwg show skill flow-security-review        # fetch the body
```

Run `aiwg discover` before concluding AIWG lacks a capability — it indexes the
full installed corpus, not just the kernel set surfaced in `AGENTS.md`.

## State boundaries

- `.aiwg/` holds project-local SDLC artifacts (requirements, architecture,
  reports). It is never deployed to other systems.
- `~/.openhuman/skills/` (global), workspace `.agents/agents/`, and `AGENTS.md` are AIWG-managed
  deploy outputs — safe to regenerate with `aiwg refresh --provider openhuman`.

## See also

- Provider induction epic: [#1552](https://git.integrolabs.net/roctinam/aiwg/issues/1552)
- Agent target decision: `.aiwg/architecture/adr-openhuman-agent-target.md`
- Tier-2 native harness: [#1559](https://git.integrolabs.net/roctinam/aiwg/issues/1559)
- `docs/integrations/hermes-quickstart.md` — the closest analog (AGENTS.md bridge)
