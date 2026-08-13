# Quality and Metrics System

**Issues:** #173 (token per artifact), #144 (token budget), #192 (quality scoring), #148 (feedback accuracy)
**Version:** 2026.2.0
**Status:** Active

## Overview

AIWG tracks four related quality signals for SDLC artifacts: how efficiently artifacts use tokens, whether the context budget is being respected, how well artifacts match expected patterns, and whether feedback is actually improving quality over time.

These signals are independent but complementary. Token efficiency tells you whether artifacts are appropriately dense. Pattern scoring tells you whether they contain the right content. Context budget management ensures agents have room to generate. Feedback accuracy tells you whether the quality loop is working.

## Token Per Artifact Tracking (#173)

### What It Measures

Every artifact saved through an AIWG workflow records:

- **Total tokens** (estimated at 4 characters per token)
- **Non-blank lines**
- **Tokens per non-blank line** — the primary efficiency metric
- **Threshold status**: green / yellow / red

The benchmark is 124 tokens per non-blank line, derived from MetaGPT research (REF-013). A typical LLM baseline without optimization is around 200 tokens per line. AIWG targets staying at or below the benchmark.

| Status | Threshold | Action |
|--------|-----------|--------|
| Green | ≤ 124 tok/line | No action |
| Yellow | 125–150 tok/line | Flag for review |
| Red | > 150 tok/line | Generate optimization recommendations |

### Storage

Records are persisted to `.aiwg/metrics/tokens/records.json` with these fields per record:

```json
{
  "artifactPath": "requirements/UC-001.md",
  "artifactType": "use-case",
  "agent": "requirements-analyst",
  "timestamp": "2026-03-23T00:00:00Z",
  "tokens": {
    "totalTokens": 1240,
    "nonBlankLines": 10,
    "tokensPerLine": 124.0,
    "characters": 4960
  },
  "thresholdStatus": "green"
}
```

### Per-Agent Summaries

Records aggregate into per-agent efficiency summaries showing average tokens per line, min/max, benchmark comparison (percentage above/below 124), and trend (`improving`, `stable`, or `degrading`). Trend is computed by comparing the average tokens per line of the first half of an agent's records against the second half — a decrease of more than 5% is `improving`.

```bash
aiwg metrics-tokens                         # Current session report
aiwg cost-report                            # Session cost summary
aiwg cost-report --fleet                    # OpenRouter fleet spend observation
aiwg cost-history                           # Historical data
aiwg metrics-tokens --agent requirements-analyst --since 30d
```

### Source Files

- `src/metrics/token-counter.ts` — `estimateTokens`, `countTokens`, `analyzeTokenEfficiency`, threshold evaluation
- `src/metrics/artifact-metrics.ts` — `ArtifactMetricsStore`: record artifacts, query by agent/date, compute summaries

## Token Budget Management (#144)

### What It Does

The context budget manager prevents agents from exceeding the context window by tracking how many tokens are in the current context and enforcing a configurable split between context (loaded documents) and generation (output space).

Default split: 70% context, 30% generation. For a 200K token window, that gives 140K tokens for context and 60K for generation.

### Priority Scoring

When context fills up, the budget manager drops lower-priority items first. Items are scored:

| Source Type | Base Priority | Notes |
|-------------|--------------|-------|
| `system` | 1.0 | Never dropped |
| `at-mention` | 0.9 | Explicitly requested |
| `user` | 0.7 | User-provided context |
| `auto` | 0.5 | Auto-included context |

Items with higher task-similarity scores get a small bonus (up to 0.1). When context exceeds the warning threshold (85% full), the manager degrades by dropping `auto` and `user` items in ascending priority order until the budget is back below the warning threshold. `system` items are never dropped.

### Status Levels

| Level | Condition |
|-------|-----------|
| `ok` | Below 85% of context budget |
| `warning` | 85–95% of context budget |
| `critical` | 95–100% of context budget |
| `exceeded` | Over 100% |

### Configuration

```json
// .aiwg/config/context-budget.json
{
  "totalTokens": 200000,
  "contextFraction": 0.70,
  "generationFraction": 0.30,
  "warningThreshold": 0.85,
  "hardLimitThreshold": 0.95
}
```

`contextFraction` and `generationFraction` must sum to 1.0. Adjust for models with smaller context windows or for workflows that require large generation output.

### Source Files

- `src/metrics/context-budget.ts` — `ContextBudgetManager`: add/remove items, get status, degrade, load/save config

## Pattern-Based Quality Scoring (#192)

### What It Does

Each artifact type (use cases, ADRs, test plans, SADs) has a pattern definition with required elements, recommended elements, and antipatterns. The scoring engine checks artifact content against these patterns and produces a numeric score.

**Scoring formula:**

```
score = (required_found / required_total * 100) * 0.60
      + (recommended_found / recommended_total * 100) * 0.40
      - antipattern_penalty
```

Required patterns contribute 60% of the score. Recommended patterns contribute 40%. Each antipattern found deducts a weighted penalty (default 5 points each).

### Grades

| Grade | Score |
|-------|-------|
| `excellent` | ≥ 90 |
| `good` | ≥ 75 |
| `acceptable` | ≥ 60 |
| `needs-work` | < 60 |

### Built-in Pattern Types

| Artifact Type | Pattern File | Auto-detected When |
|---------------|-------------|--------------------|
| `use-case` | `src/quality/patterns/use-case.json` | Filename starts with `UC-` or first heading matches `# UC-` |
| `adr` | `src/quality/patterns/adr.json` | Filename starts with `ADR-` or first heading matches `# ADR-` |
| `test-plan` | `src/quality/patterns/test-plan.json` | Content contains "test plan" or "test strategy" |
| `sad` | `src/quality/patterns/sad.json` | Content contains "software architecture" or filename contains "sad" |

### Usage

The scoring engine auto-detects artifact type from filename and content. If detection fails, specify the type explicitly:

```bash
# Auto-detect type
aiwg quality-assess .aiwg/requirements/UC-001.md

# Explicit type
aiwg quality-assess .aiwg/architecture/system-design.md --type sad

# Score all artifacts in a directory
aiwg quality-assess .aiwg/requirements/
```

### Custom Patterns

Add custom pattern definitions by passing a file path:

```json
// .aiwg/patterns/my-artifact.json
{
  "id": "my-artifact",
  "name": "My Artifact Type",
  "description": "Pattern for my custom artifact",
  "required": [
    { "id": "r1", "pattern": "## Overview", "description": "Must have Overview section" }
  ],
  "recommended": [
    { "id": "rec1", "pattern": "## References", "description": "Should have References section" }
  ],
  "antipatterns": [
    { "id": "a1", "pattern": "TBD", "description": "No TBDs in final artifacts", "weight": 0.10 }
  ]
}
```

### Source Files

- `src/quality/scoring.ts` — `scoreContent`, `scoreArtifact`, `loadBuiltinPattern`, `detectArtifactType`
- `src/quality/patterns/*.json` — Built-in patterns for use-case, adr, test-plan, sad

## Feedback Accuracy Measurement (#148)

### What It Measures

The feedback tracker records quality scores before and after each feedback iteration, calculating:

- **Accuracy** — percentage of feedback iterations that produced a quality improvement (positive score delta)
- **False positive rate** — percentage that caused quality regression (negative delta)
- **Average delta** — mean quality change per iteration
- **Median delta** — median quality change (less sensitive to outliers)

Per-agent accuracy is available to identify which agents respond well to feedback and which do not.

### A/B Testing

When comparing two feedback strategies, the system runs Welch's t-test and computes Cohen's d effect size. This provides statistical confidence that observed differences are real rather than noise.

```typescript
const result = runABTest(
  { name: 'structured-feedback', deltas: [...] },
  { name: 'freeform-feedback', deltas: [...] },
  { alpha: 0.05, minSamples: 10 }
);

// result.significant: boolean
// result.pValue: number
// result.effectInterpretation: 'negligible' | 'small' | 'medium' | 'large'
```

Minimum 10 samples per variant are required before running a test.

### Storage

Feedback records are stored in `.aiwg/metrics/feedback/records.json`:

```json
{
  "id": "fb-0001",
  "artifactPath": "requirements/UC-001.md",
  "agent": "requirements-analyst",
  "scoreBefore": 62.5,
  "scoreAfter": 78.0,
  "delta": 15.5,
  "improved": true,
  "timestamp": "2026-03-23T00:00:00Z",
  "category": "use-case"
}
```

### Source Files

- `src/quality/feedback-tracker.ts` — `FeedbackTracker`: record feedback, calculate accuracy, get per-agent breakdowns
- `src/quality/feedback-ab.ts` — `runABTest`, Welch's t-test, Cohen's d, effect size interpretation

## How the Systems Connect

```
Agent generates artifact
        ↓
Pattern scoring evaluates quality (scoring.ts)
        ↓
Feedback tracker records before score
        ↓
Reviewer provides feedback
        ↓
Agent revises artifact
        ↓
Pattern scoring evaluates revised quality (scoring.ts)
        ↓
Feedback tracker records after score and delta (feedback-tracker.ts)
        ↓
Token metrics recorded on save (artifact-metrics.ts)
        ↓
Constraint learning accumulates feedback for pattern analysis (feedback-collector.ts)
```

The quality system's output feeds directly into the agent intelligence system: feedback records that accumulate into patterns become candidates for constraint learning proposals.

## References

- `src/metrics/token-counter.ts` — Token counting and efficiency analysis
- `src/metrics/artifact-metrics.ts` — Per-artifact token recording and agent summaries
- `src/metrics/context-budget.ts` — Context window budget management
- `src/quality/scoring.ts` — Pattern-based artifact scoring
- `src/quality/feedback-tracker.ts` — Feedback accuracy measurement
- `src/quality/feedback-ab.ts` — A/B testing for feedback strategies
- `agentic/code/frameworks/sdlc-complete/schemas/flows/token-efficiency.yaml` — Token efficiency schema
- `agentic/code/frameworks/sdlc-complete/schemas/flows/quality-scoring.yaml` — Quality scoring schema
- @docs/agent-intelligence.md — Constraint learning that consumes feedback records
