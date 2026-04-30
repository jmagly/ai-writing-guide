---
namespace: aiwg
name: prose-run
description: Execute an OpenProse program within the current AIWG session, following the two-phase model (Forme wiring + Prose VM execution)
version: 0.1.0
platforms: [all]
requires:
  - program: path to an OpenProse program file (.md with contract frontmatter)
  - "if program has requires: fields: values for each required input"
ensures:
  - "output: the program's ensures: outputs, delivered per contract obligation"
  - "run-state: execution artifacts saved to .aiwg/working/prose-runs/{run-id}/"
  - "if multi-service (kind: program + services:): wiring manifest generated before execution"
errors:
  - prose-not-found: OpenProse installation not detected; run /prose-detect for guidance
  - invalid-program: program file fails prose-validate checks; fix contract before running
  - context-exceeded: multi-service program exceeds available context budget; split into smaller programs
invariants:
  - Opus-class model required; Sonnet is insufficient for reliable Prose VM simulation
  - execution state written to .aiwg/working/prose-runs/ only; no writes outside that path
---

# Prose Run Skill

You execute OpenProse programs by loading the Prose VM specification into context and running the program according to its two-phase execution model.

## Triggers

- "run prose program" / "execute prose program"
- "execute [file].md as prose"
- "prose run [path]"
- "run this as a prose program"

## Input

- A path to an OpenProse program file (`.md`)
- Optional: input values for the program's `requires:` contract

## Behavior

### Step 0: Detect OpenProse Installation

Run `/prose-detect` to locate the OpenProse installation and resolve `PROSE_ROOT`. If not found, stop and report:

```
OpenProse not found. Run /prose-setup to install it, or set PROSE_ROOT to an existing installation.
```

### Step 1: Locate Prose Specs

Using the `PROSE_ROOT` resolved by `/prose-detect`:

1. Prose VM spec: `$PROSE_ROOT/prose.md`
2. Forme Container spec: `$PROSE_ROOT/forme.md`
3. If files are missing at resolved path: report error (path is stale — re-run `/prose-detect`)

### Step 2: Read the Program

Read the target program file. Parse frontmatter to determine:
- **Single-component** (`kind: service` or no `services:` list) → skip to Step 4
- **Multi-component** (`kind: program` with `services:` list) → proceed to Step 3

### Step 3: Phase 1 — Forme Wiring (Multi-Component Only)

Load `forme.md` into context and execute wiring:

1. Read the program entry point
2. Read all service `.md` files listed in `services:`
3. For each service, extract `requires:` and `ensures:`
4. Match outputs to inputs by semantic understanding
5. Build a dependency graph
6. Determine execution order (topological sort)
7. Produce a manifest describing the wiring

### Step 4: Phase 2 — Prose VM Execution

Load `prose.md` into context. This causes the LLM to simulate the Prose VM.

For each component in execution order:
1. Spawn a sub-agent session via the Task tool
2. Pass required inputs (from user input or previous component outputs)
3. The sub-agent executes the component's contract
4. Capture the `ensures:` outputs
5. Store outputs in `.aiwg/working/prose-runs/{run-id}/`

### Step 5: Return Results

Collect the final program outputs (the root program's `ensures:` values) and present them to the user.

### Step 6: Report Execution Summary

```markdown
## Prose Execution Complete

**Program**: {name}
**Components executed**: {count}
**Execution order**: {component1} → {component2} → ...
**Duration**: {time}

### Outputs
| Name | Value Summary |
|------|---------------|
| {ensures name} | {brief output summary} |

### State
Run artifacts saved to: `.aiwg/working/prose-runs/{run-id}/`
```

## Requirements

- **Model**: Opus-class model required for reliable Prose VM simulation ("Prose Complete" definition)
- **Prose installation**: `prose.md` and `forme.md` must be accessible
- **Context budget**: Multi-service programs consume significant context — monitor carefully

## Safety

- Programs are executed in the current session's sandbox
- File writes are limited to `.aiwg/working/prose-runs/`
- Sub-agent sessions inherit the parent's tool permissions
- No network access beyond what the parent session allows

## Limitations

- Requires Opus for reliable execution; Sonnet may produce partial or incorrect results
- Large multi-service programs may exceed context budget
- No persistent state across sessions (state lives in `.aiwg/working/`)

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Sub-agent spawning via Task tool for multi-component execution
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Monitor context budget for large multi-service programs
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Run prose-detect and prose-validate before execution
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG integration commands
