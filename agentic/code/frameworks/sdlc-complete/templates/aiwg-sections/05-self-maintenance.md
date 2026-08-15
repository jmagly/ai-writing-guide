## AIWG Self-Maintenance

AIWG maintains itself using its own CLI. Agents should use the steward route and
CLI commands — not manual provider-directory cleanup — for installation,
deployment, stale-file repair, and discovery troubleshooting.

### When to Self-Maintain

| Trigger | Action |
|---------|--------|
| Start of long orchestration session | `aiwg refresh --dry-run` → refresh if needed |
| User asks "is AIWG up to date?" | `aiwg refresh --dry-run` → report + offer refresh |
| AIWG setup looks stale, broken, duplicated, or partly deployed | Invoke/load AIWG Steward → `aiwg status --probe --json` + `aiwg doctor` → `aiwg refresh --dry-run` |
| `aiwg doctor` shows errors | Invoke AIWG Steward, then `aiwg refresh` / `aiwg use all --provider <p>` / `aiwg regenerate` as diagnosed |
| A known skill/command is not discoverable | Invoke AIWG Steward → rebuild/sync index → retry `aiwg discover` |
| Provider files contain stale or missing managed skills/commands | `aiwg refresh --dry-run` → `aiwg refresh --provider <p>` or `aiwg use all --provider <p>` |
| Generated bootstrap files are stale | `aiwg regenerate` → reload provider session |
| User asks to clean up stale issues | `aiwg discover "audit open issues"` → `issue-audit` |
| User asks to fix/address issues | `aiwg discover "address issues"` → `address-issues` |
| User asks to file an AIWG product/setup issue | `aiwg discover "file an AIWG issue"` → `aiwg-issue` |
| Deploying to a new provider | `aiwg use <framework> --provider <p>` |
| User adds/removes a framework | `aiwg use` / `aiwg remove` |
| Long parallel orchestration needed | `aiwg mc start` + `aiwg mc dispatch` |

> `aiwg sync` is the deprecated alias for `aiwg refresh`. It still works but emits a warning; scheduled for removal after the 2026.5.x stable line.

### Self-Maintenance Agent

For complex maintenance and all unclear setup/repair tasks, route to the
**AIWG Steward** first. It owns provider capability routing, installation
repair, stale-file cleanup, and discovery-index troubleshooting.

- Health check + repair: `@aiwg-steward: run full health check`
- Version sync: `@aiwg-steward: ensure latest version deployed`
- Provider migration: `@aiwg-steward: deploy all frameworks to copilot`
- Stale provider cleanup: `@aiwg-steward: diagnose and clean stale provider files`
- Discovery repair: `@aiwg-steward: repair stale AIWG discovery results`

If steward is not loaded natively, discover and show it:

```bash
aiwg discover "steward repair AIWG setup" --type skill
aiwg show skill steward
```

Standard recovery ladder:

```bash
aiwg status --probe --json
aiwg doctor
aiwg refresh --dry-run
aiwg refresh
```

Use narrower commands when diagnosis calls for them:

```bash
aiwg use all --provider <provider>
aiwg regenerate
aiwg index build --graph framework --force
aiwg index sync --backend fortemi-core --graph framework
```

Reload the provider session after any command changes provider-facing files.

### Background Orchestration (Mission Control)

For multi-task orchestrations exceeding a single session:
- Start a session: `aiwg mc start --name "Sprint 4"`
- Dispatch tasks: `aiwg mc dispatch <id> "<task>" --completion "<criteria>"`
- Monitor: `aiwg mc watch` or `aiwg mc status`
- Finish: `aiwg mc stop <id>`

LFD controls apply to long-running Mission Control work: every dispatched
mission needs a measurable verifier, declared iteration/time/token/tool/spend
limits where observable, hypothesis-before-change retry notes, structural
variation after flat cycles, and a budget-exhausted best-output report instead
of random-walk continuation. Eval/holdout missions expose only aggregate
score/probe/status or VOID to workers; private answers and lint details stay
out of optimizer-readable output.

### Orchestrator Pre-Flight (Long Sessions)

Before starting any orchestration session > 30 minutes:
1. `aiwg refresh --dry-run` — check currency
2. `aiwg doctor` — baseline health
3. If issues found: invoke AIWG Steward or run `aiwg refresh`
4. Confirm provider: `aiwg runtime-info`
