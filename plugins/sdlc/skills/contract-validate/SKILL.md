---
namespace: aiwg
platforms: [all]
name: contract-validate
description: "Validate that an AIWG skill chain has all requires inputs satisfied by upstream ensures outputs. Catches missing dependencies at wiring time, not runtime."
requires:
  - "skills: ordered list of AIWG skill names or file paths forming the workflow to validate"
  - "if workflow-file: path to a YAML/JSON workflow definition"
  - "external-inputs: names of inputs the calling workflow will provide (optional; unmatched requires are flagged as unresolved)"
ensures:
  - "validation-report: pass/fail report per skill with specific missing dependency details"
  - "verdict: VALID (all requires: satisfied), INVALID (unresolved requires: found), or VALID WITH WARNINGS (semantic matches only)"
  - "if INVALID: specific list of which skill requires which input and which upstream skill should provide it"
errors:
  - "skill-not-found: one or more skill names cannot be resolved to a SKILL.md file"
  - "no-contracts: none of the specified skills have contract fields — cannot validate"
invariants:
  - validation never executes skills — static analysis only
  - semantic matches are flagged as warnings, not counted as resolved for VALID verdict
  - "a workflow with any unresolved requires: always returns INVALID"
commandHint:
  argumentHint: "<skill1> <skill2> ... | --workflow <file.yaml> [--external input1,input2] [--strict]"
  allowedTools: Read, Glob, Grep
  model: sonnet
  category: planning
---

# Contract Validate Skill

Validate a skill chain before running it — check that every `requires:` input is satisfied by an upstream `ensures:` output or declared as an external input.

## Triggers

- "validate the contract chain for [skill1] → [skill2]"
- "check if this workflow is wired correctly"
- "will [skill] have everything it needs?"
- "pre-flight check the skill chain"
- "validate workflow contracts"

## Parameters

### Skills list (positional)

Ordered list of skill names to validate as a chain:

```bash
/contract-validate issue-planner address-issues
/contract-validate prose-detect prose-run
```

### `--workflow <file>` (optional)

Path to a YAML workflow definition listing the skill chain.

### `--external input1,input2` (optional)

Comma-separated names of inputs that will be provided by the calling workflow or user. Any `requires:` that matches an external input is treated as satisfied.

```bash
/contract-validate issue-planner address-issues --external objective,tracker
```

### `--strict` (optional)

Treat semantic matches as failures (require exact name matches). Default: semantic matches pass with warnings.

## Behavior

### Step 1: Resolve and Extract Contracts

Same as `contract-manifest` Step 1–2: resolve each skill, extract contract fields.

### Step 2: Validate Each Requires:

For each skill's `requires:` entry:

1. **Satisfied by external input** (`--external` list) → ✓ SATISFIED (external)
2. **Satisfied by exact match** (upstream `ensures:` same name) → ✓ SATISFIED
3. **Satisfied by semantic match** (upstream `ensures:` same meaning, different name) → ⚠️ WARN (semantic)
4. **Not satisfied** (nothing provides it) → ❌ UNRESOLVED

### Step 3: Determine Verdict

| Condition | Verdict |
|-----------|---------|
| All `requires:` satisfied (exact or external) | VALID |
| All `requires:` satisfied but some are semantic matches | VALID WITH WARNINGS |
| Any `requires:` unresolved | INVALID |
| No contract fields found on any skill | NO CONTRACTS (cannot validate) |

### Step 4: Output Report

```markdown
## Contract Validation Report

**Workflow**: issue-planner → address-issues
**Verdict**: VALID WITH WARNINGS

### Skill: issue-planner
| Requires | Source | Status |
|----------|--------|--------|
| objective | external | ✓ satisfied (external) |
| tracker | external | ✓ satisfied (external) |

### Skill: address-issues
| Requires | Source | Status |
|----------|--------|--------|
| issues | issue-planner.issues-filed | ⚠️ semantic match (name differs — verify intent) |
| tracker | issue-planner.tracker | ✓ satisfied (exact match) |

### Warnings (1)
- `address-issues.requires.issues` satisfied by `issue-planner.ensures.issues-filed` via semantic match.
  If these are not equivalent, rename one to match or add an explicit mapping.

### Errors (0)
None

### Recommendation
Workflow is likely correct. Confirm that `issue-planner.issues-filed` and `address-issues.issues` refer to the same thing. If so, rename one for an exact match to eliminate the warning.
```

## Using in CI / Pre-Flight

Before running a multi-skill orchestration, validate the chain:

```bash
/contract-validate issue-planner address-issues --external objective tracker
# → VALID — safe to proceed
# → INVALID — check report before running
```

## Relationship to contract-manifest

- **`contract-manifest`** — generates a full manifest for human inspection
- **`contract-validate`** — gives a pass/fail verdict for pre-flight checks

Use `contract-manifest` to understand a workflow; use `contract-validate` to gate its execution.

## Model

Runs on **Sonnet** — contract matching is structural analysis, not complex reasoning.

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context and skill catalog
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Measurable validation verdicts and criteria
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Research-first for contract dependency resolution
- @$AIWG_ROOT/docs/extensions/overview.md — Extension system and skill architecture
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
