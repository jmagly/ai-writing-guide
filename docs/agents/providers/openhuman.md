---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.openhuman
---

# OpenHuman Operational Reference

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Deploy AIWG into [OpenHuman](https://github.com/tinyhumansai/openhuman)
(`tinyhumansai/openhuman`) — an open-source personal-AI runtime (Rust core +
React/Tauri desktop shell, single `openhuman-core` binary) with a built-in
coder toolset and an agent harness.

OpenHuman's user-facing skill install path is `~/.openhuman/skills/`. AIWG uses
that path only for kernel skills that should appear in the OpenHuman UI; the
rest of the AIWG corpus remains available through AIWG discovery.

> Status: **experimental** (induction epic
> [#1552](https://git.integrolabs.net/roctinam/aiwg/issues/1552)). The
> decision record is `.aiwg/architecture/adr-openhuman-agent-target.md`.

## Architecture

AIWG reaches OpenHuman through two tiers.

**Tier 1 — user-global skills (default).** AIWG deploys OpenHuman-visible
kernel skills to `~/.openhuman/skills/`. Standard skills stay in AIWG's
index/discovery system and are reached through `aiwg discover` / `aiwg show`;
they are not copied into the OpenHuman UI scan root.

**Tier 2 — native harness agents (opt-in curated set).** OpenHuman's own agent harness
(`spawn_subagent`) loads TOML specialists from `~/.openhuman/agents/*.toml`.
AIWG can register a curated set of rich native TOML worker agents there when
you pass `--harness-agents=...`. The default deploy emits no native harness
stubs.

| Artifact | Where it lands | Notes |
|----------|----------------|-------|
| Agents | `~/.openhuman/agents/aiwg_*.toml` | Optional curated native TOML worker agents; rich definitions rendered from AIWG markdown and the OpenHuman TOML template |
| Skills (kernel) | `~/.openhuman/skills/` | **Global/home-dir like OpenClaw** — ungated user-scope native scan root (`ops_discover.rs`, one-level); exactly what the app's Skills library surfaces |
| Skills (standard) | AIWG index/discovery | Not copied into OpenHuman scan roots |
| Commands | skills/index only | OpenHuman has no native command directory |
| Rules | `~/.openhuman/.aiwg/rules/` | Full bodies on disk for `aiwg show rule` |
| Context bridge | `<project>/AGENTS.md` | Automatically rendered project context, commands, and on-demand rule index |

OpenHuman is a user-global app install target for AIWG, like OpenClaw.

## Prerequisites

- OpenHuman installed and running (see the OpenHuman README).
- AIWG installed: `npm install -g aiwg`.

## Quick start

```bash
aiwg use all --provider openhuman
```

This deploys:

- Kernel skills to `~/.openhuman/skills/` so they appear in OpenHuman's Skills UI
- No native harness TOMLs unless `--harness-agents` is provided
- Standard skills remain available through AIWG index/discovery; they are not copied into OpenHuman scan roots
- Rules to `~/.openhuman/.aiwg/rules/`
- A project-root `AGENTS.md` bridge with commands and the complete on-demand rule index

Verify:

```bash
ls ~/.openhuman/skills/        # kernel skills visible to OpenHuman
ls ~/.openhuman/agents/        # AIWG native harness TOMLs only after --harness-agents
rg "AIWG SDLC Framework" AGENTS.md
```

OpenHuman payload directories remain user-global. The project-root `AGENTS.md`
is the context bridge; AIWG does not create project `.openhuman/` payload
directories or project markdown persona directories.

## Native Harness Agent Selection

Native harness agents are opt-in. Select the curated specialists that should be
visible through OpenHuman's `spawn_subagent` registry with `--harness-agents`:

```bash
aiwg use sdlc --provider openhuman --harness-agents=test-engineer,security-auditor
```

OpenHuman is user-global, so harness selection writes self-contained inline
TOML definitions under `~/.openhuman/agents/`. Each definition is rendered from
`agentic/code/frameworks/sdlc-complete/templates/openhuman/agent.toml.aiwg-template`
and includes OpenHuman-native model hints, worker tier, runtime caps, sandbox
mode, TokenJuice profile, and context omission settings.

Re-run `aiwg doctor --provider openhuman` to validate the optional Tier-2
definitions. Omit `--harness-agents` when you want only kernel skills and
rules.

## Why skills install globally (no trust marker needed)

OpenHuman's skill scanner (`src/openhuman/workflows/ops_discover.rs`) scans
**user-scope** roots (`~/.openhuman/skills/`, `~/.agents/skills/`)
**unconditionally** — and its Skills library surfaces exactly that user-scope
set ("place Hermes-style folders under `~/.openhuman/skills`"). AIWG therefore
installs the kernel set there, like OpenClaw's home-dir model. No trust marker
is involved.

The trust marker only governs **project-scope** roots (`<ws>/.openhuman/skills/`),
which AIWG does not deploy to for OpenHuman.
(Resolution tracked in [#1553](https://git.integrolabs.net/roctinam/aiwg/issues/1553).)

## Caveat: skill execution is being rebuilt

OpenHuman removed its QuickJS skills runtime; `src/openhuman/skills/` is
metadata/discovery-only at present. **Discovery, install, and catalog rendering
work today; end-to-end skill execution does not yet.** AIWG targets
discovery/deploy parity first. Check the current OpenHuman domain modules before
assuming a skill runs end-to-end.

## Discover-First inside OpenHuman

Most AIWG skills are not loaded into context; they are reached on demand:

```bash
aiwg discover "create a security review"   # rank matching skills/agents
aiwg show skill flow-security-review        # fetch the body
```

Run `aiwg discover` before concluding AIWG lacks a capability — it indexes the
full installed corpus, not just the kernel set copied into `~/.openhuman/skills/`.

## State boundaries

- `.aiwg/` holds project-local SDLC artifacts (requirements, architecture,
  reports). It is never deployed to other systems.
- `~/.openhuman/skills/` kernel skills and `~/.openhuman/.aiwg/rules/` are AIWG-managed
  deploy outputs — safe to regenerate with `aiwg refresh --provider openhuman`.

## See also

- Provider induction epic: [#1552](https://git.integrolabs.net/roctinam/aiwg/issues/1552)
- Agent target decision: `.aiwg/architecture/adr-openhuman-agent-target.md`
- Tier-2 native harness: [#1559](https://git.integrolabs.net/roctinam/aiwg/issues/1559)
- `docs/integrations/openclaw-quickstart.md` — closest user-global install analog
