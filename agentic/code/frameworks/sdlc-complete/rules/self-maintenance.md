---
enforcement: medium
---

# Self-Maintenance Rule

**Enforcement Level**: MEDIUM
**Enforcement**: HIGH
**Tier**: SDLC
**Issue**: #484

## Summary

Agents should prefer **AIWG skills/agents** for installation, deployment, and framework management tasks. The skill carries the priming context — pre-flight checks, dry-run preview, preservation logic, provider verification — that the raw CLI alone does not. The CLI is the imperative tool the skill calls under the hood, not the agent's primary surface.

Direct file manipulation is the last resort: it bypasses both the skill priming AND the CLI's registry update logic, causing drift.

> See [`cli-secondary` rule](../../../addons/aiwg-utils/rules/cli-secondary.md) for the full agentic-first principle and the per-command pairing table. The routing table below is the maintenance-specific application of that principle.

## Rule

### 1. Skill-First Routing

For AIWG maintenance operations, the priority order is:

1. **Paired skill or agent** — carries priming, gates, recovery patterns
2. **Direct CLI** — only when no paired skill exists, or when on the discovery surface (Rule 2 of `cli-secondary`)
3. **Manual file manipulation** — last resort, bypasses everything

| Operation | Preferred path (skill-first) | Fallback (raw CLI) | Last resort |
|-----------|------------------------------|--------------------|-------------|
| Deploy framework | `use` skill | `aiwg use <framework>` | Manually copy files + update registry |
| Remove framework | `use`/remove skill | `aiwg remove <framework>` | Delete files manually |
| Check health (repair) | `aiwg-doctor` skill | `aiwg doctor` | Manually inspect file presence |
| Check health (read-only) | (discovery surface — direct CLI is correct) | `aiwg doctor` | — |
| Update AIWG | `aiwg-refresh` skill | `aiwg update` / `aiwg refresh` | `npm install -g aiwg` |
| Refresh deployment | `aiwg-refresh` skill | `aiwg refresh` (deprecated alias: `aiwg sync`) | Run `use` per framework |
| Regenerate context | `aiwg-regenerate` skill | `aiwg regenerate` | Hand-edit AIWG.md / AGENTS.md (preserves nothing) |
| Add extension | AgentSmith / CommandSmith / SkillSmith | `aiwg add-agent` etc. | Write directly to `.claude/agents/` |
| Check version | (discovery surface — direct CLI is correct) | `aiwg version` | Read `package.json` |
| Detect provider | (discovery surface — direct CLI is correct) | `aiwg runtime-info` | Inspect directory structure |
| Discover a capability | (discovery surface — direct CLI is correct) | `aiwg discover "..."` | Filesystem grep (forbidden — see `skill-discovery`) |
| Fetch a skill body | (discovery surface — direct CLI is correct) | `aiwg show skill <name>` | Direct file read (forbidden — see `skill-discovery`) |

### 2. Pre-Flight Check (Long Sessions)

Before starting any orchestration session expected to exceed 30 minutes:

1. Invoke the `aiwg-refresh` skill in dry-run mode (preferred) — it loads the refresh priming and previews changes. Fallback: `aiwg refresh --dry-run` directly.
2. Invoke the `aiwg-doctor` skill, or run `aiwg doctor` directly for a read-only health check.
3. If issues found: invoke the `aiwg-refresh` skill, or delegate to the `aiwg-steward` agent for complex repair.
4. `aiwg runtime-info` — confirm active provider (discovery surface — direct CLI is correct).

This ensures agents work against current templates, agent definitions, and rules.

### 3. Proactive Maintenance Triggers

Agents should initiate self-maintenance when:

| Trigger | Action (skill-first) |
|---------|----------------------|
| Start of long orchestration session | Pre-flight check (above) |
| User asks about AIWG currency | Invoke `aiwg-refresh` skill in dry-run mode → report + offer refresh |
| Health check reports errors | Invoke `aiwg-refresh` skill, or delegate to `aiwg-steward` agent |
| Deploying to a new provider | Invoke `use` skill (calls `aiwg use <framework> --provider <p>` under the hood) |
| User adds/removes a framework | Invoke `use` skill or its remove counterpart |
| Multiple background tasks needed | Invoke `mission-control` skill (which uses `aiwg mc start` + `aiwg mc dispatch`) |

### 4. Delegation Pattern

For complex maintenance tasks, delegate to the **AIWG Steward** agent rather than attempting ad-hoc repairs:

- Health check + repair: `@aiwg-steward`
- Version sync across providers: `@aiwg-steward`
- Provider migration: `@aiwg-steward`

### 5. Background Orchestration

For multi-task orchestrations exceeding a single session:

- Start a Mission Control session: `aiwg mc start`
- Dispatch long-running tasks: `aiwg mc dispatch <id> "<task>"`
- Monitor progress: `aiwg mc watch` or `aiwg mc status`

## Why

Without this rule, agents bypass the CLI and write files directly, causing:

1. **Registry drift** — `.aiwg/frameworks/registry.json` falls out of sync with actual files
2. **Provider mismatch** — files deploy to the wrong provider directory
3. **Version confusion** — agents work against stale templates/rules
4. **Silent failures** — no health check catches the inconsistency

The CLI encapsulates all the logic for provider detection, registry updates, file placement, and post-deployment verification. Bypassing it discards that logic.

## When to Use Skill vs Raw CLI vs Direct File Operations

**Use the paired skill when** (preferred default):
- A paired skill exists for the action (see `cli-secondary` rule's pairing table)
- The action is anything other than read-only discovery
- Examples: deploying frameworks, refreshing, regenerating context, scaffolding, running ralph, mission-control orchestration

**Use the raw CLI when**:
- The command is on the discovery surface (`aiwg discover`, `aiwg show`, `aiwg list`, `aiwg version`, `aiwg runtime-info`, status/list/info subcommands of larger commands)
- No paired skill exists for the action (rare for action commands — file an issue if you find one)
- The user explicitly typed the raw command
- You are inside a paired skill that is calling the CLI as its imperative step

**Direct file operations are acceptable only when**:
- The CLI is not installed or unavailable
- Working on AIWG source code itself (this repo)
- Emergency repair when `aiwg doctor` itself is broken
- A one-off file edit that does not affect the registry or deployed artifacts

## Exceptions

- **Development context**: When working on AIWG source code itself (this repo), direct file manipulation is expected
- **No CLI available**: If AIWG CLI is not installed, fall back to manual operations
- **Effectiveness**: Always use whatever tools best accomplish the task at hand

## Examples

### Good: Skill-first framework deployment

```
User: "Deploy SDLC to Copilot"
Agent: Invoking the `use` skill...
       Skill: pre-checks provider, validates framework, runs aiwg use sdlc --provider copilot
       ✓ SDLC framework deployed to .github/agents/
       ✓ Registry updated
       ✓ Doctor check passed
```

### Acceptable: Raw CLI for discovery

```
User: "Is AIWG up to date?"
Agent: aiwg version → v2026.5.2
       aiwg runtime-info → provider=claude-code
       (discovery surface — direct CLI is correct)
```

### Bad: Raw CLI for paired action

```
User: "Refresh AIWG"
Agent: Running `aiwg refresh` directly...
       (misses the aiwg-refresh skill's dry-run preview and preservation logic)
```

### Bad: Manual file copy

```
User: "Deploy SDLC to Copilot"
Agent: I'll copy the agent files to .github/agents/...
       [writes files directly without registry update]
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/cli-secondary.md — Agentic-first principle and per-command pairing table
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/skill-discovery.md — Discovery-first protocol
- @$AIWG_ROOT/docs/cli-reference.md — Complete CLI command reference
- @$AIWG_ROOT/agentic/code/agents/aiwg-steward.md — Steward agent definition
- @$AIWG_ROOT/agentic/code/skills/mission-control/SKILL.md — Mission Control skill
