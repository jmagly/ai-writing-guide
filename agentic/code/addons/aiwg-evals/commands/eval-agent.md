---
name: eval-agent
description: Run evaluation tests against an agent to assess quality and archetype resistance
args: <agent-name> [--category <type>] [--scenario <name>] [--verbose] [--output <path> --interactive --guidance "text"]
---

# Agent Evaluation

Run automated evaluation tests against an agent.

## Research Foundation

- **REF-001**: BP-9 - Continuous evaluation of agent performance
- **REF-002**: KAMI benchmark methodology for failure archetype detection

## Usage

```bash
/eval-agent security-architect
/eval-agent architecture-designer --category archetype
/eval-agent test-engineer --scenario grounding-test --verbose
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| agent-name | Yes | Agent to evaluate |

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --category | all | Test category: archetype, performance, quality |
| --scenario | all | Specific scenario to run |
| --verbose | false | Show detailed test output |
| --output | stdout | Output file for results |
| --strict | false | Fail on any test failure |

## Test Categories

### archetype

Tests for Roig (2025) failure archetypes:

- `grounding-test` - Archetype 1: Premature action
- `substitution-test` - Archetype 2: Over-helpfulness
- `distractor-test` - Archetype 3: Context pollution
- `recovery-test` - Archetype 4: Fragile execution

### performance

- `latency-test` - Response time benchmarks
- `token-test` - Token efficiency
- `parallel-test` - Concurrent execution correctness

### quality

- `output-format` - Output structure validation
- `tool-usage` - Appropriate tool selection
- `scope-adherence` - Stays within defined scope

## Process

1. **Load Agent**: Read agent definition
2. **Select Scenarios**: Based on --category or --scenario
3. **Setup Environment**: Create test workspace
4. **Execute Tests**: Run agent against each scenario
5. **Validate Results**: Check assertions
6. **Generate Report**: Output results

## Output Format

```json
{
  "agent": "security-architect",
  "timestamp": "2025-01-15T10:30:00Z",
  "tests": {
    "grounding-test": {
      "passed": true,
      "score": 1.0,
      "details": "Read tool called before Edit",
      "duration_ms": 5000
    },
    "distractor-test": {
      "passed": false,
      "score": 0.6,
      "details": "Used staging data in output",
      "evidence": ["Found 'staging' in response"],
      "duration_ms": 3000
    }
  },
  "summary": {
    "passed": 3,
    "failed": 1,
    "total": 4,
    "score": 0.85
  }
}
```

## Examples

```bash
# Full evaluation
/eval-agent architecture-designer

# Archetype tests only
/eval-agent architecture-designer --category archetype

# Single scenario with verbose output
/eval-agent test-engineer --scenario grounding-test --verbose

# Save results
/eval-agent security-architect --output .aiwg/reports/security-eval.json

# Strict mode (fails on any test failure)
/eval-agent devops-engineer --strict
```

## Success Criteria

| Metric | Target |
|--------|--------|
| Grounding (A1) | >90% |
| Substitution (A2) | >85% |
| Distractor (A3) | >80% |
| Recovery (A4) | ≥80% |
| Overall | ≥85% |

## Related Commands

- `/eval-workflow` - Test multi-agent workflows
- `/eval-report` - Generate quality report
- `aiwg lint agents` - Static validation

Evaluate agent: $ARGUMENTS
