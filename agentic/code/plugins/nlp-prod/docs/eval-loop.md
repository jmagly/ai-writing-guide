# Eval Loop: Isolation Protocol

The eval loop is `nlp-prod`'s production quality gate. The most important property is **strict isolation between the generator and the evaluator**.

---

## Why Isolation Matters

If the evaluator has access to the generator's reasoning, system prompt, or chain-of-thought, it is not an independent evaluator — it is a rubber stamp. Contaminated evaluation produces inflated scores, misses real failures, and gives false confidence.

The eval loop is modelled on the principle that a good reviewer is one who knows nothing about how the answer was produced — only whether the answer is correct.

---

## Isolation Invariants

These invariants are enforced and checked before every eval run:

| Invariant | Enforcement |
|-----------|------------|
| Evaluator prompt is a separate file | `prompts/evaluator.prompt.md` never merged with generator |
| Evaluator receives only `{{input}}` and `{{output}}` | No `{{steps}}`, `{{chain_of_thought}}`, `{{context}}` |
| Evaluator does not know generator model | Model selection is outside evaluator scope |
| Evaluator uses a different (cheaper) model | `eval_model: haiku` separate from generator model |
| Evaluator has no Write/Bash tools | `eval-reviewer` agent: Read-only tools only |

---

## Isolation Violations (Anti-Patterns)

### Violation 1: Merged files

```markdown
# WRONG — generator.prompt.md
## System
You are an extractor...

## Evaluator
Score the above output...
```

The evaluator section must be its own file. No exceptions.

### Violation 2: Generator context in evaluator template

```markdown
# WRONG — evaluator.prompt.md
Generator's system prompt: {{system_prompt}}
Generator used steps: {{intermediate_steps}}
Score the output: {{output}}
```

Only `{{input}}` and `{{output}}`. The evaluator scores what the user would see.

### Violation 3: Chain-of-thought leakage

```markdown
# WRONG — passing full generator response to evaluator
output = generator_response.content[0].text    # includes COT
evaluate(input, output)                         # evaluator sees COT
```

If the generator produces chain-of-thought before the final answer, extract ONLY the final answer before passing to evaluator.

---

## Correct Eval Loop Implementation

```python
# Correct isolation
def generate(client, input_text):
    system, user = load_prompt("generator.prompt.md", {"input": input_text})
    raw = client.messages.create(model=GENERATOR_MODEL, ...)
    output = extract_final_answer(raw.content[0].text)  # strip COT if present
    return output

def evaluate(client, input_text, output):
    # ONLY input and output — no generator context
    system, user = load_prompt("evaluator.prompt.md", {
        "input": input_text,
        "output": output,    # final answer only
    })
    raw = client.messages.create(model=EVALUATOR_MODEL, ...)  # separate model
    return json.loads(raw.content[0].text)
```

---

## Refinement Loop

When the evaluator returns `pass: false`, the feedback is fed back to the generator for refinement:

```
Attempt 1: generate(input) → output → eval → fail (score 0.4)
Attempt 2: generate(input + "Previous feedback: " + feedback) → output → eval → fail (score 0.7)
Attempt 3: generate(input + "Previous feedback: " + feedback) → output → eval → pass (score 0.91)
```

Key: the feedback sent to the generator is the evaluator's `feedback` string — not a copy of the evaluator prompt. The generator does not learn the evaluator's rubric.

---

## Scoring Schema

Every evaluation returns:

```json
{
  "score": 0.0,
  "pass": false,
  "feedback": "specific, actionable description",
  "rubric_scores": {
    "criterion": 0.0
  },
  "failure_category": "format|content|hallucination|missing_field|other",
  "suggested_fix": "one-sentence prompt revision recommendation"
}
```

- `score` is the weighted average of rubric scores
- `pass` is `score >= pass_threshold`
- `feedback` is addressed to the generator (actionable for refinement)
- `suggested_fix` is addressed to the prompt engineer (for prompt revision)

---

## Eval vs Ralph Loop

| Dimension | Ralph Loop | nlp-prod Eval Loop |
|-----------|-----------|-------------------|
| Purpose | Iterative development | Production quality gate |
| Isolation | Shared session | Strict — evaluator has no generator context |
| Output | Working implementation | Pass/fail + structured feedback |
| Persistence | `.aiwg/ralph/` | `eval/results.jsonl` (append-only) |
| Cost tracking | Session tokens | Per-call cost in results schema |
| Termination | Completion criteria | pass_threshold OR max_attempts |
| Human loop | Issue thread comments | Optional via `--interactive` |

Use Ralph for development iteration. Use the eval loop as a production quality gate.

---

## Contamination Detection

The `eval-reviewer` agent and eval loop runner both check for contamination before scoring:

```python
CONTAMINATION_SIGNALS = [
    "{{steps}}",
    "{{chain_of_thought}}",
    "{{intermediate}}",
    "generator_context",
    "system_prompt",
]

def check_contamination(evaluator_prompt: str) -> bool:
    return any(signal in evaluator_prompt for signal in CONTAMINATION_SIGNALS)
```

If contamination is detected:
- Run stops
- Error message explains the violation
- `contamination_warning: true` set in results if eval ran before detection
