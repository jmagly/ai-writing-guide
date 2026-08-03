---
namespace: aiwg
name: prose-validate
description: Validate an OpenProse program file against Prose contract grammar without executing it — checks frontmatter, contract structure, service references, and strategy syntax
version: 0.1.0
platforms: [all]
requires:
  - target: path to a .md program file, or directory containing a multi-service program (index.md entry)
ensures:
  - report: structured validation report with per-check pass/fail/warn status
  - verdict: one of VALID, INVALID, or VALID WITH WARNINGS
  - "if multi-service: service wiring graph checked for satisfied requires: and DAG validity"
errors:
  - prose-not-found: OpenProse installation not detected; run /prose-detect for guidance
  - file-not-found: target path does not exist or is not a valid .md file
invariants:
  - validation never executes the program — structural analysis only
  - empty ensures: always fails; a program that ensures nothing is structurally invalid
---

# Prose Validate Skill

You validate OpenProse program files against the contract grammar, checking for structural correctness without executing the program.

## Triggers

- "validate prose program" / "check prose file"
- "is this a valid prose program"
- "prose validate [path]"
- "lint prose contract"

## Input

A path to a `.md` file to validate, or a directory containing a multi-service program.

## Behavior

### Step 0: Detect OpenProse Installation

Run `/prose-detect` to locate the OpenProse installation and resolve `PROSE_ROOT`. The contract grammar spec at `$PROSE_ROOT/prose.md` is used as the validation reference. If not found, stop and report:

```
OpenProse not found. Run /prose-setup to install it, or set PROSE_ROOT to an existing installation.
```

### Validation Checks

Run all checks and report results as pass/fail with details:

#### 1. Frontmatter Validation

- [ ] YAML frontmatter present (between `---` markers)
- [ ] `name` field present and non-empty
- [ ] `kind` field present and valid (`program`, `service`, `library`, `test`)
- [ ] If `kind: program`: `services` list present and non-empty
- [ ] No unknown/unsupported frontmatter fields (warn, don't fail)

#### 2. Contract Validation

- [ ] `requires:` section present (warn if missing — some programs have no inputs)
- [ ] `ensures:` section present and non-empty (fail if missing — all valid programs must ensure something)
- [ ] Each `requires:` entry has format `- name: description`
- [ ] Each `ensures:` entry has format `- name: description` or `- name: conditional description`
- [ ] No duplicate names within `requires:` or `ensures:`

#### 3. Strategy Validation

- [ ] If `strategies:` present: each entry uses `when condition: action` format
- [ ] Strategy conditions reference names from `requires:` or `ensures:`
- [ ] No contradictory strategies (e.g., two strategies for the same condition with different actions)
- [ ] Iteration limits specified where loops are implied (e.g., "max N iterations")

#### 4. Error and Invariant Validation

- [ ] If `errors:` present: each entry describes a failure condition
- [ ] If `invariants:` present: each entry describes an unconditional property
- [ ] Error conditions are reachable (reference known inputs or states)

#### 5. Service Reference Validation (Multi-Service Programs)

- [ ] Each service listed in `services:` has a corresponding `.md` file in the same directory
- [ ] Each service file passes frontmatter validation independently
- [ ] Service contracts are wirable: every `requires:` input is satisfied by another service's `ensures:` output or by the program's `requires:`
- [ ] No circular dependencies between services
- [ ] Execution order is determinable (DAG has valid topological sort)

### Output Format

```markdown
## Prose Validation Report

**File**: {path}
**Program**: {name}
**Kind**: {kind}

### Results

| Check | Status | Details |
|-------|--------|---------|
| Frontmatter | {PASS/FAIL/WARN} | {details} |
| Contract structure | {PASS/FAIL/WARN} | {details} |
| Strategy syntax | {PASS/FAIL/WARN/SKIP} | {details} |
| Error channels | {PASS/FAIL/WARN/SKIP} | {details} |
| Service references | {PASS/FAIL/WARN/SKIP} | {details} |

### Issues Found
{numbered list of specific issues, or "No issues found"}

### Overall: {VALID / INVALID / VALID WITH WARNINGS}
```

## Edge Cases

- **Directory input**: If given a directory, look for `index.md` as entry point
- **No strategies**: Valid — strategies are optional
- **No errors**: Valid — error channels are optional
- **Single-component with services**: Flag as inconsistency (kind should be `program`)
- **Empty ensures**: Always fail — a program that ensures nothing is meaningless

## Model

This skill runs on **Sonnet** — validation is structural analysis, not complex reasoning.

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Run prose-detect before validating; read grammar spec from PROSE_ROOT
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Concrete pass/fail/warn criteria for each validation check
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG addon integration commands
