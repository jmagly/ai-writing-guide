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

**Tier 2 — native harness (opt-in, later).** OpenHuman's own agent harness
(`spawn_subagent`) loads TOML specialists from `<ws>/agents/*.toml`. Registering
selected AIWG agents there is a curated, flag-gated follow-up tracked in
[#1559](https://git.integrolabs.net/roctinam/aiwg/issues/1559). It is **not**
part of the default deploy.

| Artifact | Where it lands | Notes |
|----------|----------------|-------|
| Agents | `.agents/agents/*.md` | Markdown personas, deployed verbatim (frontmatter intact) |
| Skills (kernel) | `.openhuman/skills/` | Project-scope native scan root (`ops_discover.rs`); trust-marker gated |
| Skills (standard) | `.openhuman/.aiwg/skills/` | Sequestered for index-driven discovery (`aiwg discover`) |
| Commands | `AGENTS.md` (aggregated) | OpenHuman has no native command surface; command-skills also deploy as skills |
| Rules | `.openhuman/.aiwg/rules/` + `AGENTS.md` | Full bodies on disk for `aiwg show rule`; critical directives inline in `AGENTS.md` |
| Config bridge | `AGENTS.md` | Discover-First orientation |

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

This deploys (Tier 1):

- Agent personas to `.agents/agents/`
- Kernel skills to `.openhuman/skills/`, standard skills to `.openhuman/.aiwg/skills/`
- An `AGENTS.md` bridge at the project root

Verify:

```bash
ls .agents/agents/        # markdown personas
ls .openhuman/skills/     # kernel skills (always-loaded set)
cat AGENTS.md             # Discover-First bridge
```

Nothing is written to `<ws>/agents/` or `<ws>/agent/prompts/` — those belong to
the opt-in Tier-2 harness surface ([#1559](https://git.integrolabs.net/roctinam/aiwg/issues/1559)).

## Project-scope skill discovery: the trust marker

OpenHuman's skill scanner (`src/openhuman/skills/ops_discover.rs`) scans
project-scope skill roots (`<ws>/.openhuman/skills/`) only when the workspace
has opted in via a trust marker under `<ws>/.openhuman/`. User-scope skills
(`~/.agents/skills/`, `~/.openhuman/skills/`) are scanned unconditionally.

If your deployed kernel skills do not appear in OpenHuman, confirm the
workspace trust marker is present. (The exact marker semantics are tracked in
[#1553](https://git.integrolabs.net/roctinam/aiwg/issues/1553).)

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
- `.agents/agents/`, `.openhuman/skills/`, and `AGENTS.md` are AIWG-managed
  deploy outputs — safe to regenerate with `aiwg refresh --provider openhuman`.

## See also

- Provider induction epic: [#1552](https://git.integrolabs.net/roctinam/aiwg/issues/1552)
- Agent target decision: `.aiwg/architecture/adr-openhuman-agent-target.md`
- Tier-2 native harness: [#1559](https://git.integrolabs.net/roctinam/aiwg/issues/1559)
- `docs/integrations/hermes-quickstart.md` — the closest analog (AGENTS.md bridge)
