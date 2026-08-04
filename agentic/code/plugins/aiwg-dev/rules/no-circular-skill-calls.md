---
enforcement: high
---

# No Circular Skill Calls

**Enforcement Level**: HIGH
**Scope**: aiwg-development
**Addon**: aiwg-dev (devOnly)

## Overview

A command definition marked `executedViaSkillRunner: true` MUST NOT have a SKILL.md whose execution path calls back into `aiwg <same-command>`. This creates an infinite loop with no exit condition.

## Problem Statement

AIWG's skill runner executes commands by reading the associated SKILL.md and running the instructions using provider tools (Read, Write, Bash, Task). When a command is marked `executedViaSkillRunner: true`, its TypeScript handler is removed from the CLI routing table — the CLI defers entirely to the SKILL.md.

If that SKILL.md then invokes the CLI command (e.g. says "run `aiwg doctor`"), the system enters a loop:

```
User invokes: aiwg doctor
  ↓
CLI: no handler (executedViaSkillRunner: true), delegates to skill runner
  ↓
Skill runner reads SKILL.md
  ↓
SKILL.md says: "run `aiwg doctor`"
  ↓
CLI: no handler (executedViaSkillRunner: true), delegates to skill runner
  ↓
  [infinite loop — never terminates]
```

This is a silent failure mode: the loop may appear to run for several iterations before timing out, consuming tokens with no output.

## Mandatory Rules

### Rule 1: Self-Contained SKILL.md When Using `executedViaSkillRunner: true`

If a command has `executedViaSkillRunner: true` in its definition, its SKILL.md MUST perform all work using provider tools directly — it MUST NOT invoke the CLI command by name.

**FORBIDDEN** (when `executedViaSkillRunner: true`):
```markdown
## Behavior

Run the following to check your installation:

```bash
aiwg doctor
```
```

**REQUIRED** (when `executedViaSkillRunner: true`):
```markdown
## Behavior

1. Read `.aiwg/frameworks/registry.json` using the Read tool
2. Verify the registry is valid JSON
3. Check that `.claude/agents/` contains expected agent files
4. Read Node.js version: `node --version`
5. Report pass/fail for each check
```

### Rule 2: Commands With TypeScript Handlers May Reference CLI Commands

If a command retains its TypeScript handler (i.e. does NOT set `executedViaSkillRunner: true`), its SKILL.md may reference the CLI command — the handler will receive the invocation and execute the logic.

This is the correct pattern when:
- The command does substantial work in TypeScript (file I/O, npm calls, complex logic)
- The SKILL.md is supplementary documentation rather than the execution path
- The command needs to run reliably in non-skill-runner environments

### Rule 3: Audit Before Setting `executedViaSkillRunner: true`

Before adding `executedViaSkillRunner: true` to any command definition, perform this check:

1. Open the command's SKILL.md
2. Search for `aiwg <command-name>` in any bash block or instruction
3. If found: the SKILL.md must be rewritten to use provider tools directly before the flag is set

## Reference Implementation

`sdlc-accelerate` is the canonical example of a correct `executedViaSkillRunner: true` command. Its SKILL.md orchestrates entirely through Task/Write/Read tool calls with no CLI callback. Use it as a style reference when building new skill-executed commands.

**Location**: `agentic/code/addons/aiwg-utils/skills/` (check the sdlc-accelerate skill directory)

## Detection Patterns

| Symptom | Likely Cause |
|---------|-------------|
| Command hangs or produces no output | Possible circular loop |
| Skill runner starts but appears stuck | SKILL.md invoked CLI, loop entered |
| Token usage spikes with no result | Loop ran multiple times before timeout |
| `executedViaSkillRunner: true` in definition AND `aiwg <name>` in SKILL.md | Direct violation |

## Safe Pattern Reference

```
Command: my-command
  executedViaSkillRunner: true
  ↓
SKILL.md — must do all work with:
  - Read tool (read files)
  - Write tool (write files)
  - Bash tool (run shell commands)
  - Task tool (delegate to subagents)
  - Direct script invocation: node tools/cli/my-script.mjs

MUST NOT contain:
  - aiwg my-command
  - aiwg <any command that itself delegates back to my-command>
```

## References

- @$AIWG_ROOT/src/extensions/commands/definitions.ts — Command definitions with `executedViaSkillRunner` field
- @$AIWG_ROOT/src/cli/handlers/ — TypeScript handlers (absent when `executedViaSkillRunner: true`)
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/rules/component-completeness.md — Command completeness requirements

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-4-1
