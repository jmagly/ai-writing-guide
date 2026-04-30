---
namespace: aiwg
name: daemon-init
platforms: [all]
description: Initialize AIWG daemon mode configuration from a named profile for persistent background sessions

---

# Daemon Init

You initialize AIWG daemon mode configuration from a named profile. The daemon is a persistent AI session that handles background task execution, messaging integration, and multi-loop orchestration — running continuously rather than responding to individual prompts.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "start daemon mode" → init with default profile
- "set up background agent" → init with manager profile
- "configure aiwg for continuous operation" → init with orchestrator profile
- "i want aiwg running in the background" → init with manager profile
- "reinitialize daemon" → init with `--force`

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Default init | "initialize daemon" | Run `aiwg daemon-init` |
| Named profile | "init daemon as orchestrator" | Run `aiwg daemon-init orchestrator` |
| Force reinit | "reinitialize daemon config" | Run `aiwg daemon-init --force` |
| Worker mode | "set up a worker daemon" | Run `aiwg daemon-init worker` |
| Monitor mode | "run daemon in monitoring mode" | Run `aiwg daemon-init monitor` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is a profile name specified? Default to `manager` if not.
   - Is `--force` needed (user mentioned reinitializing or overwriting)?

2. **Select the appropriate profile**:

   | Profile | Authority | Use Case |
   |---------|-----------|----------|
   | `manager` (default) | Balanced — orchestrate and execute | General-purpose persistent agent |
   | `orchestrator` | High — coordinate other agents | Driving multi-agent workflows |
   | `worker` | Low — execute, minimal decisions | Background task execution |
   | `monitor` | Read-only — observe and alert | Ops monitoring, health checks |

3. **Run the command**:

   ```bash
   # Default profile (manager)
   aiwg daemon-init

   # Named profile
   aiwg daemon-init orchestrator
   aiwg daemon-init worker
   aiwg daemon-init monitor

   # Overwrite existing config
   aiwg daemon-init --force
   aiwg daemon-init orchestrator --force
   ```

4. **Know where config is written**: `.aiwg/daemon/config.yaml` in the current project. This file controls:
   - Session persistence behavior
   - Messaging integration endpoints (Telegram, Slack, etc.)
   - Task queue and loop settings
   - Authority level and decision boundaries

5. **Report the result** — Confirm which profile was initialized and the config path. If daemon is already initialized, remind the user to use `--force` to overwrite.

## Examples

### Example 1: Default initialization

**User**: "Set up daemon mode"

**Extraction**: Init request, no profile specified — use `manager`

**Action**:
```bash
aiwg daemon-init
```

**Response**: "Daemon initialized with `manager` profile. Config written to `.aiwg/daemon/config.yaml`. To start the daemon, see `docs/daemon-guide.md` for session launch instructions."

---

### Example 2: Orchestrator profile

**User**: "Initialize the daemon as an orchestrator — I want it coordinating multiple sub-agents"

**Extraction**: Init with `orchestrator` profile

**Action**:
```bash
aiwg daemon-init orchestrator
```

**Response**: "Daemon initialized with `orchestrator` profile. High-authority orchestration settings applied. Config at `.aiwg/daemon/config.yaml`. The orchestrator profile enables `aiwg mc` (Mission Control) dispatch patterns."

---

### Example 3: Force reinitialize

**User**: "Reinitialize the daemon — the old config is stale"

**Extraction**: Force reinit, no profile specified — use `manager` with `--force`

**Action**:
```bash
aiwg daemon-init --force
```

**Response**: "Daemon config overwritten with `manager` profile. Previous config backed up to `.aiwg/daemon/config.yaml.bak`."

---

### Example 4: Worker for CI pipeline

**User**: "I need a worker daemon for running background test loops in CI"

**Extraction**: Init with `worker` profile

**Action**:
```bash
aiwg daemon-init worker
```

**Response**: "Daemon initialized with `worker` profile. Minimal decision authority configured — this profile executes tasks and reports results without autonomous orchestration. Suitable for CI background loops."

## Clarification Prompts

If the user's intent is ambiguous:

- "Which daemon profile should I use? Options: `manager` (default), `orchestrator`, `worker`, `monitor`"
- "A daemon config already exists at `.aiwg/daemon/config.yaml`. Should I overwrite it with `--force`?"
- "Are you initializing for a new project, or reconfiguring an existing daemon?"

## References

- @$AIWG_ROOT/src/cli/handlers/daemon.ts — Daemon command handler
- @$AIWG_ROOT/docs/daemon-guide.md — Full daemon documentation including session launch
- @$AIWG_ROOT/docs/messaging-guide.md — Messaging integration (Telegram, Slack) configuration
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
