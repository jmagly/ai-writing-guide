# CLI Commands Are Secondary to Their Paired Skills/Agents

**Enforcement Level**: HIGH
**Scope**: All agents on AIWG-managed projects
**Addon**: aiwg-utils (core, universal)
**Issue**: #1272

## Overview

AIWG is **agentic-first**. The agent self-guides via discovery, then invokes a **skill/agent/command** that carries the full priming context — rules, gates, preservation logic, recovery patterns. The CLI sits *underneath* that priming. It is the imperative tool the skill calls; it is not the agent's primary surface.

When a CLI command has a paired skill or agent, the agent MUST invoke the skill — not the raw CLI command directly. The skill loads the surrounding discipline. The CLI alone does not.

**Sole exception**: discovery and finder commands (`aiwg discover`, `aiwg show`, and friends listed below) are themselves the priming entry points. They remain primary and direct-callable. They are *how* the agent gets to the paired skill in the first place.

## The Principle

```
Agent receives task
  ↓
aiwg discover "<need>"          ← discovery: direct CLI is correct
  ↓
aiwg show skill <name>          ← discovery: direct CLI is correct
  ↓
Invoke the skill                ← skill loads priming context
  ↓
Skill calls the CLI under the hood   ← imperative tool, not the surface
```

## Mandatory Rules

### Rule 1: For Action Commands, Prefer the Paired Skill

When a CLI command has a paired skill or agent, the agent's default invocation MUST be the skill — not the raw CLI command.

**FORBIDDEN**:
```
User: "refresh AIWG"
Agent: *runs `aiwg refresh` directly*    ← misses the refresh skill's preservation logic,
                                            doctor pre-check, provider verification
```

**REQUIRED**:
```
User: "refresh AIWG"
Agent: *invokes the aiwg-refresh skill*
       *skill loads the priming: pre-flight doctor check, dry-run, provider confirmation*
       *skill then calls `aiwg refresh` with the right flags*
```

### Rule 2: Discovery Commands Stay Primary

These commands are themselves the priming entry points and MUST remain direct-callable. They are read-only / list-only by design:

| Command | Purpose |
|---|---|
| `aiwg discover` | Capability search across skills, agents, commands, rules |
| `aiwg show` | Fetch the body of a discovered artifact |
| `aiwg list` | List installed frameworks and addons |
| `aiwg catalog` | Search and list marketplace packages |
| `aiwg features` | List capability features |
| `aiwg help` | Show CLI command reference |
| `aiwg status` | Workspace health snapshot |
| `aiwg version` | Version + channel info |
| `aiwg runtime-info` | Provider + environment detection |
| `aiwg agentcard` | List installed agent capability cards |
| `aiwg-doctor` (read-only diagnostic mode) | Health check without repair |
| `aiwg ralph-status`, `aiwg mc status`, `aiwg cost-report`, `aiwg metrics-tokens` | Read-only status |
| Subcommand-level: `aiwg index query`, `aiwg index deps`, `aiwg index stats`, `aiwg packages list`, `aiwg packages info`, `aiwg storage show`, `aiwg storage list-backends` | Discovery within a multi-subcommand surface |

The agent invokes these directly. They do NOT have a paired "priming skill" — they ARE the priming.

### Rule 3: Mixed Subcommands — Classify Per Subcommand

Some commands carry both discovery and action subcommands. Classify per subcommand:

| Command | Discovery subcommands | Action subcommands (skill-first) |
|---|---|---|
| `aiwg index` | `query`, `deps`, `stats` | `build` |
| `aiwg packages` | `list`, `info` | `remove`, `install` |
| `aiwg ops` | `status`, `list` | `init`, `adopt`, `discover --register`, `push` |
| `aiwg storage` | `show`, `list-backends`, `test` | `migrate` |
| `aiwg activity-log` | `show`, `stats` | `append`, `rotate` |
| `aiwg memory` / `reflections` / `kb` / `provenance` / `research-store` | `path`, `list`, `get` | `put`, `delete`, `append-log` |

### Rule 4: Action Commands — Always Prefer Skill

The following CLI commands have paired skills/agents. When the user's intent maps to one of these, invoke the skill — not the raw CLI:

| CLI command | Paired skill/agent | Why the skill matters |
|---|---|---|
| `aiwg use <framework>` | `use` skill | Deployment validation, conflict resolution, registry update gates |
| `aiwg refresh` | `aiwg-refresh` skill | Pre-flight doctor check, dry-run preview, provider verification |
| `aiwg regenerate` | `aiwg-regenerate` skill | Preserves team directives, AGENTS.md link integrity, AIWG.md pipeline |
| `aiwg doctor` (repair mode) | `aiwg-doctor` skill | Diagnoses *and* invokes correct remediation skill per failure class |
| `aiwg init` | `intake-start` / project-init skills | Solution profile validation, intake gate |
| `aiwg new my-project` | `new-project` skill / intake-wizard | Scaffold + intake guidance |
| `aiwg promote` | promote skill | Hash verification, source preservation invariant |
| `aiwg remove` | use/remove skill | Reverts cleanly without orphaning |
| `aiwg add-agent` / `add-command` / `add-skill` / `add-behavior` / `add-template` | AgentSmith / CommandSmith / SkillSmith / template-engine | Scaffold validation, metadata pre-fill, deployment wiring |
| `aiwg scaffold-{addon,extension,framework}` | scaffold skills | Manifest validation, naming conventions, deployment path |
| `aiwg ralph` | `ralph` skill | Completion-criteria validation, recovery protocol, anti-laziness gates |
| `aiwg mc start/dispatch` | `mission-control` skill | Concurrency budget, supervisor wiring |
| `aiwg doc-sync` | `doc-sync` skill | Drift assessment, interactive reconciliation |
| `aiwg lint` / `aiwg cleanup-audit` / `aiwg best-practices-audit` | lint / audit skills | Threshold config, false-positive handling |
| `aiwg sdlc-accelerate` | `sdlc-accelerate` skill | Phase-gate orchestration, multi-agent dispatch |
| `aiwg execution-mode` / `snapshot` / `checkpoint` / `reproducibility-validate` | reproducibility skills | Mode-appropriate priming |
| `aiwg steward` | `steward` agent | Provider-aware routing, fallback logic |
| `aiwg index build` | the index-refresh patterns in `post-commit-index-refresh` rule | Targeted-graph rebuild, incremental mode |
| `aiwg ops <action>` (init, adopt, push) | ops framework skills | Workspace context, multi-repo discipline |
| `aiwg storage migrate` | storage skills | Per-subsystem migration logic, backend validation |

### Rule 5: Skill Documentation Must Say So

Every skill that has a paired CLI command MUST include a one-line note near the top:

> Prefer invoking this skill over running `aiwg <command>` directly. The skill carries the priming this CLI command needs to be used correctly.

And every CLI command reference doc (e.g. `docs/cli-reference.md`) MUST, for paired commands, link to the skill with a one-liner:

> Agents: invoke via the `[skill-name]` skill rather than calling this CLI directly. See `aiwg show skill <name>`.

### Rule 6: When Raw CLI Is Acceptable

The agent may invoke the CLI directly without going through a paired skill ONLY when:

1. The user explicitly typed the raw command (`"run aiwg refresh"`, not `"refresh AIWG"`)
2. No paired skill exists for the command
3. The command is on the discovery surface (Rule 2)
4. The agent is inside a paired skill, and that skill is calling the CLI as its imperative step
5. The CLI is being used in a documented diagnostic-only mode (e.g. `aiwg doctor` for read-only health check, with no repair)

## Detection Heuristics

You may be in violation of this rule if:

| Symptom | Likely cause |
|---|---|
| Agent ran `aiwg refresh` without first checking `aiwg refresh --dry-run` | Skipped the refresh skill's priming |
| Agent ran `aiwg regenerate` and overwrote team directives | Skipped the regenerate skill's preservation logic |
| Agent ran `aiwg use` and the workspace ended up in a half-deployed state | Skipped the use skill's verification gates |
| Agent ran `aiwg ralph` without a measurable `--completion` argument | Skipped the ralph skill's completion-criteria validation |
| Agent invoked CLI on a paired command without naming the skill that wraps it | Treated CLI as primary surface |

## Recovery

If you catch yourself about to invoke a paired CLI command directly:

1. **STOP** before running it
2. **DISCOVER** the paired skill: `aiwg discover "<the command's purpose>"`
3. **FETCH** the skill: `aiwg show skill <name>`
4. **INVOKE** the skill — let it call the CLI

If the paired skill genuinely doesn't exist (which is rare for action commands), file an issue so the pairing can be added.

## Interaction with Other Rules

This rule layers cleanly with:

- **`skill-discovery`** — discovery itself is the exception this rule encodes; the two rules together describe the full agentic-first flow (discover → show → invoke skill → skill calls CLI)
- **`self-maintenance`** — that rule's routing table now defers to this principle (skills first, CLI only when no pairing exists)
- **`research-before-decision`** — the skill IS the priming research; invoking it satisfies the research requirement
- **`human-authorization`** — many action CLIs have authorization gates wired into the skill, not the CLI itself; bypassing the skill bypasses the gate

## Platform Applicability

Universal. Every AIWG-supported provider receives the same skill/agent/CLI separation. The principle is platform-agnostic.

## Checklist

Before invoking any CLI command, verify:

- [ ] Is this a discovery/finder command (Rule 2 table)? If yes, run it directly.
- [ ] Is this a mixed command, and am I using a discovery subcommand (Rule 3)? If yes, run it directly.
- [ ] Otherwise: does a paired skill exist (Rule 4 table or `aiwg discover`)?
- [ ] If yes: am I invoking the skill rather than the raw CLI?
- [ ] If I'm running the CLI directly, do I have one of the exceptions in Rule 6?

If any answer is wrong — stop and route through the skill.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/skill-discovery.md — Discovery-first protocol
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/self-maintenance.md — Self-maintenance routing (now skill-first)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md — Kernel quickref, skill-first ordering
- Issue #1272 — Origin of this rule

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-11
