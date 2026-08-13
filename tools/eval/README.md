# AIWG Model Evaluation Suite

Evaluate local and cloud models for AIWG compatibility across 6 dimensions.

## Quick Start

```bash
cd tools/eval
npm install
npx tsx src/index.ts hermes3:latest --verbose
```

## Dependencies

`tools/eval` depends on `@matric/eval-client` from the private Gitea npm registry. The `.npmrc` in this directory configures the `@matric` scope automatically — `npm install` picks it up without extra setup.

`@matric/eval-client` is a TypeScript client for the Python [matric-eval](https://git.integrolabs.net/roctinam/matric-eval) framework. When the `matric-eval` binary is installed and on `$PATH`, standard benchmark scores (HumanEval, GSM8K, ARC, etc.) can be included alongside AIWG-specific dimension scores.

## Dimensions

| Dimension | Weight | What it tests |
|-----------|--------|---------------|
| Tool Use | 25% | Correct tool selection and parameter formatting |
| Instruction Following | 25% | Constraint adherence, multi-part requests |
| Coding | 20% | Code generation quality and correctness |
| Structured Output | 15% | JSON/YAML/Markdown generation |
| Reasoning | 10% | Task decomposition and planning |
| Context Handling | 5% | Long-context accuracy |

## Scoring

- **90-100**: opus tier — fully compatible
- **70-89**: sonnet tier — good with minor limitations
- **50-69**: haiku tier — partial compatibility
- **Below 50**: not recommended

## CLI Options

```bash
npx tsx src/index.ts <model-id> [options]

Options:
  --backend <type>      ollama or api (default: ollama)
  --dimensions <list>   Comma-separated dimensions to evaluate
  --output <format>     json or markdown (default: markdown)
  --ollama-url <url>    Ollama API URL (default: http://localhost:11434)
  --integrity-mode <m>  standard, fresh, locked, or full-locked
  --fresh-workspace-required
                        Hold promotion unless workspace freshness is verified
  --fresh-workspace-verified
                        Record runtime evidence that workspace freshness was checked
  --baseline-score <n>  Add a paired overall-score baseline
  --baseline-label <s>  Label for the paired baseline
  --verbose             Show detailed progress
```

## Evaluation Integrity and Release Gates

Every runner-produced JSON and Markdown report includes:

- `sample_n` and a 95% Wilson uncertainty interval
- `paired_baseline` when a baseline score is supplied
- `integrity_state` and `trusted_score_source`
- explicit `fresh_workspace_required` and `fresh_workspace_verified` evidence
- `compromise_labels` using `test_edit`, `scorer_edit`, `fixture_edit`,
  `metric_leakage`, or `unknown`
- `weak_signal_reason`
- a calibrated `PROMOTE`, `HOLD`, or `ROLLBACK` release-gate decision

`standard` mode preserves the historical execution path, but labels its scores
as unverified smoke diagnostics and holds release promotion. `locked` snapshots
the datasets and scoring implementation before the run and detects changes.
`fresh` additionally requires caller-provided workspace-freshness evidence, and
`full-locked` combines both expectations. A freshness declaration is evidence
provenance, not a substitute for an isolated workspace created by the caller.

Example:

```bash
npx tsx src/index.ts hermes3:latest \
  --integrity-mode full-locked \
  --fresh-workspace-required \
  --fresh-workspace-verified \
  --baseline-score 78 \
  --baseline-label previous-release
```

Dimension scores are smoke diagnostics unless integrity and uncertainty fields
are present. A high score cannot override detected fixture/scorer/test edits or
an unverified freshness requirement.

## Adding Test Cases

Test cases live in `datasets/<dimension>/` as YAML files:

```yaml
id: unique-test-id
dimension: tool-use
difficulty: basic
prompt: |
  The prompt sent to the model...
expected:
  tool_calls:
    - tool: Read
      params_contain: { file_path: "example.ts" }
  contains: ["keyword"]
  must_not_contain: ["forbidden"]
  valid_json: true
scoring:
  correct_tool: 0.4
  correct_params: 0.4
  no_hallucination: 0.2
```
