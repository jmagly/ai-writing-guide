# AIWG Evaluations

Automated evaluation framework for agent quality assessment.

## Research Foundation

- **REF-001**: BP-9 - Continuous evaluation of agent performance
- **REF-002**: KAMI benchmark methodology for real agentic task evaluation

## Overview

AIWG Evals provides:

1. **Agent Tests**: Validate individual agent behavior
2. **Workflow Scenarios**: Test multi-agent orchestration
3. **Archetype Detection**: Identify failure pattern susceptibility
4. **Quality Reports**: Track agent health over time

## Installation

```bash
aiwg install aiwg-evals
```

## Quick Start

```bash
# Test a single agent
aiwg eval-agent security-architect

# Test a workflow
aiwg eval-workflow flow-security-review-cycle

# Generate quality report
aiwg eval-report --output .aiwg/reports/eval-report.md
```

## Evaluation Categories

### Archetype Tests (from REF-002)

| Test | Archetype | What It Validates |
|------|-----------|-------------------|
| `grounding-test` | #1 Premature Action | Agent inspects before modifying |
| `substitution-test` | #2 Over-Helpfulness | Agent escalates ambiguity |
| `distractor-test` | #3 Context Pollution | Agent ignores irrelevant data |
| `recovery-test` | #4 Fragile Execution | Agent recovers from failures |

### Performance Tests

| Test | What It Measures |
|------|------------------|
| `parallel-test` | Correct parallel execution |
| `latency-test` | Response time benchmarks |
| `token-test` | Token efficiency |

### Quality Tests

| Test | What It Validates |
|------|-------------------|
| `output-format` | Correct output structure |
| `tool-usage` | Appropriate tool selection |
| `scope-adherence` | Stays within defined scope |

## Test Scenarios

### grounding-test

Tests Archetype 1: Premature Action Without Grounding

```yaml
scenario: grounding-test
setup:
  - Create file with specific content
  - Provide partial/misleading description
task: "Modify the config file to enable feature X"
expected:
  - Agent MUST read file before modification
  - Agent MUST NOT assume file structure
success_criteria:
  - Read tool called before Edit tool
  - File content verified before changes
```

### distractor-test

Tests Archetype 3: Distractor-Induced Context Pollution

```yaml
scenario: distractor-test
setup:
  - Create target file with task data
  - Create distractor files with similar but irrelevant data
task: "Extract the API endpoint from the config"
expected:
  - Agent uses only relevant file
  - Agent ignores distractor data
success_criteria:
  - Correct value extracted
  - Distractor data not in output
```

### recovery-test

Tests Archetype 4: Fragile Execution Under Load

```yaml
scenario: recovery-test
setup:
  - Configure operation to fail first attempt
  - Provide recovery path
task: "Complete the data migration"
expected:
  - Agent detects failure
  - Agent attempts recovery
  - Agent succeeds on retry OR escalates
success_criteria:
  - Error detected (not ignored)
  - Recovery attempted
  - Final state correct OR escalation issued
```

## Running Evaluations

### Single Agent

```bash
# Run all tests for an agent
aiwg eval-agent architecture-designer

# Run specific test category
aiwg eval-agent architecture-designer --category archetype

# Verbose output
aiwg eval-agent architecture-designer --verbose
```

### Workflow

```bash
# Run workflow scenario
aiwg eval-workflow flow-inception-to-elaboration

# With specific scenario
aiwg eval-workflow flow-security-review-cycle --scenario distractor-test
```

### Batch Evaluation

```bash
# Evaluate all SDLC agents
aiwg eval-agent --all --mode sdlc

# Generate comparison report
aiwg eval-report --compare previous-report.json
```

## Output Format

### Test Results

```json
{
  "agent": "security-architect",
  "timestamp": "2025-01-15T10:30:00Z",
  "tests": {
    "grounding-test": {
      "passed": true,
      "details": "Read tool called before Edit"
    },
    "distractor-test": {
      "passed": false,
      "details": "Used distractor data in output",
      "evidence": "Output contained 'distractor-api.example.com'"
    }
  },
  "summary": {
    "passed": 3,
    "failed": 1,
    "score": 0.75
  }
}
```

### Quality Report

```markdown
# Agent Quality Report

## Summary
- **Agents Tested**: 53
- **Overall Score**: 87%
- **Regression**: None

## By Archetype
| Archetype | Pass Rate | Trend |
|-----------|-----------|-------|
| #1 Grounding | 92% | ↑ |
| #2 Substitution | 88% | → |
| #3 Distractor | 78% | ↓ |
| #4 Recovery | 90% | ↑ |

## Agents Needing Attention
- `data-analyst`: Failed distractor-test (3 consecutive)
- `api-designer`: Latency regression (+40%)

## Recommendations
1. Review data-analyst context filtering
2. Investigate api-designer tool selection
```

## Custom Scenarios

Create custom test scenarios:

```yaml
# scenarios/custom/my-scenario.yaml
name: my-custom-scenario
description: Test specific business logic
category: custom

setup:
  files:
    - path: test-data/input.json
      content: |
        {"key": "value"}

task: |
  Process the input file and generate output.

validation:
  - type: file_exists
    path: test-data/output.json
  - type: json_contains
    path: test-data/output.json
    key: "processed"
    value: true

cleanup:
  - test-data/
```

## CI Integration

```yaml
# .github/workflows/agent-quality.yml
name: Agent Quality

on:
  pull_request:
    paths:
      - '.claude/agents/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Agent Evals
        run: |
          aiwg eval-agent --all --mode sdlc --output eval-results.json
      - name: Check Quality Gate
        run: |
          SCORE=$(jq '.summary.score' eval-results.json)
          if (( $(echo "$SCORE < 0.80" | bc -l) )); then
            echo "Quality score $SCORE below threshold 0.80"
            exit 1
          fi
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Grounding compliance | >90% |
| Distractor resistance | >80% |
| Recovery success | ≥80% |
| Overall quality | ≥85% |

## Related

- `docs/AGENT-DESIGN.md` - Agent Design Bible
- `tools/linters/agent-linter.mjs` - Static agent validation
- `prompts/reliability/` - Reliability patterns
