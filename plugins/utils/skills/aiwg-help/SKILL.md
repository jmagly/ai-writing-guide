---
name: aiwg-help
namespace: aiwg
platforms: [all]
kernel: true
description: Display all available AIWG CLI commands, their arguments, and usage examples
---

# AIWG Help

You display all available AIWG CLI commands, their arguments, and usage examples.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what can aiwg do" → run `aiwg help`
- "list aiwg commands" → run `aiwg help`
- "how do I use aiwg" → run `aiwg help`
- "aiwg commands" → run `aiwg help`
- "aiwg usage" → run `aiwg help`

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| General help | "help" / "show help" | Run `aiwg help` |
| Command listing | "what commands are available" | Run `aiwg help` |
| Usage question | "how do I use aiwg" | Run `aiwg help` |
| Capability query | "what can aiwg do" | Run `aiwg help` |
| Command discovery | "list aiwg commands" | Run `aiwg help` |

## Behavior

When triggered:

1. **Extract intent**: Determine whether the user wants the full command listing or is asking about a specific command or category. If a specific command is mentioned (e.g. "help with ralph"), direct the user to the relevant section.

2. **Run the appropriate command**:

   ```bash
   # Full help output
   aiwg help
   ```

   The help command is built into the CLI registry and requires no external tools. It renders command groups (Framework, Project, Workspace, MCP Server, Toolsmith, Catalog, **Discovery**, **Dispatch**, **Features**, Scaffolding, Ralph Loop, Maintenance, Channel) with aligned descriptions.

   Discovery commands (`discover`, `show`, `index`) are the canonical way to find and read AIWG skills/agents/commands/rules — most of AIWG's surface lives outside the always-loaded kernel set and is reachable only via these commands. Dispatch commands (`run skill <name>`, `run <script>`) execute script-bearing skills and user-defined scripts.

3. **Report the result** inline — present the command groups and highlight the most relevant section if the user expressed a specific area of interest.

## Examples

### Example 1: General help request

**User**: "What commands does AIWG have?"

**Extraction**: Full command listing requested, no specific area mentioned

**Action**:
```bash
aiwg help
```

**Response**: "Here are all available AIWG commands: [output]. The most commonly used are `aiwg use <framework>` to deploy a framework, `aiwg discover \"<phrase>\"` to find skills by capability, `aiwg doctor` to check health, and `aiwg refresh` to pull the latest version and redeploy."

### Example 2: Category-specific help

**User**: "How do I use the agent loop commands?"

**Extraction**: User wants help scoped to the Agent Loop category

**Action**:
```bash
aiwg help
```

**Response**: "The Agent Loop commands are: `aiwg ralph \"<task>\"` to start an iterative loop, `aiwg ralph-status` to check progress, `aiwg ralph-abort` to stop, and `aiwg ralph-resume` to continue an interrupted loop. Pass `--completion \"<criteria>\"` to define when the loop should stop."

### Example 3: Quick usage check

**User**: "usage"

**Extraction**: User wants the usage summary

**Action**:
```bash
aiwg help
```

**Response**: "Usage: `aiwg <command> [options]`. Run `aiwg help` for the full command listing, or ask about a specific command."

## References

- @$AIWG_ROOT/src/cli/handlers/help.ts — Help command handler
- @$AIWG_ROOT/src/extensions/commands/definitions.ts — Canonical command registry (run `aiwg help` for the live list)
- @$AIWG_ROOT/docs/cli-reference.md — Full CLI reference
