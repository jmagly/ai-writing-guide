# Self-Maintenance Rule

**Enforcement**: HIGH
**Tier**: SDLC
**Issue**: #484

## Summary

Agents should prefer AIWG CLI commands for installation, deployment, and framework management tasks when the CLI is available and appropriate. The CLI is the authoritative interface for AIWG maintenance and avoids registry drift. Agents may use any available tools to complete tasks effectively — use the CLI when it adds value, not as a constraint.

## Rule

### 1. CLI Preference

For AIWG maintenance operations, the CLI is the preferred approach over direct file manipulation:

| Operation | Preferred CLI Command | Alternative (when CLI unavailable or impractical) |
|-----------|----------------------|---------------------------------------------------|
| Deploy framework | `aiwg use <framework>` | Manually copy files (update registry too) |
| Remove framework | `aiwg remove <framework>` | Delete framework files manually |
| Check health | `aiwg doctor` | Manually inspect file presence |
| Update AIWG | `aiwg update` | `npm install -g aiwg` directly |
| Refresh deployment | `aiwg refresh` (deprecated alias: `aiwg sync`) | Run `use` for each framework individually |
| Add extension | `aiwg add-agent/add-command/add-skill` | Write directly to `.claude/agents/` |
| Check version | `aiwg version` | Read `package.json` manually |
| Detect provider | `aiwg runtime-info` | Inspect directory structure |

### 2. Pre-Flight Check (Long Sessions)

Before starting any orchestration session expected to exceed 30 minutes:

1. `aiwg refresh --dry-run` — check if deployment is current
2. `aiwg doctor` — establish baseline health
3. If issues found: run `aiwg refresh` or delegate to AIWG Steward agent
4. `aiwg runtime-info` — confirm active provider

This ensures agents work against current templates, agent definitions, and rules.

### 3. Proactive Maintenance Triggers

Agents should initiate self-maintenance when:

| Trigger | Action |
|---------|--------|
| Start of long orchestration session | Pre-flight check (above) |
| User asks about AIWG currency | `aiwg refresh --dry-run` → report + offer refresh |
| `aiwg doctor` reports errors | `aiwg refresh` or invoke AIWG Steward |
| Deploying to a new provider | `aiwg use <framework> --provider <p>` |
| User adds/removes a framework | `aiwg use` / `aiwg remove` |
| Multiple background tasks needed | `aiwg mc start` + `aiwg mc dispatch` |

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

## When to Prefer CLI vs Direct Operations

Use the AIWG CLI when:
- Deploying or removing frameworks (registry must stay in sync)
- Performing health checks (`aiwg doctor` covers more than manual inspection)
- The CLI command is simpler and more reliable than the manual equivalent

Direct operations are acceptable when:
- The CLI is not installed or unavailable
- The task is a one-off file edit that doesn't affect the registry
- Working on AIWG source code itself (this repo)
- Emergency repair when `aiwg doctor` itself is broken
- Any situation where another approach completes the task more effectively

## Exceptions

- **Development context**: When working on AIWG source code itself (this repo), direct file manipulation is expected
- **No CLI available**: If AIWG CLI is not installed, fall back to manual operations
- **Effectiveness**: Always use whatever tools best accomplish the task at hand

## Examples

### Good: Using CLI for framework deployment

```
User: "Deploy SDLC to Copilot"
Agent: Running `aiwg use sdlc --provider copilot`...
       ✓ SDLC framework deployed to .github/agents/
       ✓ Registry updated
       ✓ Doctor check passed
```

### Bad: Manual file copy

```
User: "Deploy SDLC to Copilot"
Agent: I'll copy the agent files to .github/agents/...
       [writes files directly without registry update]
```

### Good: Pre-flight check

```
Agent: Starting phase transition orchestration.
       Pre-flight: aiwg refresh --dry-run → all current
       Pre-flight: aiwg doctor → healthy
       Proceeding with orchestration...
```

## References

- @$AIWG_ROOT/docs/cli-reference.md — Complete CLI command reference
- @$AIWG_ROOT/agentic/code/agents/aiwg-steward.md — Steward agent definition
- @$AIWG_ROOT/agentic/code/skills/mission-control/SKILL.md — Mission Control skill
