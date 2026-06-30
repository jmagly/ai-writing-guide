---
enforcement: high
---

# Native UX Tools for Interactive Questions

**Enforcement Level**: HIGH
**Scope**: All agents and commands with interactive modes
**Issue**: #448

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
| Codex (OpenAI) | `ask` (research needed) | Check available tools | Markdown text output |
| Windsurf | None confirmed | Check AGENTS.md context | Markdown text output |

## Detection Pattern

```
Before asking a question:
1. Check if AskUserQuestion (or equivalent) is in available tools
2. If yes → call it with the question text
3. If no → output as formatted markdown text
```

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
