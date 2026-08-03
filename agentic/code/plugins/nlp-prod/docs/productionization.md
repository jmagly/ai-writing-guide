# Productionization Guide

The `aiwg nlp productionize` command reviews a pipeline for production readiness and generates a hardened `prod/` version. This document explains the checklist, what gets added, and what gets removed.

---

## The Production Checklist

Before generating production artifacts, `productionize` runs this checklist:

### Prompts
- [ ] All prompt files exist with version headers
- [ ] Evaluator prompt is a separate file
- [ ] System prompt is ≤2000 tokens (flag if larger)
- [ ] Output format is explicitly specified

### Eval
- [ ] `eval/cases.jsonl` exists with ≥5 test cases
- [ ] A recent eval run exists (`eval/results.jsonl`)
- [ ] Most recent pass rate ≥85% (configurable threshold)
- [ ] If pass rate <85%: **block productionization until quality gate passes**

### Code
- [ ] Timeout handling on all LLM calls
- [ ] Retry wrapper for rate limits (429) and transient errors (502, 503)
- [ ] Structured output validation (Pydantic/Zod schema)
- [ ] Token budget enforcement (max_tokens set and enforced at call site)
- [ ] No verbose dev logging in hot path

### Cost
- [ ] `cost-model.yaml` exists
- [ ] Cost per call is within `warn_above_usd` threshold

---

## What Gets Added

### Timeout handling

```python
# Before (dev)
response = client.messages.create(model=MODEL, ...)

# After (prod)
response = client.messages.create(model=MODEL, ..., timeout=TIMEOUT_SECONDS)
```

### Retry wrapper

```python
# Added automatically:
for attempt in range(MAX_RETRIES):
    try:
        return client.messages.create(...)
    except anthropic.RateLimitError:
        time.sleep(BACKOFF_SECONDS * (2 ** attempt))
    except anthropic.APIStatusError as e:
        if e.status_code in {502, 503}:
            time.sleep(BACKOFF_SECONDS * (2 ** attempt))
        else:
            raise
```

### Structured output validation (Python)

```python
# Added automatically using Pydantic:
from pydantic import BaseModel, ValidationError

class PipelineOutput(BaseModel):
    field_one: str | None
    field_two: str | None

try:
    validated = PipelineOutput.model_validate(json.loads(raw))
except ValidationError as e:
    raise ValueError(f"Output schema validation failed: {e}") from e
```

### Token budget enforcement

```python
# max_tokens from pipeline.config.yaml enforced at call site:
response = client.messages.create(
    model=MODEL,
    max_tokens=pipeline_config["steps"][0]["max_tokens"],  # enforced
    ...
)
```

### Cost cap guard

```python
# Abort if estimated cost exceeds warn_above_usd:
estimated_cost = (input_tokens * INPUT_PRICE + output_tokens * OUTPUT_PRICE) / 1000
if estimated_cost > COST_WARN_THRESHOLD:
    raise CostGuardError(f"Estimated call cost ${estimated_cost:.4f} exceeds threshold")
```

---

## What Gets Removed

### Framework boilerplate

If LangChain or LangGraph is detected and the dependency is **not load-bearing** (i.e., the pipeline doesn't use graph traversal, LCEL composition, or LangSmith tracing), it gets replaced with direct SDK calls.

**Why**: LangChain adds ~180ms cold start, 40+ transitive dependencies, and an abstraction layer that makes debugging harder. For most inference pipelines, the Anthropic SDK is sufficient.

Replacement pattern:
```python
# Before (with langchain)
from langchain_anthropic import ChatAnthropic
chain = ChatAnthropic(model=MODEL) | StructuredOutputParser.from_response_schemas(schemas)
result = chain.invoke({"input": input_text})

# After (direct SDK)
client = anthropic.Anthropic()
response = client.messages.create(model=MODEL, ..., system=system, messages=[...])
output = PipelineOutput.model_validate(json.loads(response.content[0].text))
```

### Dev-only logging

```python
# Removed from prod/:
print(f"DEBUG: raw response = {raw}")
logger.debug(f"Prompt tokens: {response.usage.input_tokens}")
```

Structured logging (stderr, machine-readable) is added in its place.

---

## The `prod/` Directory

After productionization:

```
prod/
├── prompts/              # Copied from dev (hardened if changes were made)
├── src/
│   └── pipeline.py       # Hardened: timeouts, retries, validation, no framework
├── Dockerfile            # Minimal container
├── cost-model.yaml       # From cost analysis
└── README.md             # This ops runbook
```

The `dev/` pipeline is unchanged. `prod/` is a separate hardened version.

---

## Productionization Criteria

A pipeline is production-ready when:

1. Eval pass rate ≥ configured threshold (default 85%)
2. All timeout and retry handling is in place
3. Structured output validation enforced at call site
4. No framework dependencies that aren't load-bearing
5. `cost-model.yaml` is current and cost is within budget
6. Ops runbook (`prod/README.md`) documents start/stop/rollback/monitoring

---

## When NOT to Productionize

- Pass rate <85%: fix the prompts first
- No test cases: write eval cases first
- Eval run is >7 days old: re-run eval to confirm quality
- Cost model shows cost spike: investigate before deploying
