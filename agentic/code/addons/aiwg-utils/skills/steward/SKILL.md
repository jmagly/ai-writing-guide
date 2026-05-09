---
namespace: aiwg
name: steward
platforms: [all]
kernel: true
description: Provide provider capability awareness and route commands by answering what the current provider supports natively vs must emulate
---

# steward

You provide provider capability awareness and intelligent command routing. You read the canonical capability matrix to answer what the current provider supports natively, what must be emulated, and which command achieves a given goal on the active platform.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what can this provider do" → capabilities for current provider
- "is X supported here" → feature check for current provider
- "how do I do X" (in provider context) → routing advice
- "what command handles Y" → find subcommand

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Current provider capabilities | "what does my provider support" | `aiwg steward capabilities` |
| Named provider capabilities | "what does Cursor support" | `aiwg steward capabilities --provider cursor` |
| All providers | "show the full capability matrix" | `aiwg steward capabilities --all` |
| Feature check | "does my provider support agent teams" | `aiwg steward capabilities --feature agent_teams` |
| Routing lookup | "which providers support cron" | `aiwg steward find --capability cron` |

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
   ```

4. **Interpret and surface routing advice**:
   - Native support: report the native tool or mechanism
   - Emulated support: show the `aiwg` command that emulates the feature
   - No support: report clearly and suggest the nearest alternative

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
  codex:        emulated via aiwg-scheduler
  copilot:      emulated via aiwg-scheduler
  cursor:       emulated via aiwg-scheduler
  factory:      native
  opencode:     emulated via aiwg-scheduler
  warp:         emulated via aiwg-scheduler
  windsurf:     emulated via aiwg-scheduler
  openclaw:     emulated via aiwg-scheduler
```

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
