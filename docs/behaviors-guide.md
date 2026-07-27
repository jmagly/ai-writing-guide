# Behaviors Guide

Behaviors are a new capability type in AIWG — the layer above skills. They come in two complementary forms that share the same core insight: **hooks change the execution model**.

## Two Layers, One Concept

The AI tool ecosystem has a capability spectrum that is often conflated:

| Layer | Invocation | Execution | Hooks | Deployed to |
|-------|-----------|-----------|-------|-------------|
| **Skill** | NLP invocation | LLM inference | No | External platforms |
| **Skill with scripts** | NLP invocation | LLM + scripts | No | External platforms |
| **Deployable behavior** | Events + NLP | Scripts + hooks | Yes | External platforms (OpenClaw, etc.) |
| **Runtime behavior** | Agent construction | Directives injected | Yes (continuous) | Runtime only — daemon process |

The key insight shared by both: **hooks flip the dependency direction**. A skill waits to be called. A behavior *subscribes* to the system and fires when conditions are met.

### Deployable Behaviors (`BEHAVIOR.md`)

Defined as `BEHAVIOR.md` files with scripts and event hooks. Deployed to platforms like OpenClaw via `aiwg use --provider openclaw`. OpenClaw is the first platform to support them natively — on platforms without hook support they degrade to enhanced skills.

**Use when:** You need a capability that reacts to file changes, tool completions, schedules, or other system events — not just when a user asks.

→ [Jump to Deployable Behaviors](#deployable-behaviors)

### Runtime Behaviors (YAML)

Defined as YAML files with directives and tools. Attached to daemons and agent loops at construction time. Never deployed to external platforms — they operate inside the AIWG runtime.

**Use when:** You need unconditional constraints on a long-running agent — budget limits, concurrency caps, process governance — that the LLM cannot choose to ignore.

→ [Jump to Runtime Behaviors](#runtime-behaviors)

---

## Deployable Behaviors

Deployable behaviors are the missing artifact type in the AI tool ecosystem: reactive, event-driven capabilities with scripts, hooks, and structured inputs. They are deployed to platforms the same way skills, agents, and commands are.

### Why They Exist

Skills are pull-based: a user invokes them, they run once, they return. OpenClaw introduced skills-with-scripts — procedurally more powerful, still pull-based. The missing piece is the *reactive* capability — one that subscribes to system events and fires when conditions are met.

A `security-sentinel` behavior doesn't need a user to type "run security scan" — it fires every time a `.ts` file is written, after every deploy, and on a 30-minute schedule. The user can still invoke it explicitly, but it also participates in the system continuously.

### Directory Structure

```
agentic/code/behaviors/<name>/
├── BEHAVIOR.md       ← definition: triggers, hooks, inputs, scripts, manifest
└── scripts/
    ├── main.sh       ← explicit invocation entry point
    ├── on-write.sh   ← called by on_file_write hook
    └── post-deploy.sh ← called by on_tool_complete hook
```

### BEHAVIOR.md Format

```yaml
---
name: security-sentinel
version: 1.0.0
description: Reactive security scanning that monitors code changes, deployment events, and runs scheduled audits.
platforms: [openclaw, claude-code]

# NLP triggers — invocation path (same as skills)
triggers:
  - "run security scan"
  - "check for vulnerabilities"
  - "security audit"

# Typed, structured inputs
inputs:
  - name: target
    type: string
    required: false
    default: "."
    description: File or directory to scan
  - name: severity
    type: enum
    values: [low, medium, high, critical]
    default: medium
    description: Minimum severity level to report

# Event hooks — reactive path, what makes it a behavior
hooks:
  on_file_write:
    - filter: "**/*.{ts,js,py}"
      action: run_script
      script: scripts/on-write.sh
  on_tool_complete:
    - tool: deploy
      action: run_script
      script: scripts/post-deploy.sh
  on_schedule:
    - cron: "*/30 * * * *"
      action: run_script
      script: scripts/main.sh

# Executable scripts
scripts:
  main: scripts/main.sh
  on-write: scripts/on-write.sh
  post-deploy: scripts/post-deploy.sh

# Manifest — discovery, composition, dependency metadata
manifest:
  category: security
  requires:
    bins: [npm, node]
    env: []
  outputs:
    - type: report
      path: .aiwg/reports/security/
  composable_with: [code-review, test-runner]
---

# Security Sentinel

Monitors source code changes and deployment events for security issues. On explicit invocation,
runs a full audit. When subscribed via hooks, provides continuous lightweight scanning.

## What It Scans

- Hardcoded secrets and API keys
- Dependency vulnerabilities (npm audit)
- OWASP top 10 patterns in changed files

## Outputs

Reports written to `.aiwg/reports/security/` in structured JSON.
```

### Hook Events

Behaviors subscribe to events in the platform's event system. AIWG defines standard hook names that platforms implement.

**File System**

| Hook | Fires when | Filter support |
|------|-----------|---------------|
| `on_file_write` | Any file is written | Glob pattern (`"**/*.ts"`) |
| `on_file_delete` | Any file is deleted | Glob pattern |
| `on_file_rename` | A file is renamed or moved | Glob pattern |

**Tool Lifecycle**

| Hook | Fires when | Filter support |
|------|-----------|---------------|
| `on_tool_complete` | An AI tool call completes | Tool name |
| `on_tool_error` | An AI tool call fails | Tool name |
| `on_session_start` | Agent session begins | — |
| `on_session_end` | Agent session ends | — |

**Version Control**

| Hook | Fires when | Filter support |
|------|-----------|---------------|
| `on_commit` | A git commit is made | Branch pattern |
| `on_pr_open` | A pull request is opened | — |
| `on_push` | Code is pushed to remote | Branch pattern |

**Schedule**

| Hook | Fires when | Format |
|------|-----------|--------|
| `on_schedule` | Cron schedule triggers | Standard cron expression |

### Structured Inputs

Unlike skills (conversational input), behaviors declare typed schemas. Platforms use these to render input forms or validate CLI arguments.

**Supported types:** `string`, `number`, `boolean`, `enum`, `array`, `object`

When invoked via NLP, AIWG extracts inputs from the conversation. When triggered via hooks, inputs are passed as environment variables to the script.

### Writing Scripts

Scripts are bash and receive context via environment variables:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Input values (from inputs: schema)
TARGET="${BEHAVIOR_INPUT_TARGET:-.}"
SEVERITY="${BEHAVIOR_INPUT_SEVERITY:-medium}"

# Hook context (set when triggered by a hook, empty on explicit invocation)
HOOK_EVENT="${BEHAVIOR_HOOK_EVENT:-}"
HOOK_PATH="${BEHAVIOR_HOOK_PATH:-}"      # on_file_write: path that changed
HOOK_TOOL="${BEHAVIOR_HOOK_TOOL:-}"      # on_tool_complete: tool that completed

# Project context
REPORT_DIR="${AIWG_REPORTS_DIR:-$(pwd)/.aiwg/reports}/security"
mkdir -p "$REPORT_DIR"

echo "[security-sentinel] Scanning $TARGET (triggered by: ${HOOK_EVENT:-manual})"
```

**Portability rules:**
- Use `#!/usr/bin/env bash` (not `/bin/bash`)
- Avoid GNU-specific flags (macOS uses BSD tools)
- Declare binary dependencies in `manifest.requires.bins`

### Graceful Degradation

On platforms without hook support, behaviors degrade to enhanced skills — only the `triggers:` path activates, `hooks:` is ignored.

| Platform | Scripts | Hooks | Status |
|----------|---------|-------|--------|
| OpenClaw | Yes | Yes | **Full support** — first implementation |
| Claude Code | No | Planned | Degrades to skill |
| Cursor | No | Planned | Degrades to skill |
| Warp | No | Planned | Degrades to skill |

### Deploying to OpenClaw

```bash
# Deploy SDLC framework (includes behaviors)
aiwg use sdlc --provider openclaw

# Deploy all frameworks
aiwg use all --provider openclaw

# Verify
openclaw behaviors list
```

Behaviors land in `~/.openclaw/behaviors/<name>/`. OpenClaw discovers them automatically and wires hooks at startup.

### Scaffolding a Behavior

```bash
# Scaffold with defaults
aiwg add-behavior my-behavior

# With hooks pre-configured
aiwg add-behavior test-watcher --hooks on_file_write,on_schedule --category testing

# Interactive
aiwg add-behavior --interactive
```

### Included Behaviors

| Behavior | Category | Hooks | Description |
|---------|----------|-------|-------------|
| `security-sentinel` | security | on_file_write, on_deploy, on_schedule | Continuous security scanning |
| `test-watcher` | testing | on_file_write, on_schedule | Reactive test execution |
| `build-monitor` | ci | on_tool_complete, on_schedule | Build health tracking |
| `quality-gate-watcher` | sdlc | on_commit, on_pr_open | SDLC gate enforcement |
| `artifact-sync` | sdlc | on_file_write (.aiwg/**) | Artifact index sync |

---

## Runtime Behaviors

Runtime behaviors are a separate but related concept: named, versioned capability bundles that attach to long-running agents (daemons, agent loops) at initialization and remain active for the agent's entire lifetime.

### What Are Runtime Behaviors

A runtime behavior is a YAML file that packages two things together:

- **Directives** — rules the agent must follow unconditionally, regardless of LLM reasoning
- **Tools** — callable functions exposed to the agent at runtime

The key distinction from other AIWG primitives:

| Primitive | Invocation | Lifecycle | Deployment |
|-----------|------------|-----------|------------|
| **Tool** | LLM decides whether to call | Per-call | External platforms |
| **Hook** | Fires on discrete events (start, stop, write) | Event-driven | External platforms |
| **Rule** | Loaded into context at session start | Per-session | External platforms |
| **Runtime behavior** | Attached at agent construction, always active | Full agent lifetime | Runtime only — never deployed to external providers |

Runtime behaviors exist because some capabilities cannot be optional. A budget limiter the LLM can choose to ignore is not a budget limiter. A process-group kill that only fires when the model decides to invoke it is unreliable. Runtime behaviors enforce capabilities at the runtime layer, below the LLM reasoning layer.

This design follows the AutoGen `register_reply()` pattern: capabilities registered at construction time execute on every message cycle regardless of what the model chooses.

See `.aiwg/architecture/adr-behaviors-sticky-capabilities.md` for the full architecture decision.

## Schema reference

```yaml
name: my-behavior
version: "1.0.0"
description: >
  What this behavior does and which agent types it applies to.

# Agent types this behavior is designed for.
# The runtime will warn (but not block) if attached to an unlisted type.
agentTypes:
  - daemon
  - agent-loop
  - long-running-agent

directives:
  - id: unique-directive-id          # Stable identifier — used for merge and override
    rule: >
      The rule text that the agent must follow. Write this as an imperative
      instruction. It is injected into the agent's system prompt and treated
      as a hard constraint.
    defaults:                         # Optional: default parameter values the directive uses
      param: value

tools:
  - tool: tool-name                   # Unique tool identifier within this behavior
    description: >
      What this tool does. Shown to the agent alongside its schema.
    schema:
      type: object
      properties:
        paramName:
          type: string
          description: What this parameter controls
      required: []
```

### Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique behavior name. Used in `behaviors` config key and CLI commands. |
| `version` | yes | Semantic version string. |
| `description` | yes | Human-readable summary. |
| `agentTypes` | yes | List of agent types this behavior targets. |
| `directives` | no | Array of directive objects. May be empty. |
| `directives[].id` | yes | Stable identifier. Must be unique within the behavior. Used for merge conflict resolution. |
| `directives[].rule` | yes | Imperative rule text injected into the agent's system prompt. |
| `directives[].defaults` | no | Default parameter values referenced by the rule. |
| `tools` | no | Array of tool definitions. May be empty. |
| `tools[].tool` | yes | Tool name. Must be unique within the behavior. |
| `tools[].description` | yes | Description shown to the agent. |
| `tools[].schema` | yes | JSON Schema object describing the tool's input. |

## Discovery tiers

The runtime discovers behaviors from three locations, in precedence order:

| Tier | Path | Purpose |
|------|------|---------|
| **Framework** | `agentic/code/behaviors/` | Shipped defaults — maintained by AIWG |
| **Project** | `.aiwg/behaviors/` | Project-specific overrides and additions |
| **User** | `~/.config/aiwg/behaviors/` | User preferences applied across all projects |

When the same behavior `name` appears in multiple tiers, the more specific scope wins:

```
project > framework > user
```

This means a project-level `ops-toolset.yaml` fully replaces the framework-level one for that project. The user tier has the lowest precedence because it applies broadly; project-level intent should override broad preferences.

### Precedence example

Given:
- `agentic/code/behaviors/ops-toolset.yaml` (framework, version 1.0.0)
- `.aiwg/behaviors/ops-toolset.yaml` (project, version 1.1.0 with a modified `budget-gate` directive)

The runtime loads the project version. The framework version is ignored for this project.

## Built-in behaviors

### ops-toolset

**Path:** `agentic/code/behaviors/ops-toolset.yaml`
**Version:** 1.0.0
**Agent types:** `daemon`, `agent-loop`, `long-running-agent`

The default behavior for operational agents. It is included automatically when a daemon is configured with `"behaviors": ["ops-toolset"]`.

**Directives (5):**

| Directive ID | Summary |
|-------------|---------|
| `process-group-kill` | Use `process.kill(-pid, signal)` to terminate entire process trees. Prevents orphaned child processes. |
| `restart-intensity` | Track restart count per task within a sliding window. Mark permanently failed when threshold is exceeded (Erlang/OTP pattern). |
| `concurrency-cap` | Never exceed `max_concurrent` simultaneous sessions. Queue overflow is rejected with a structured error. |
| `budget-gate` | Check aggregate spend before spawning. Warn at 90% of daily limit; block at 100%. |
| `zombie-reap` | Periodically reconcile PID files against running processes. Remove stale entries. |

**Tools (7):**

| Tool | Description |
|------|-------------|
| `process-list` | List running agent loops with PID, status, start time, and resource usage |
| `process-kill` | Kill a loop by ID using process group kill |
| `resource-snapshot` | Current CPU, memory, load average, queue depth, and daemon uptime |
| `circuit-status` | Circuit breaker state: `closed`, `open`, or `half-open`, with failure count and cooldown remaining |
| `queue-inspect` | Queue depth, max depth, oldest entry, and priority distribution |
| `loop-history` | Completed loop summaries: ID, duration, exit status, iteration count, cost |
| `budget-remaining` | Daily limit, spent, remaining, and percent used |

The tools in `ops-toolset` map directly to the `daemon.*` IPC methods documented in the [Daemon Guide](daemon-guide.md#daemon-supervisor-ipc-methods). When the agent invokes `resource-snapshot`, it calls the same underlying `MetricsCollector` that `daemon.resource.snapshot` uses.

## Creating custom behaviors

### Step 1: Choose the right tier

- Reusable across all your projects → `~/.config/aiwg/behaviors/`
- Specific to this project → `.aiwg/behaviors/`
- Contribution to AIWG itself → `agentic/code/behaviors/`

### Step 2: Create the YAML file

Name the file `<behavior-name>.yaml`. The `name` field inside must match the filename without extension.

**Example: a cost-reporting behavior for finance-sensitive projects**

```yaml
name: cost-reporter
version: "1.0.0"
description: >
  Emits structured cost reports after each loop completion.
  Designed for projects with chargeback or billing tracking requirements.

agentTypes:
  - daemon
  - agent-loop

directives:
  - id: emit-cost-on-complete
    rule: >
      After every loop completes, emit a structured cost record including
      loop ID, model, input tokens, output tokens, and total USD cost.
      Write the record to .aiwg/reports/cost-log.jsonl in append mode.
    defaults:
      output_path: ".aiwg/reports/cost-log.jsonl"

  - id: cost-ceiling
    rule: >
      If a single loop exceeds per_loop_limit_usd, abort it gracefully
      and record the ceiling event in the cost log with reason "per-loop-ceiling".
    defaults:
      per_loop_limit_usd: 5.00

tools:
  - tool: cost-log-tail
    description: >
      Return the last N entries from the cost log file.
    schema:
      type: object
      properties:
        limit:
          type: integer
          default: 10
          description: Number of entries to return
      required: []
```

### Step 3: Verify discovery

```bash
aiwg behavior list
```

The output should include `cost-reporter` with its tier (project or user).

### Step 4: Attach to a daemon

In `.aiwg/daemon.json`:

```json
{
  "supervisor": {
    "behaviors": ["ops-toolset", "cost-reporter"]
  }
}
```

Restart the daemon to apply:

```bash
aiwg daemon stop && aiwg daemon start
```

### Step 5: Confirm attachment

```bash
aiwg behavior info cost-reporter
```

Output shows version, tier, directives, and whether it is currently attached.

## CLI commands

```bash
# List all discovered behaviors across all tiers
aiwg behavior list

# Show full detail for a specific behavior
aiwg behavior info <name>

# Attach a behavior to the running daemon (hot-attach, no restart)
aiwg behavior apply <name>

# Detach a behavior from the running daemon
aiwg behavior remove <name>
```

### behavior list output

```
NAME              VERSION  TIER       AGENT TYPES                  DIRECTIVES  TOOLS
ops-toolset       1.0.0    framework  daemon, agent-loop, ...      5           7
cost-reporter     1.0.0    project    daemon, agent-loop           2           1
```

The `TIER` column shows where the behavior was loaded from. When a name is overridden by a higher-precedence tier, the lower-tier entry is not shown.

## Merge rules

When multiple behaviors are attached to the same agent, their directives and tools are merged into a single capability set.

### Directives

Directives are unioned by `id`. If two behaviors define a directive with the same `id`, the later one in the attachment order wins, and a warning is emitted:

```
WARN: directive id "budget-gate" defined in both "ops-toolset" and "cost-reporter".
      "cost-reporter" wins (later in attachment order). To suppress, set explicit priority.
```

To suppress the warning and declare intent explicitly, add a `priority` field:

```yaml
directives:
  - id: budget-gate
    priority: 10          # Higher number wins. Default is 0.
    rule: >
      ...
```

### Tools

Tools are unioned by `tool` name. A name collision between behaviors is a hard error (not a warning) because tool schemas must be unambiguous:

```
ERROR: tool name "process-kill" is defined in both "ops-toolset" and "my-behavior".
       Rename one of them or remove the duplicate.
```

### Safe combinations

Behaviors are designed to combine safely when they target different concerns. The built-in `ops-toolset` defines governance directives; project behaviors typically add domain-specific reporting or policy. Collision only occurs when two behaviors try to own the same directive or tool name.

## Troubleshooting

**Behavior not discovered**

```bash
aiwg behavior list
```

If the behavior is missing, verify the file is in one of the three discovery paths and that the `name` field in the YAML matches the filename (without `.yaml`).

**Directive conflict warning on startup**

Two attached behaviors define the same directive `id`. The later behavior in the `behaviors` array wins. If the outcome is wrong, either rename the directive in your custom behavior or set `priority` fields explicitly.

**Tool name collision error**

Two attached behaviors define the same `tool` name. Rename the tool in your custom behavior — built-in tool names should not be shadowed because the daemon's IPC layer depends on them.

**Behavior attached but not taking effect**

Directives are injected into the agent's system prompt at construction time. If the agent was already running when `aiwg behavior apply` was called, the directive applies to new sessions spawned after the attach. Existing running sessions are unaffected until they complete and are restarted.

## Behaviors vs Skills vs Agents

| | Skill | Deployable Behavior | Runtime Behavior | Agent |
|---|---|---|---|---|
| **What it is** | NLP instructions | Reactive platform artifact | Agent capability bundle | AI persona |
| **Trigger** | User invocation | Events + user invocation | Agent construction | User invocation |
| **Scripts** | No | Yes | No | No (uses AI tools) |
| **Hooks** | No | Yes | Yes (continuous) | No |
| **Inputs** | Conversational | Typed, structured | Config | Conversational |
| **Lifetime** | Single invocation | Persistent / subscribed | Full agent lifetime | Single session |
| **Deployed to** | External platforms | External platforms | Runtime only | External platforms |
| **Use when** | Quick NLP task | React to system events | Unconditional agent constraints | Specialized AI role |

---

## Cross-References

- [OpenClaw Integration Guide](openclaw-guide.md) — Deploying behaviors to OpenClaw
- [Daemon Guide](daemon-guide.md) — Daemon configuration, headend architecture, and IPC methods
- [CLI Reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/cli-reference.md) — `aiwg add-behavior`, `aiwg behavior list/info/apply`
- `agentic/code/behaviors/` — Behavior source files
- `.aiwg/architecture/adr-behaviors-deployable-artifact.md` — Architecture decision for deployable behaviors
- `.aiwg/architecture/adr-behaviors-sticky-capabilities.md` — Architecture decision for runtime behaviors
- `.aiwg/architecture/adr-daemon-as-headend.md` — DaemonSupervisor headend architecture
- Issue #540 — BEHAVIOR.md format spec
- Issue #541 — Framework behavior source directories
- Issue #542 — OpenClaw provider deployment
- Issue #543 — `aiwg add-behavior` scaffolding command
