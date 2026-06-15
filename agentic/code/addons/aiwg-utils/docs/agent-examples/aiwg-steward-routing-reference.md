# AIWG Steward — Routing Reference Lookups

Externalized from the agent definition per the few-shot-examples rule (#1587, #1600).

These are **reference-grade lookup tables** — large, mostly-static data the steward
*consults on demand* when answering a specific question. They are NOT the steward's
decision logic. The steward definition keeps its decision logic, the #1600-protected
routing tables (Issue Workflow Routing, Project-Local Authoring Routing), the
guardrails/gates, and the badge helper inline. What lives here is the bulk lookup data
that does not need to occupy the dispatch budget.

The steward keeps the *ability* to route — it knows what each table covers and where the
live source of truth is (`aiwg steward capabilities`, `aiwg --help`, the agent-loop
Step 0 table, `agentic/code/providers/capability-matrix.yaml`). It reads this file when
it needs the full enumerated lookup.

Reach this file with:

```bash
aiwg discover "aiwg-steward routing reference"
# or read docs/agent-examples/aiwg-steward-routing-reference.md directly
```

---

## Kernel-Pivot Deploy Model (#1212 / #1217)

Starting in 2026.5.0, AIWG splits skills into two tiers and uses a **no-copy** model for
the bulk of the surface:

| Tier | Where it lives | Per-project copy? | Discovered how |
|---|---|---|---|
| **Kernel** (15 skills today) | `<provider>/skills/` (e.g., `.claude/skills/`) | Yes | Platform-native flat scan, always-loaded |
| **Standard** (~385) | `$AIWG_ROOT/agentic/code/.../skills/<name>/` | **No** — read directly from source | `aiwg discover "<phrase>"` returns absolute paths anchored to `$AIWG_ROOT` |
| **Index** | `~/.local/share/aiwg/index/framework/` (XDG) | No, user-global | Built post-deploy by `aiwg use`, queried by `aiwg discover` |

**Kernel set = 9 framework quickrefs + 7 self-maintenance ops** (steward, aiwg-doctor,
aiwg-refresh, aiwg-status, aiwg-help, use, aiwg-regenerate). Behavior summary:
stale-skill cleanup prunes skills whose source no longer exists via the `.aiwg-managed`
marker; `--copy-all` opts into the legacy per-project mirror for sandboxed runtimes where
`$AIWG_ROOT` isn't readable; `aiwg discover --limit` defaults to 5; `aiwg show <name>`
resolves an unambiguous single name (use `aiwg show <type> <name>` when the type is
known). Version-specific provenance and edge cases (rc.17/rc.21/rc.23 changelog detail)
live in the worked-examples catalog.

**Deploy paths to know per provider** (kernel target only — standard tier no longer
copied by default):

| Provider | Kernel skills target |
|---|---|
| claude-code | `.claude/skills/` |
| cursor | `.cursor/skills/` |
| factory | `.factory/skills/` |
| copilot | `.github/skills/` |
| opencode | `.opencode/skill/` |
| warp | `.warp/skills/` |
| windsurf | `.windsurf/skills/` |
| openclaw | `~/.openclaw/skills/aiwg/` |
| hermes | `~/.hermes/skills/` |
| codex | `.codex/skills/` |

**Legacy `.aiwg/` mirrors**: in rc.10 → rc.13 the deployer copied standard skills to
`<provider>/.aiwg/skills/`. Starting in rc.14 those copies are skipped and any existing
legacy mirrors are pruned automatically on next `aiwg use`. If a user reports skills
"missing" from `.claude/.aiwg/skills/`, that's expected — point them at `aiwg discover`
and the absolute path it returns.

---

## Diagnostic — Is `$AIWG_ROOT` readable?

Before declaring a discover-path issue, verify the agent's environment can read AIWG_ROOT:

```bash
# From any project directory
aiwg version                                          # confirms install path
ls -la "$(aiwg version --json | jq -r '.installPath')/agentic/code/frameworks" | head -3
```

If `ls` fails or returns permission denied, the discover paths can't be `Read` by the
agent. Workarounds:
1. Set `AIWG_ROOT` to a user-readable copy of the install
2. Reinstall AIWG to a user-owned location: `npm install -g aiwg --prefix ~/.local`
3. Fall back to per-project copy mode (see "Force per-project copy" below)

## Force per-project copy (fallback)

When `$AIWG_ROOT` isn't accessible from the agent's runtime, fall back to the legacy copy
model:

```bash
aiwg refresh --provider <p> --copy-all
```

(Note: this flag is environment-driven, not declarative; document it in the user's project
README so other team members know.)

---

## CLI Toolset

Use these CLI commands for all operations. Never write files directly when a CLI command
exists.

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `aiwg version` | Check installed version | Start of any maintenance cycle |
| `aiwg update` | Pull latest from npm | When version is behind latest |
| `aiwg doctor` | Health check + diagnostics | Before and after every maintenance cycle |
| `aiwg refresh` | Update + re-deploy all frameworks | Most common maintenance operation |
| `aiwg refresh --dry-run` | Preview changes without applying | When user wants to check first |
| `aiwg refresh --provider <p>` | Refresh to a specific provider | Cross-provider deployment |
| `aiwg sync` | Deprecated alias for `aiwg refresh` | Still works, emits warning; do not use in new playbooks |
| `aiwg use <framework>` | Deploy/re-deploy a framework | Targeted deployment |
| `aiwg use <fw> --provider <p>` | Deploy to specific provider | Cross-provider targeted |
| `aiwg list` | Show installed frameworks | Inventory check |
| `aiwg remove <framework>` | Remove a framework | Only with user confirmation |
| `aiwg status` | Workspace health | Workspace-level check |
| `aiwg runtime-info` | Detect active provider | Provider identification |
| `aiwg validate-metadata` | Validate extension definitions | After modifications |
| `aiwg discover "<phrase>"` | Capability search across all installed skills/agents/commands/rules | When user asks "is there a skill for X?" or describes a capability without naming a skill |
| `aiwg discover "<phrase>" --type skill --json` | Same, programmatic output | When chaining into another agent or script |
| `aiwg index build --graph framework --force` | Rebuild the user-global capability index | When discover seems stale, or after manual edits to `agentic/code/` source |
| `aiwg catalog list` | Browse available frameworks | Discovery |
| `aiwg catalog search <q>` | Search available extensions | Discovery |
| `aiwg steward capabilities --provider <p>` | Show native vs emulated features for a provider | Capability questions |
| `aiwg steward capabilities --feature <f>` | Show provider support for a feature | Cross-provider questions |
| `aiwg steward capabilities --all` | Full capability matrix | Comprehensive audit |
| `aiwg steward find --capability <f>` | Routing advice for current provider | "What command should I use?" |
| `aiwg add-agent <name>` | Add individual agent | Targeted extension add |
| `aiwg add-command <name>` | Add individual command | Targeted extension add |
| `aiwg add-skill <name>` | Add individual skill | Targeted extension add |

---

## Command Routing Intelligence — Routing Examples

When a user asks "what command should I use for X?", the protocol (kept inline in the
definition) is: identify feature → detect provider → read capability matrix → recommend
native / emulated / closest-alternative. These rows are worked lookups for that protocol.
The live data is `agentic/code/providers/capability-matrix.yaml` and
`aiwg steward capabilities`.

| User Request | Provider | Correct Answer |
|-------------|----------|----------------|
| "I want to schedule a recurring task" | claude-code | Use `CronCreate` inside agent context; `aiwg schedule` from CLI |
| "I want to schedule a recurring task" | cursor | Use `aiwg schedule` — no native cron in Cursor |
| "I want to run agents in parallel" | claude-code | Use the `Agent` (Task) tool directly for short-lived subagents; `aiwg mc dispatch` for persistent missions |
| "I want to run agents in parallel" | factory | Use Factory Droids natively; `aiwg mc dispatch` for AIWG state tracking |
| "I want to use behaviors" | openclaw | Native — deploy to `~/.openclaw/behaviors/` via `aiwg add-behavior --provider openclaw` |
| "I want to use behaviors" | claude-code | AIWG emulation — `aiwg add-behavior` + daemon; Claude Code has hooks but not full behaviors |
| "Does Cursor support MCP?" | cursor | Yes — native MCP support. Configure with `aiwg mcp install cursor` |

---

## Orchestration & Loop Routing

The canonical routing surface is the **agent-loop Step 0 table**
(`agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md`), backed by
`.aiwg/architecture/adr-workflow-routing.md`. This is the on-demand summary lookup:

| User Request | Provider | Correct Answer |
|-------------|----------|----------------|
| "iterate on this until tests pass" (in-session) | claude-code / codex | Native `/goal "<task>; completion: <criterion>"` (#1451/#1469) — in-session loop |
| "fan out multiple agents in-session" | claude-code | MAY delegate the mechanism to the native Workflow tool; AIWG retains audit/gates/best-output/durability |
| "fan out multiple agents in-session" | codex | No core `/workflow` (it's plugin-provided, #1535); use the AIWG-owned `/aiwg-mission` or `aiwg mc dispatch` |
| "launch a Mission" / dynamic orchestration | any | `/aiwg-mission` (Codex) or `aiwg mc dispatch`; AIWG-owned durable conductor |
| "run detached/background/crash-resilient" | any | AIWG-native external route (`agent-loop-ext` / `ralph-external`) — native primitives are session-scoped |
| "coordinate Codex AND Claude agents" (cross-stack) | any | Cross-stack Mission (#1546) — one AIWG conductor dispatches workers to executors advertising the target `runtime:<name>` (e.g. `runtime:codex`) via the `serve` registry (routeMission) |

**Invariant:** whatever drives the worker mechanism, AIWG owns activity-log, gates,
best-output selection, checkpoint/resume durability, reproducibility, and cost. Native
primitives are *in-stack workers*; a Mission is the *cross-stack conductor*.

---

## Catalog Search by Capability

When users ask "what can AIWG do for X?" without knowing the command name:

```bash
aiwg catalog search scheduling        # Find scheduling-related extensions
aiwg catalog search agent-teams       # Find team/parallel agent extensions
aiwg steward find --capability mcp    # Routing advice for MCP on current provider
```

---

## Invocation Patterns

Worked "user says → steward action" lookups. The decision logic for these lives inline in
the definition; this is the enumerated quick-reference.

| User Says | Your Action |
|-----------|-------------|
| "make sure AIWG is up to date" | Full refresh: version check + update + re-deploy + verify |
| "deploy SDLC to Copilot" | `aiwg use sdlc --provider copilot` + verify |
| "health check" | `aiwg doctor` + structured report |
| "remove the media framework" | Confirm with user, then `aiwg remove media-curator` + verify |
| "what frameworks do I have?" | `aiwg list` + formatted summary |
| "deploy everything to cursor" | `aiwg refresh --provider cursor` |
| "repair the installation" | Full diagnostic: doctor → identify issues → refresh → verify |
| "what version am I running?" | `aiwg version` + compare to latest |
| "switch to the next channel" | `aiwg refresh --channel next` |
| "what's available?" | `aiwg catalog list` |
| "does my provider support scheduling natively?" | Detect provider → read matrix → report native vs emulated |
| "what command should I use to schedule a task?" | `aiwg steward find --capability scheduler` + explain result |
| "how does cursor compare to claude code?" | Cross-provider gap report from capability matrix |
| "what features are native on openclaw?" | `aiwg steward capabilities --provider openclaw` |

---

## References

- `few-shot-examples` rule — the inline ≤1 + catalog requirement and size ceiling
- #1587 — debloat oversized agent definitions
- #1600 — aiwg-steward reconcile + debloat (dual-source byte-identity)
- `agentic/code/providers/capability-matrix.yaml` — canonical live capability data
- `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md` — canonical agent-loop Step 0 routing table
- `docs/agent-examples/aiwg-steward-examples.md` — worked transcripts and report scaffolds
