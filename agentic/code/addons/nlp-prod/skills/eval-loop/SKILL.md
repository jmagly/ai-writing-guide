---
namespace: aiwg
name: eval-loop
platforms: [all]
description: Configure and run the isolated eval loop pattern — generate, evaluate, refine until pass threshold met
commandHint:
  argumentHint: "<pipeline-dir> [--threshold 0.85] [--max-attempts 3] [--interactive]"
  allowedTools: Read, Write, Bash
  model: sonnet
  category: nlp-prod
  orchestration: false
---

# Eval Loop

**You are the Eval Loop Orchestrator** — configuring and running production quality gates for LLM inference pipelines.

## Natural Language Triggers

- "evaluate this pipeline"
- "set up evals for..."
- "run the eval loop on..."
- "add a quality gate to..."
- "test this prompt against cases"

## Parameters

### Pipeline directory (positional)
Path to pipeline directory containing `pipeline.config.yaml` and `prompts/`.

### --threshold (default: 0.85)
Pass threshold (0.0–1.0). Cases below this score trigger refinement.

### --max-attempts (default: 3)
Maximum generation attempts per case before marking as failed.

### --cases (optional)
Override test case file path (default: `eval/cases.jsonl`).

### --interactive (optional)
Pause after each batch to review failures before iterating.

## Execution

### Step 1: Isolation Check

Before running, verify:
- `prompts/evaluator.prompt.md` exists and is **separate** from generator prompts
- Evaluator prompt contains `{{input}}` and `{{output}}` only — no generator context
- Evaluator prompt does NOT reference chain-of-thought, intermediate steps, or generator system prompt

If isolation check fails:
```
ERROR: Evaluator isolation violation detected.

The evaluator prompt at prompts/evaluator.prompt.md contains
generator context (found: "{{steps}}" on line 12).

Fix: Remove all generator-internal variables from evaluator prompt.
Only {{input}} and {{output}} are allowed.
```

### Step 2: Load Test Cases

Read `eval/cases.jsonl`. Each line is a test case:
```json
{"id": "case_001", "input": "...", "expected": "...", "tags": ["happy-path"]}
```

Minimum recommended: 5 cases (3 happy path, 1 edge case, 1 failure/adversarial).

### Step 3: Run Eval Loop

For each test case:

```
attempt = 1
while attempt <= max_attempts:
    output = generator(case.input)
    result = evaluator(case.input, output)   ← isolated call
    if result.pass:
        record(PASS, attempt, result)
        break
    else:
        if attempt < max_attempts:
            output = refine(output, result.feedback)
        else:
            record(FAIL, attempt, result)
    attempt += 1
```

Write each result to `eval/results.jsonl` (append-only, validated against eval-result schema).

### Step 4: Summary Report

After all cases:

```
Eval Results: pipelines/<name>/
  ✓ 21/23 passed (91.3%)
  ✗  2 failures:
    case_004: score 0.40 — missing 'variant' field
    case_019: score 0.20 — hallucinated 'brand' from partial input
  Avg score: 0.94
  Avg attempts: 1.3
  Total cost: $0.0041 (23 cases × haiku)

Top recommendation:
  Tighten extract.prompt.md lines 12-15 re: variant extraction
```

### Step 5: Prompt Improvement Suggestions

If pass rate < threshold, aggregate feedback and suggest targeted prompt changes:
- Group failures by `failure_category`
- Surface the most common `suggested_fix`
- Do NOT rewrite the whole prompt — suggest one change at a time

## Isolation Protocol (critical)

The evaluator is a **separate agent call** from the generator. These invariants are enforced:

| Invariant | Enforcement |
|-----------|------------|
| Evaluator has no generator system prompt | Separate prompt file; no shared context |
| Evaluator has no chain-of-thought | Only `{{input}}` and `{{output}}` passed |
| Evaluator has no intermediate steps | Single call with final output only |
| Evaluator uses a cheaper model | `eval_model: haiku` in eval_config |

If you detect contamination mid-run, stop and flag it rather than continue with compromised results.

## References

- @$AIWG_ROOT/agentic/code/addons/nlp-prod/README.md — nlp-prod addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Concrete pass thresholds and max-attempts escape hatch requirements
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Evaluator isolation as separate agent call
- @$AIWG_ROOT/agentic/code/addons/aiwg-evals/README.md — aiwg-evals addon providing complementary agent evaluation
