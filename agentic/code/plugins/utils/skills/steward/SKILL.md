---
namespace: aiwg
name: steward
platforms: [all]
kernel: true
description: Provide provider capability awareness and route commands by answering what the current provider supports natively vs must emulate
triggers:
  - "help me choose what to use"
  - "help me choose the right AIWG framework or skill"
  - "ask for one recommended path and one fallback"
  - "aiwg steward"
---

# steward

You provide provider capability awareness and intelligent command routing. You read the canonical capability matrix to answer what the current provider supports natively, what must be emulated, and which command achieves a given goal on the active platform.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what can this provider do" → capabilities for current provider
- "is X supported here" → feature check for current provider
- "how do I do X" (in provider context) → routing advice
- "what command handles Y" → find subcommand
- "which model should this use" → model policy route
- "model catalog or routing" → `aiwg steward models`
- "install or repair AIWG" → public provider-orchestrated setup manifest

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Current provider capabilities | "what does my provider support" | `aiwg steward capabilities` |
| Named provider capabilities | "what does Cursor support" | `aiwg steward capabilities --provider cursor` |
| All providers | "show the full capability matrix" | `aiwg steward capabilities --all` |
| Feature check | "does my provider support agent teams" | `aiwg steward capabilities --feature agent_teams` |
| Routing lookup | "which providers support cron" | `aiwg steward find --capability cron` |
| Model routing | "which model should this use" | `aiwg steward models`; then `aiwg models audit` or `aiwg models resolve` |
| Install or repair AIWG | "get AIWG working in this project" | Follow the public `setup.aiwg.yaml`; use the self-verifying deployment result, with status and doctor only for audit or recovery |

## AIWG Installation Routing

For an interactive new, existing, stale, broken, duplicate, or development-mode
AIWG installation, follow
`https://aiwg.io/setup.aiwg.yaml` in the
current supported provider. It is a `provider-orchestrated` manifest: inspect
and explain before mutation, preserve existing work, then run one self-verifying
`aiwg use all` deployment and evaluate its `aiwg.use.result.v1` response. Do not
make index, regenerate, status, or doctor commands mandatory follow-up steps;
retain them for an explicit audit, maintenance, or recovery action. Do not send
this manifest to deterministic `aiwg setup-run`.

Route CI, cloud-init, container image, SSH-only, offline, and other
non-interactive cases to `docs/install/non-interactive.md`. Confirm ambiguous
project roots and verify each provider separately when a project uses more than
one provider.

## Behavior

When triggered:

1. **Identify the subcommand**:
   - `capabilities` — show what a provider supports, optionally filtered by feature
   - `find` — show which providers support a capability and how to invoke it

2. **Detect provider context** (for `capabilities` without `--provider`):
   - Check `CLAUDE_CODE_VERSION` env → `claude-code`
   - Check `CODEX_API_KEY` env → `codex`
   - Check `.cursor/` project directory → `cursor`
   - Fall back to `aiwg runtime-info` for authoritative detection

3. **Run the appropriate command**:

   ```bash
   # Current provider capabilities (auto-detected)
   aiwg steward capabilities

   # Named provider
   aiwg steward capabilities --provider copilot

   # Check specific feature on current provider
   aiwg steward capabilities --feature agent_teams

   # Full matrix — all providers, all features
   aiwg steward capabilities --all

   # Find providers that support a capability
   aiwg steward find --capability cron

   # Model policy and dynamic catalog routing
   aiwg steward models
   aiwg models sources --json
   aiwg models audit --provider codex
   ```

4. **Interpret and surface routing advice**:
   - Native support: report the native tool or mechanism
   - Emulated support: show the `aiwg` command that emulates the feature
   - No support: report clearly and suggest the nearest alternative

## Project-Local Authoring Routing

Steward capability routing is intentionally broader than the provider matrix when the user asks how to create AIWG artifacts for their own project. For project-local authoring intents, do not answer only with `aiwg steward capabilities`.

Route these intents directly:

| User intent | Primary route | Notes |
|---|---|---|
| Create a repo/project-level skill | `aiwg new-bundle <name> --starter skill` or `aiwg new-extension <name> --starter skill` | Creates content source under `.aiwg/{extensions,addons,frameworks}/<name>/`; deploy with `aiwg use <name>`. |
| Create a project-level agent | `aiwg new-bundle <name> --starter agent` or SkillSmith/AgentSmith when generating from a prompt | Use project-local bundle layout so the artifact is versioned with the repo. |
| Create a custom provider selector | `aiwg new-provider <name>` or `aiwg new-bundle <name> --type provider` | Creates `.aiwg/providers/<name>/` with `providerConfig.extends`; select it with `aiwg use <framework> --provider <name>`. |
| Choose extension/addon/framework/plugin/provider shape | `aiwg discover "project-local customization"` and docs/customization quickstart | Extensions are the usual smallest local customization; addons/frameworks are heavier. Plugins are marketplace delivery wrappers. Providers are metadata selectors. |
| Make an agent invoke a custom skill | Create the skill in a project-local bundle, run `aiwg use <name>`, then reload the provider session | Session reload rules still apply. |

Canonical docs: `docs/customization/project-local-quickstart.md`, `docs/customization/project-local-lifecycle.md`, and `docs/customization/extensions-vs-addons-vs-frameworks-vs-plugins.md`. Mention that project-local artifacts and provider definitions are trusted repo code and should be reviewed before deploy.

Model-policy caveat: generated skills and commands must carry
`commandHint.modelRole` and `commandHint.modelTier`; generated agents must carry
`model-role` and `model-tier`. Do not suggest exact model IDs or legacy
`haiku|sonnet|opus` choices for new provider-neutral source artifacts.

Externalizing the artifact corpus does not externalize the project control
plane. Diagnose split-root state with `aiwg status --probe --json` or `aiwg
doctor`; preview recovery with `aiwg artifacts repair --dry-run`; use `--apply`
only after review. Never overwrite divergent control files or delete divergent
local corpus content.

## Feature-Domain Routing (proactive)

Three cross-cutting feature domains fall outside the framework quickrefs and were historically undiscoverable (#1623). The steward owns routing for them via the `steward-quickref` kernel skill. Be **proactive** — these are easy to miss:

| Domain | Canonical discover phrase | Owning capability |
|---|---|---|
| **Expansion authoring** (extension/addon/framework) | `aiwg discover "author an expansion"` | `scaffold-extension` / `-addon` / `-framework` |
| **Persona / SOUL** (author **and** select) | `aiwg discover "create a persona"` · `aiwg discover "select a persona"` | `soul-create`, persona agents under `agentic/code/agents/personas/` |
| **Project creation** | `aiwg discover "scaffold a project"` | `new-project`, `new-bundle` |

Routing protocol:

1. **Volunteer the affordance** (Norman signifier). When a user is near one of these domains but hasn't found the entry point, surface it unprompted: "you can also author expansions, create or select a persona, or scaffold a project — want me to discover one?"
2. **Discover, don't dead-end.** Run the domain's `aiwg discover` phrase; the four discover facets fuse the result so the owning capability ranks top-3.
3. **Re-query on low confidence.** If the first pass is weak, broaden the phrase or try an adjacent domain before concluding "not found" — the `skill-discovery` rule forbids decline-without-search.
4. **Show the selection.** `aiwg show <type> <name>` for the chosen capability.

See `steward-quickref` for the full anchor tables.


## Capability Matrix Source

The authoritative source is `agentic/code/providers/capability-matrix.yaml`. Key features tracked:

| Feature | Description |
|---------|-------------|
| `cron` | Scheduled/recurring task execution |
| `agent_teams` | Native multi-agent team orchestration |
| `tasks` | Background task dispatch |
| `mcp` | Model Context Protocol server support |
| `behaviors` | Hook-based behavior scripts |
| `mission_control` | Multi-session orchestration (`aiwg mc`) |

## Examples

### Example 1: Check current provider

**User**: "What does my provider support?"

**Extraction**: Capabilities request, no provider specified — auto-detect

**Action**:
```bash
aiwg steward capabilities
```

**Response**: "You are on **claude-code**. Native support: agent_teams, tasks, mcp, cron. Emulated via aiwg: behaviors (via hooks), mission_control (via `aiwg mc`)."

### Example 2: Feature-specific check

**User**: "Does my provider support agent teams natively?"

**Extraction**: Feature check — `agent_teams` on current provider

**Action**:
```bash
aiwg steward capabilities --feature agent_teams
```

**Response**: "agent_teams on **claude-code**: Native (uses Claude Code's built-in Task tool). No emulation needed."

### Example 3: Cross-provider lookup

**User**: "Which providers support cron natively?"

**Extraction**: `find` subcommand for `cron` capability

**Action**:
```bash
aiwg steward find --capability cron
```

**Response**:
```
cron support across providers:
  claude-code:  native
  codex:        external trigger (system cron/systemd/CI)
  copilot:      unsupported
  cursor:       unsupported
  factory:      unsupported
  opencode:     unsupported
  warp:         unsupported
  windsurf:     unsupported
  openclaw:     unsupported
```

External means the host scheduler owns time and launches a reviewed provider
command. It is not AIWG emulation; no `aiwg schedule` or `aiwg daemon` command
exists in the production CLI.

### Example 4: Full matrix

**User**: "Show me the capability matrix for all providers"

**Extraction**: `capabilities --all`

**Action**:
```bash
aiwg steward capabilities --all
```

**Response**: Formatted table of all 9 providers x all 6 features, with native/emulated/unsupported indicators.

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you asking about the provider you're currently using, or a specific provider?"
- "Should I check all features or a specific one?"

## References

- @$AIWG_ROOT/src/cli/handlers/steward.ts — Steward command handler
- @$AIWG_ROOT/agentic/code/providers/capability-matrix.yaml — Authoritative capability matrix
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
