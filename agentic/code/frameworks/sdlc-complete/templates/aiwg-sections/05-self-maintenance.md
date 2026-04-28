## AIWG Self-Maintenance

AIWG maintains itself using its own CLI. Agents should use CLI commands — not manual file operations — for all installation and deployment tasks.

### When to Self-Maintain

| Trigger | Action |
|---------|--------|
| Start of long orchestration session | `aiwg refresh --dry-run` → refresh if needed |
| User asks "is AIWG up to date?" | `aiwg refresh --dry-run` → report + offer refresh |
| `aiwg doctor` shows errors | `aiwg refresh` or invoke AIWG Steward |
| Deploying to a new provider | `aiwg use <framework> --provider <p>` |
| User adds/removes a framework | `aiwg use` / `aiwg remove` |
| Long parallel orchestration needed | `aiwg mc start` + `aiwg mc dispatch` |

> `aiwg sync` is the deprecated alias for `aiwg refresh`. It still works but emits a warning; scheduled for removal after the 2026.5.x stable line.

### Self-Maintenance Agent

For complex maintenance tasks, delegate to the **AIWG Steward** agent:
- Health check + repair: `@aiwg-steward: run full health check`
- Version sync: `@aiwg-steward: ensure latest version deployed`
- Provider migration: `@aiwg-steward: deploy all frameworks to copilot`

### Background Orchestration (Mission Control)

For multi-task orchestrations exceeding a single session:
- Start a session: `aiwg mc start --name "Sprint 4"`
- Dispatch tasks: `aiwg mc dispatch <id> "<task>" --completion "<criteria>"`
- Monitor: `aiwg mc watch` or `aiwg mc status`
- Finish: `aiwg mc stop <id>`

### Orchestrator Pre-Flight (Long Sessions)

Before starting any orchestration session > 30 minutes:
1. `aiwg refresh --dry-run` — check currency
2. `aiwg doctor` — baseline health
3. If issues found: invoke AIWG Steward or run `aiwg refresh`
4. Confirm provider: `aiwg runtime-info`
