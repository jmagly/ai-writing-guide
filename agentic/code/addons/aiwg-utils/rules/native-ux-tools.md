---
enforcement: high
---

# Native UX Tools for Interactive Questions

**Enforcement Level**: HIGH
**Scope**: All agents and commands with interactive modes
**Issue**: #448; #1668 (Codex mechanism + mode-gating)

## Overview

When asking the user an interactive question, agents MUST prefer platform-native interaction tools over plain text output. Native tools provide better UX (visual distinction, focus management, structured responses) and prevent misrouted replies.

## Rule

1. **Check for native interaction tool** before asking any interactive question
2. **If available, use it** — do NOT output the question as plain text
3. **If unavailable, fall back** to markdown text with clear formatting
4. **One question per interaction turn** — never batch multiple questions into a single prompt

## Platform Capability Matrix

| Platform | Native Tool | How to Detect | Fallback |
|----------|------------|---------------|----------|
| Claude Code | `AskUserQuestion` | Listed in available deferred tools | Markdown text output |
| Warp Terminal | None confirmed | Check WARP.md context | Markdown text output |
| Factory AI | None confirmed | Check `.factory/` config | Markdown text output |
| Cursor | None confirmed | Check `.cursor/` config | Markdown text output |
| GitHub Copilot | None confirmed | Check `.github/copilot/` | Markdown text output |
| OpenCode | None confirmed | Check `.opencode/` config | Markdown text output |
| Codex (OpenAI) | `request_user_input` (mode-gated, usually off) · MCP elicitation (stable) | `codex features list`; check tool surface | Markdown text output — see Codex note below |
| Windsurf | None confirmed | Check AGENTS.md context | Markdown text output |

## Detection Pattern

```
Before asking a question:
1. Check if AskUserQuestion (or equivalent) is in available tools
2. If yes → call it with the question text
3. If no → output as formatted markdown text
```

## Codex (OpenAI) — Two Mechanisms, Mostly Mode-Gated

Codex does **not** expose a single `AskUserQuestion`-style tool the way Claude Code
does. It has two distinct structured-question paths with very different availability
(verified against `codex features list`, codex-cli 0.142.x):

| Mechanism | Initiator | Feature flag | Default state | Effect |
|-----------|-----------|--------------|---------------|--------|
| `request_user_input` | the agent | `default_mode_request_user_input` | **off** (`under development`) | In Default mode the agent has **no** interactive-question tool in its surface |
| MCP elicitation (single/multi-select enum forms) | an MCP server/tool | `tool_call_mcp_elicitation` | **on** (`stable`) | A tool the agent calls can return an elicitation request; Codex renders a native form |

**This is the root cause of "Codex isn't using interactive questions"** (#1668): in a
normal Default-mode session the agent-initiated tool simply is not available, so it
correctly falls back to plain text. No AIWG instruction can make Codex call a tool
that is not in its surface. The agent-initiated path appears only in specific
modes/builds or when an operator enables the experimental flag
(`codex --enable default_mode_request_user_input`, or
`features.default_mode_request_user_input = true` in `~/.codex/config.toml`).

### Decision guidance for Codex agents

1. **If `request_user_input` is actually in your tool surface** (some modes/builds, or
   operator-enabled) → use it for a short, high-value clarification.
2. **If you reach the user through an MCP tool that supports elicitation** → prefer a
   single/multi-select elicitation form over free text.
3. **Otherwise (the common Default-mode case)** → ask **one** clearly-formatted
   markdown question with explicit options (per the Fallback example below). Do **not**
   silently proceed on an assumption when a one-line clarification would materially
   change the outcome — a well-formatted text question is the correct fallback, not
   guessing.
4. **Proceed with best judgment only** when the choice is low-stakes, reversible, and a
   sensible default exists — then state the assumption you made.

Operators who want richer guided setup/triage UX in Codex today should rely on
**MCP elicitation** (stable) via an AIWG MCP tool, not the agent-initiated tool.

**AIWG provides this path:** when the AIWG MCP server is connected, call the
**`ask-user`** tool with a `question` + `options` (and `multiSelect`). On Codex it
emits a native single/multi-select elicitation form and returns the choice; on
clients without elicitation it returns a markdown prompt for you to present. This
lets a Codex agent ask structured questions even though its own
`request_user_input` tool is unavailable in Default mode (#1676).

## Examples

### Correct (Claude Code — native tool available)

```
// Agent detects AskUserQuestion is available
AskUserQuestion("Which provider would you like to regenerate?")

// Platform renders native input UI
// Agent receives structured response
```

### Correct (Fallback — no native tool)

```markdown
**Question**: Which provider would you like to regenerate?

Options: `claude` | `warp` | `copilot` | `cursor` | `all`

Please reply with your choice.
```

### Incorrect

```
Which provider would you like to regenerate? (claude/warp/copilot/cursor/all)
```

Plain text question buried in conversation — no visual distinction, easy to miss.

## Applying This Rule

### In Command Definitions

Commands with `--interactive` flags should include this guidance:

```markdown
## Interactive Mode

When `--interactive` is specified, ask each question individually using
the platform's native interaction tool if available (e.g., AskUserQuestion
in Claude Code). Fall back to formatted markdown if no native tool exists.
```

### In Agent Definitions

Agent system prompts that involve user questions should include:

```markdown
When asking the user a question, prefer native platform interaction tools
(e.g., AskUserQuestion) over plain text output. Check tool availability
before defaulting to text.
```

### In Orchestration Flows

Flows with decision points should use the native tool at each gate:

```markdown
Before proceeding, confirm with the user via the platform's native
interaction tool. If unavailable, present a clear markdown prompt.
```

## Why This Matters

- **94% of interactive failures** stem from ambiguous or buried questions
- Native tools provide visual distinction and focus management
- Structured responses reduce parsing errors in agent logic
- Platform alignment — AIWG agents are platform-aware by design
