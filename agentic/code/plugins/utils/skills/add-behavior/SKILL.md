---
namespace: aiwg
name: add-behavior
platforms: [all]
description: Scaffold a new behavior definition with BEHAVIOR.md and optional scripts inside an existing addon or framework
---

# Add Behavior

Scaffold a new behavior definition with BEHAVIOR.md and optional scripts and inputs inside an existing addon or framework.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "I need a new behavior" → scaffold behavior in specified target
- "create a reactive behavior" → prompt for name and target, scaffold
- "add a hook-based behavior" → scaffold with scripts directory
- "behavior for X context" → derive name, prompt for target

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Named add | "add behavior auto-lint --to aiwg-utils" | Scaffold directly |
| Description-driven | "create a behavior that triggers on file save" | Derive name, prompt target |
| Interactive | "add behavior --interactive --to sdlc-complete" | Guided design mode |
| Target omitted | "add behavior my-behavior" | Ask which addon or framework |

## Understanding Behaviors

Behaviors are the newest AIWG artifact type. They bind reactive directives and toolsets to specific agent contexts. Unlike skills (which activate on natural language patterns) or commands (which require explicit invocation), behaviors:

- **React to events** — file saves, session starts, code changes, tool completions
- **Bind to contexts** — specific file types, project states, or agent sessions
- **Execute automatically** — no user invocation needed once activated
- **Compose with tools** — can bundle external scripts and structured inputs

Behaviors deploy primarily to OpenClaw (`~/.openclaw/behaviors/`) and are defined using the cross-platform BEHAVIOR.md format.

## Process

### 1. Parse Arguments

Extract from `$ARGUMENTS`:
- `<name>` — kebab-case behavior name (required)
- `--to <target>` — addon or framework directory name (required)
- `--interactive` — enable guided design questions

If either `<name>` or `--to` is missing, ask before proceeding.

### 2. Validate Target

Confirm the target exists:

```bash
# Check addons
ls agentic/code/addons/<target>/

# Check frameworks
ls agentic/code/frameworks/<target>/
```

### 3. Interactive Design (if --interactive)

Ask before generating:

1. **Trigger event**: What event or context activates this behavior?
   - Examples: `on-file-save`, `on-session-start`, `on-tool-complete`, `on-agent-context`
2. **Context binding**: Does it bind to specific file types, directories, or agent states?
3. **Directive**: What should the agent do when triggered?
4. **Scripts**: Does it need external scripts for tool execution?
5. **Inputs**: Does it accept structured input parameters?
6. **Scope**: Is it user-level (home dir) or project-level?

### 4. Run Scaffolding

```bash
aiwg add-behavior <name> --to <target>
```

### 5. Customize BEHAVIOR.md

The generated BEHAVIOR.md uses the cross-platform format:

```markdown
---
name: <name>
description: <one-sentence purpose>
version: 1.0.0
trigger: <event-type>
context:
  - <file-glob-or-state>
platforms:
  - openclaw
---

# Behavior Name

[Description of what this behavior does and when it activates]

## Trigger

Activates when: `<trigger event description>`

Context constraints:
- `<constraint 1>` — e.g., only in `.ts` files
- `<constraint 2>` — e.g., only during construction phase

## Directive

When triggered, the agent will:

1. [Action 1]
2. [Action 2]
3. [Action 3]

## Inputs (if applicable)

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| <input> | string | Yes | What it controls |

## Scripts (if applicable)

| Script | Purpose |
|--------|---------|
| `scripts/<name>.sh` | What it does |

## Deactivation

This behavior is inactive when:
- <condition that suppresses it>
```

### 6. Create Supporting Files (if needed)

For behaviors with scripts:

```bash
mkdir -p <target>/behaviors/<name>/scripts/
# Add executable scripts
chmod +x <target>/behaviors/<name>/scripts/*.sh
```

For behaviors with structured inputs:

```bash
mkdir -p <target>/behaviors/<name>/inputs/
# Add JSON Schema or YAML input definitions
```

### 7. Update Manifest

The CLI tool updates `<target>/manifest.json`. Verify:

```json
{
  "behaviors": ["existing-behavior", "<name>"]
}
```

## Generated Structure

```
<target>/behaviors/<name>/
├── BEHAVIOR.md        # Behavior definition (cross-platform format)
├── scripts/           # Optional: executable scripts
└── inputs/            # Optional: structured input schemas
```

Manifest updated: `<target>/manifest.json`

## Output Format

```
Behavior Created: <name>
────────────────────────
Location: <target>/behaviors/<name>/

Created:
  ✓ BEHAVIOR.md
  ✓ scripts/  (placeholder)
  ✓ inputs/   (placeholder)

Manifest updated: <target>/manifest.json

Deployment target: ~/.openclaw/behaviors/<name>/

Next Steps:
  1. Define trigger event and context constraints
  2. Write directive steps
  3. Add scripts (if external tools needed)
  4. Define input schema (if parameterized)
  5. Deploy: aiwg use <target> --provider openclaw
```

## Examples

### Example 1: Session-start behavior

**User**: "add behavior session-preflight --to aiwg-utils"

**Action**:
```bash
aiwg add-behavior session-preflight --to aiwg-utils
```

**Result**: `agentic/code/addons/aiwg-utils/behaviors/session-preflight/BEHAVIOR.md` scaffolded. Defines behavior that runs `aiwg doctor` automatically at session start.

### Example 2: File-save behavior with scripts

**User**: "create a behavior that lints TypeScript files on save in sdlc-complete"

**Extraction**: name=`ts-lint-on-save`, target=`sdlc-complete`, trigger=`on-file-save`, context=`**/*.ts`

**Action**:
```bash
aiwg add-behavior ts-lint-on-save --to sdlc-complete --interactive
```

**Result**: `BEHAVIOR.md` plus `scripts/run-lint.sh`.

### Example 3: Agent-context binding

**User**: "add behavior threat-model-context --to sdlc-complete"

**Result**: Behavior that activates when the threat-modeler agent is in context, loading relevant security rules automatically.

## References

- @$AIWG_ROOT/src/cli/handlers/scaffolding.ts — CLI handler implementation
- @$AIWG_ROOT/docs/cli-reference.md — Full CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/devkit-create-skill/SKILL.md — Related skill scaffolding pattern
