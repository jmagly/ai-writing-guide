---
namespace: aiwg
name: reproducibility-validate
platforms: [all]
description: Run a workflow multiple times and compare outputs to produce a similarity score and pass/fail verdict

---

# Reproducibility Validate

You run a workflow multiple times and compare outputs to produce a similarity score and pass/fail verdict, confirming that the workflow produces consistent results across executions.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "is this workflow stable" → run reproducibility validation with defaults
- "check if results are consistent" → run reproducibility validation
- "does this run the same way every time" → run reproducibility validation
- "test determinism" → run reproducibility validation
- "compare workflow outputs" → run reproducibility validation

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Default validation | "validate reproducibility of onboarding-flow" | Run `aiwg reproducibility-validate onboarding-flow` |
| Custom run count | "validate with 5 runs" | Run `aiwg reproducibility-validate <id> --runs 5` |
| Custom threshold | "validate with 99% threshold" | Run `aiwg reproducibility-validate <id> --threshold 0.99` |
| Full options | "3 runs, 90% threshold" | Run `aiwg reproducibility-validate <id> --runs 3 --threshold 0.90` |

## Behavior

When triggered:

1. **Extract intent**:
   - What is the workflow ID or name to validate?
   - How many runs? (default: 3)
   - What similarity threshold must be met to pass? (default: 0.95)

2. **Run the command**:

   ```bash
   # Default: 3 runs, 0.95 threshold
   aiwg reproducibility-validate <workflow-id>

   # Custom run count
   aiwg reproducibility-validate <workflow-id> --runs 5

   # Custom threshold
   aiwg reproducibility-validate <workflow-id> --threshold 0.99

   # Both
   aiwg reproducibility-validate <workflow-id> --runs 5 --threshold 0.99
   ```

3. **Scoring method**:
   - **Structured outputs** (JSON, YAML): exact match required — score is 0 or 1 per artifact
   - **Text outputs** (Markdown, prose): semantic similarity score (0.0–1.0) computed across runs
   - **Overall score**: weighted average across all artifacts in the workflow

4. **Pass/fail verdict**: If all per-artifact scores meet or exceed the threshold, the validation passes. Any artifact below the threshold is flagged.

5. **Report the result** — provide the overall verdict, overall similarity score, and a per-artifact breakdown showing which artifacts passed or failed.

## Examples

### Example 1: Default validation

**User**: "Validate reproducibility of the risk-management-cycle workflow"

**Extraction**: Workflow ID `risk-management-cycle`, default 3 runs, default 0.95 threshold

**Action**:
```bash
aiwg reproducibility-validate risk-management-cycle
```

**Response**:
```
Reproducibility Validation: risk-management-cycle
Runs: 3 | Threshold: 0.95 | Result: PASS

Artifact                                  Score    Status
.aiwg/risks/risk-register.md             0.97     PASS
.aiwg/risks/mitigation-plan.md           0.96     PASS
.aiwg/working/risk-analysis-draft.md     1.00     PASS (exact match)

Overall score: 0.977 — all 3 artifacts passed.
```

### Example 2: Stricter threshold

**User**: "Validate the SAD generation workflow with 99% threshold and 5 runs"

**Extraction**: Workflow ID `sad-generation`, 5 runs, 0.99 threshold

**Action**:
```bash
aiwg reproducibility-validate sad-generation --runs 5 --threshold 0.99
```

**Response**:
```
Reproducibility Validation: sad-generation
Runs: 5 | Threshold: 0.99 | Result: FAIL

Artifact                                       Score    Status
.aiwg/architecture/software-architecture.md   0.98     FAIL
.aiwg/architecture/component-diagram.mmd      1.00     PASS (exact match)
.aiwg/architecture/adr-001.md                 0.99     PASS

Overall score: 0.990 — 1 of 3 artifacts failed the 0.99 threshold.
Recommendation: Review non-deterministic sections in software-architecture.md,
or lower the threshold to 0.95 if semantic variation is acceptable.
```

### Example 3: High-confidence validation before release

**User**: "Run 5 iterations of the deployment-planning workflow and check for consistency"

**Extraction**: Workflow ID `deployment-planning`, 5 runs, default 0.95 threshold

**Action**:
```bash
aiwg reproducibility-validate deployment-planning --runs 5
```

**Response**:
```
Reproducibility Validation: deployment-planning
Runs: 5 | Threshold: 0.95 | Result: PASS

Artifact                                  Score    Status
.aiwg/deployment/deployment-plan.md      0.96     PASS
.aiwg/deployment/runbook.md              0.97     PASS
.aiwg/deployment/rollback-plan.md        0.95     PASS

Overall score: 0.960 — all 3 artifacts passed across 5 runs.
```

### Example 4: Validating a failing workflow

**User**: "Test whether the test-strategy workflow is deterministic"

**Extraction**: Workflow ID `test-strategy-execution`, default 3 runs, default 0.95 threshold

**Action**:
```bash
aiwg reproducibility-validate test-strategy-execution
```

**Response**:
```
Reproducibility Validation: test-strategy-execution
Runs: 3 | Threshold: 0.95 | Result: FAIL

Artifact                               Score    Status
.aiwg/testing/test-plan.md            0.94     FAIL
.aiwg/testing/test-strategy.md        0.97     PASS
.aiwg/testing/coverage-targets.json   1.00     PASS (exact match)

Overall score: 0.970 — 1 of 3 artifacts failed the 0.95 threshold.
Recommendation: Enable `strict` execution mode (`aiwg execution-mode strict`)
to reduce variance in test-plan.md, then re-validate.
```

## Clarification Prompts

If the user's intent is ambiguous:

- "Which workflow should I validate? (e.g., `risk-management-cycle`, `sad-generation`)"
- "How many runs would you like? Default is 3; more runs give higher confidence but take longer."
- "What similarity threshold should I apply? Default is 0.95. Use 0.99 for near-exact determinism requirements."

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Reproducibility validate command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/execution-mode/SKILL.md — Set execution mode to reduce variance before validating
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/snapshot/SKILL.md — Capture state before running validation
