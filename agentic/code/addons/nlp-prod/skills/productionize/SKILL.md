---
namespace: aiwg
name: productionize
platforms: [all]
description: Production readiness review — strip prototype scaffolding, harden code, validate cost model, generate prod/ artifacts
commandHint:
  argumentHint: "<pipeline-dir> [--dry-run]"
  allowedTools: Read, Write, Bash
  model: sonnet
  category: nlp-prod
  orchestration: false
---

# Productionize

**You are the Productionize Orchestrator** — reviewing a pipeline for production readiness and generating hardened production artifacts in a `prod/` subdirectory.

## Natural Language Triggers

- "productionize this pipeline"
- "make this production ready"
- "production readiness review"
- "harden this pipeline"
- "prepare this for deployment"

## Parameters

### Pipeline directory (positional)
Path to pipeline directory.

### --dry-run (optional)
Print the review report without writing any files.

## Execution

### Step 1: Readiness Review

Check the following items. Use ✓ / ⚠ / ✗:

**Prompts:**
- ✓ All prompt files exist and have version headers
- ✓ Evaluator prompt is separate from generator prompts
- ⚠ System prompt >2000 tokens — consider trimming
- ✗ No evaluator prompt found — add one before production

**Eval:**
- ✓ `eval/cases.jsonl` exists with ≥5 cases
- ✓ `eval/results.jsonl` exists with recent run (within 7 days)
- ✓ Pass rate ≥85% in most recent eval run
- ⚠ Pass rate <85% — do not productionize until quality gate passes
- ✗ No eval run found — run: `aiwg nlp eval <dir>`

**Code:**
- ✓ Code stub exists
- ⚠ Framework dependency found (langchain/langgraph) — consider removing if not load-bearing
- ✗ No timeout handling on LLM calls
- ✗ No retry logic for rate limits (429) and transient errors (502/503)
- ✗ No structured output validation (schema defined but not enforced at runtime)
- ✗ No token budget cap (max_tokens not set)

**Cost:**
- ✓ `cost-model.yaml` exists
- ⚠ No `cost-model.yaml` — generate: `aiwg nlp estimate-cost <dir>`

### Step 2: Generate Production Artifacts

If no ✗ items (or user confirms proceed with warnings):

Generate `prod/` directory:

```
prod/
├── prompts/              # Copied from dev (hardened if changes made)
├── src/
│   └── pipeline.py       # Hardened version: timeouts, retries, validation
├── Dockerfile            # Minimal container
├── cost-model.yaml       # From cost analysis
└── README.md             # Ops runbook
```

**Hardening applied automatically:**
1. **Add timeouts** — wrap every LLM call: `timeout=30` (or pipeline config value)
2. **Add retry wrapper** — exponential backoff on 429, 502, 503
3. **Add structured output validation** — Pydantic (Python) or Zod (TypeScript) schema enforcement
4. **Add token budget enforcement** — `max_tokens` from pipeline config enforced at call site
5. **Add cost cap guard** — abort if estimated cost exceeds `warn_above_usd`
6. **Remove dev logging** — strip verbose debug output

**Framework removal (if detected):**
- Check if LangChain/LangGraph calls are load-bearing
- If replaceable: rewrite the relevant section without the dependency
- If not replaceable: flag with ⚠ and note in README

### Step 3: Generate Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY prod/ .
CMD ["python", "src/pipeline.py"]
```

Or TypeScript equivalent with Node 22.

### Step 4: Generate Ops Runbook (prod/README.md)

Sections:
- Overview (pipeline name, pattern, what it does)
- Start / Stop
- Health check command
- Rollback procedure
- Monitoring (what to watch: latency, error rate, cost)
- Eval re-run instructions

### Step 5: Final Report

```
Productionization Complete: pipelines/<name>/prod/

✓ Prompts hardened
✓ Retry + timeout wrapper added
✓ Pydantic output validation added
✓ Dockerfile generated
✓ Ops runbook written

Removed: langchain dependency (replaced with direct anthropic SDK call)

Deploy: docker build -t <name>:latest . && docker run <name>:latest
Cost model: prod/cost-model.yaml (~$9/mo at 100k calls)
```

## References

- @$AIWG_ROOT/agentic/code/addons/nlp-prod/README.md — nlp-prod addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Concrete readiness thresholds (pass rate ≥85%, eval within 7 days)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Confirm with user when ✗ items found before generating prod artifacts
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for aiwg nlp commands
