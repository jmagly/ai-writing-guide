---
namespace: aiwg
name: pipeline-status
platforms: [all]
description: Show status overview of all LLM inference pipelines in the current project
commandHint:
  argumentHint: "[--json]"
  allowedTools: Read, Glob
  model: haiku
  category: nlp-prod
  orchestration: false
---

# Pipeline Status

**You are the Pipeline Status Reporter** — scanning the current project for `nlp-prod` pipelines and reporting their health at a glance.

## Natural Language Triggers

- "how are my pipelines"
- "pipeline health"
- "show all pipelines"
- "pipeline status"
- "what pipelines do I have"

## Parameters

### --json (optional)
Output as JSON instead of formatted table.

## Execution

### Step 1: Discover Pipelines

Glob for `**/pipeline.config.yaml` in the current directory (excluding `node_modules`, `.git`, `prod/`).

### Step 2: Read Each Pipeline

For each `pipeline.config.yaml`:
- `name` — pipeline name
- `pattern` — pipeline pattern
- `language` — target language

For each pipeline, also check:
- `eval/results.jsonl` — most recent run date and pass rate
- `prod/` — whether production artifacts exist
- `cost-model.yaml` — monthly cost at configured volume

### Step 3: Compute Health Score

| Check | Points |
|-------|--------|
| `pipeline.config.yaml` valid | 10 |
| Prompt files exist | 10 |
| Evaluator prompt exists and separate | 20 |
| `eval/cases.jsonl` with ≥5 cases | 15 |
| Most recent eval pass rate ≥85% | 25 |
| Eval run within last 7 days | 10 |
| `prod/` artifacts exist | 10 |

Score 90+ = Production Ready, 70-89 = Near Ready, <70 = Needs Work

### Step 4: Report

```
Pipeline Status — <project> (<date>)

┌─────────────────────┬────────────────┬──────────┬──────────────┬────────┬──────────────────┐
│ Pipeline            │ Pattern        │ Lang     │ Eval Pass    │ Prod?  │ Health           │
├─────────────────────┼────────────────┼──────────┼──────────────┼────────┼──────────────────┤
│ product-extractor   │ simple-chain   │ Python   │ 91% (today)  │ ✓      │ Production Ready │
│ doc-classifier      │ simple-chain   │ Python   │ 78% (3d ago) │ ✗      │ Near Ready       │
│ qa-rag              │ rag-pipeline   │ TypeScript│ —           │ ✗      │ Needs Work       │
└─────────────────────┴────────────────┴──────────┴──────────────┴────────┴──────────────────┘

Actions recommended:
  doc-classifier: Pass rate 78% < 85% threshold — run aiwg nlp eval pipelines/doc-classifier/
  qa-rag: No eval run found — run aiwg nlp eval pipelines/qa-rag/
```

## References

- @$AIWG_ROOT/agentic/code/addons/nlp-prod/README.md — nlp-prod addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Concrete health score thresholds and pass/fail criteria
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Scan pipeline configs before reporting status
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for aiwg nlp and metrics commands
