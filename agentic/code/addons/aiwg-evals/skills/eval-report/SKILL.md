---
namespace: aiwg
name: eval-report
platforms: [all]
description: Generate an aggregate agent quality report from evaluation results, showing scores, regressions, and recommendations
---

# Evaluation Report

Generate a quality report from accumulated evaluation results.

## Research Foundation

- **REF-001**: BP-9 - Continuous evaluation of agent performance
- **REF-002**: KAMI benchmark methodology for real agentic task evaluation

## Usage

```bash
/eval-report
/eval-report --output .aiwg/reports/quality-report.md
/eval-report --compare previous-report.json
/eval-report --mode sdlc --format json
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --output | stdout | Output file path |
| --compare | none | Previous report to diff against |
| --mode | all | Agent category: sdlc, marketing, forensics, all |
| --format | markdown | Output format: markdown, json |
| --since | none | Only include results after this date (ISO 8601) |
| --threshold | 0.85 | Score below this triggers a warning |

## Process

1. **Collect Results**: Read all `eval-*.json` files from `.aiwg/reports/`
2. **Aggregate Scores**: Compute per-agent and per-archetype scores
3. **Detect Regressions**: Compare against --compare baseline if provided
4. **Rank Agents**: Sort by overall score, flag below-threshold agents
5. **Build Recommendations**: Surface specific agents and archetypes needing attention
6. **Output Report**: Write markdown or JSON to --output or stdout

## Report Sections

### Summary Dashboard

Overall health at a glance — total agents tested, aggregate score, regression count.

### By Archetype

Pass rates per Roig (2025) failure archetype across all agents.

### Agents Needing Attention

Agents below the --threshold, with consecutive-failure streaks flagged.

### Regression Analysis

When --compare is provided: agents whose scores dropped since the baseline.

### Recommendations

Prioritized action list: which agents to review, which archetypes to harden.

## Output Format (Markdown)

```markdown
# Agent Quality Report

**Generated**: 2026-04-01T10:30:00Z
**Agents Tested**: 58
**Overall Score**: 87%
**Regressions**: 2

## By Archetype

| Archetype | Pass Rate | Trend |
|-----------|-----------|-------|
| #1 Grounding | 92% | ↑ |
| #2 Substitution | 88% | → |
| #3 Distractor | 78% | ↓ |
| #4 Recovery | 90% | ↑ |

## Agents Needing Attention

| Agent | Score | Consecutive Failures | Issue |
|-------|-------|---------------------|-------|
| data-analyst | 72% | 3 | distractor-test |
| api-designer | 79% | 1 | latency regression (+40%) |

## Recommendations

1. Review `data-analyst` context filtering — failed distractor-test 3 consecutive runs
2. Investigate `api-designer` tool selection — latency regression
3. Increase distractor-test scenarios for marketing agents (78% pass rate below 80% target)
```

## Output Format (JSON)

```json
{
  "generated": "2026-04-01T10:30:00Z",
  "summary": {
    "agents_tested": 58,
    "overall_score": 0.87,
    "regressions": 2
  },
  "by_archetype": {
    "grounding": 0.92,
    "substitution": 0.88,
    "distractor": 0.78,
    "recovery": 0.90
  },
  "agents_needing_attention": [
    {"agent": "data-analyst", "score": 0.72, "consecutive_failures": 3, "issue": "distractor-test"}
  ],
  "recommendations": [
    "Review data-analyst context filtering"
  ]
}
```

## Examples

```bash
# Standard report to stdout
/eval-report

# Save to file
/eval-report --output .aiwg/reports/quality-$(date +%Y%m%d).md

# Compare against baseline
/eval-report --compare .aiwg/reports/quality-20260301.json

# JSON for CI consumption
/eval-report --format json --threshold 0.80

# SDLC agents only
/eval-report --mode sdlc
```

## Related Commands

- `/eval-agent` - Test individual agents
- `/eval-workflow` - Test multi-agent workflows
- `aiwg lint agents` - Static validation

Generate evaluation report: $ARGUMENTS

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-evals/README.md — aiwg-evals addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Concrete threshold and scoring requirements
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context for agent evaluation scope
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for evaluation-related commands
