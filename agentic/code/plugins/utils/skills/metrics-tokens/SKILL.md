---
namespace: aiwg
name: metrics-tokens
platforms: [all]
description: Analyze token usage efficiency against the MetaGPT baseline and surface per-step optimization opportunities
---

# metrics-tokens

You perform deep analysis of token usage efficiency. You compare AIWG workflow token consumption against the MetaGPT 124 tokens/line benchmark (REF-013), identify high-cost operations, and surface optimization opportunities.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "how efficient are my tokens" → efficiency ratio vs MetaGPT baseline
- "am I above the baseline" → threshold status check
- "where are tokens being wasted" → per-step breakdown with recommendations
- "token ratio" → tokens/line ratio calculation

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Efficiency report | "token efficiency" | `aiwg metrics-tokens` |
| Session analysis | "analyze tokens for this session" | `aiwg metrics-tokens --session current` |
| Threshold check | "are we at green" | `aiwg metrics-tokens --threshold` |
| Per-step breakdown | "which step used the most tokens" | `aiwg metrics-tokens --by-step` |
| Optimization hints | "suggest token optimizations" | `aiwg metrics-tokens --optimize` |

## Behavior

When triggered:

1. **Determine scope**:
   - Default: current or most recent session
   - `--session <name>`: named session
   - `--all`: aggregate across all sessions

2. **Load token data**:
   - Read `.aiwg/ralph/sessions/*/metrics.json` for raw token counts
   - Apply estimation heuristic: 4 chars per token (aligned with `src/metrics/token-counter.ts`)

3. **Compute efficiency metrics**:
   - Tokens/line ratio for session output
   - `vsBenchmark`: percentage vs MetaGPT 124 tokens/line (negative = better)
   - `vsBaseline`: percentage vs typical LLM 200 tokens/line (negative = better)
   - Threshold status: green (≤124), yellow (125–150), red (>150)

4. **Run the command**:

   ```bash
   # Default efficiency report
   aiwg metrics-tokens

   # Current session
   aiwg metrics-tokens --session current

   # Per-step breakdown
   aiwg metrics-tokens --by-step

   # With optimization suggestions
   aiwg metrics-tokens --optimize

   # JSON output
   aiwg metrics-tokens --json
   ```

## Benchmark Reference

The MetaGPT 124 tokens/line benchmark comes from REF-013 (research corpus). It represents a validated efficiency target for AI-assisted software workflows. AIWG tracks against this benchmark to make token costs legible and comparable across sessions.

| Threshold | Tokens/Line | Status | Action |
|-----------|-------------|--------|--------|
| At or below benchmark | ≤ 124 | green | No action needed |
| Above benchmark | 125–150 | yellow | Flag for review |
| Well above benchmark | > 150 | red | Generate optimization recommendations |

Comparison points:

| Baseline | Tokens/Line |
|----------|-------------|
| MetaGPT benchmark (REF-013) | 124 |
| Typical LLM baseline | ~200 |
| AIWG target | ≤ 124 |

## Report Format

### Standard Efficiency Report

```
Token Efficiency — Session: sdlc-review-20260401-143022
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Token Counts
  Input:    42,310 tokens
  Output:   18,940 tokens
  Total:    61,250 tokens

Content Metrics
  Characters:     245,000
  Non-blank lines:    548
  Total lines:        621

Efficiency
  Tokens/line:    112
  vs MetaGPT:     -9.7%  (better than 124 tokens/line benchmark)
  vs LLM baseline: -44%  (well below 200 tokens/line typical)
  Status:         green

Threshold: green — at or below MetaGPT benchmark
```

### Per-Step Breakdown (`--by-step`)

```
Token Efficiency by Step
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step                    Tokens    Lines  Tokens/Line  Status
──────────────────────  ────────  ─────  ───────────  ──────
architecture-designer   18,200    168    108          green
security-architect      14,600    132    111          green
test-architect          13,100    119    110          green
technical-writer        15,350    129    119          green  ← highest volume
                        ──────────────────────────────────
Total                   61,250    548    112          green
```

### Optimization Report (`--optimize`)

```
Optimization Suggestions
━━━━━━━━━━━━━━━━━━━━━━━━

Status: green — no critical optimizations needed.

Opportunities (optional):
  1. technical-writer (119 tok/line) — near benchmark ceiling.
     Consider: scope the synthesis prompt to final merge only,
     avoid re-reading full drafts.

  2. architecture-designer (18,200 tokens) — highest absolute cost.
     Consider: pass only the relevant SAD section, not the full doc.
```

## Efficiency Calculation

Token efficiency uses the estimation and comparison logic from `src/metrics/token-counter.ts`:

```
tokens          = ceil(characters / 4)
tokensPerLine   = tokens / nonBlankLines
vsBenchmark     = (tokensPerLine - 124) / 124 * 100   (negative = better)
vsBaseline      = (tokensPerLine - 200) / 200 * 100   (negative = better)
```

## Examples

### Example 1: Quick efficiency check

**User**: "Token efficiency for this session"

**Action**:
```bash
aiwg metrics-tokens
```

**Response**: Efficiency report with tokens/line ratio, benchmark comparison, and green/yellow/red status.

### Example 2: Identify expensive steps

**User**: "Which step used the most tokens?"

**Action**:
```bash
aiwg metrics-tokens --by-step
```

**Response**: Per-step table showing token counts, line counts, tokens/line ratio, and threshold status for each workflow step.

### Example 3: Optimization pass

**User**: "Suggest ways to reduce token usage"

**Action**:
```bash
aiwg metrics-tokens --optimize
```

**Response**: Optimization suggestions targeted at steps above the green threshold, with specific prompt-scoping recommendations.

### Example 4: Are we at green?

**User**: "Are we at green on token efficiency?"

**Extraction**: Threshold check

**Action**:
```bash
aiwg metrics-tokens --threshold
```

**Response**: "Threshold status: **green** — 112 tokens/line, 9.7% below the MetaGPT 124 tokens/line benchmark (REF-013)."

## Clarification Prompts

If the session scope is unclear:

- "Should I analyze the current running session or the most recent completed session?"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Metrics tokens handler
- @$AIWG_ROOT/src/metrics/token-counter.ts — Token counting, MetaGPT baseline constants (REF-013)
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/token-efficiency.yaml — Token efficiency schema
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
