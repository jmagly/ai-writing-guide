---
namespace: aiwg
name: eval-workflow
platforms: [all]
description: Run evaluation tests against a multi-agent workflow to assess orchestration quality and failure archetype resistance
---

# Workflow Evaluation

Run automated evaluation tests against a multi-agent workflow.

## Research Foundation

- **REF-001**: BP-9 - Continuous evaluation of agent performance
- **REF-002**: KAMI benchmark methodology for real agentic task evaluation

## Usage

```bash
/eval-workflow flow-security-review-cycle
/eval-workflow flow-inception-to-elaboration --scenario distractor-test
/eval-workflow flow-deploy-to-production --verbose --strict
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| workflow-name | Yes | Workflow (flow command) to evaluate |

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --scenario | all | Specific scenario to run |
| --verbose | false | Show detailed test output |
| --output | stdout | Output file for results |
| --strict | false | Fail on any test failure |
| --timeout | 300 | Maximum seconds per scenario |

## What Gets Evaluated

### Orchestration Quality

- **Agent coordination**: Parallel agents launched correctly in single message
- **Handoff fidelity**: Artifacts pass correctly between phases
- **Gate enforcement**: Phase gates checked before transition

### Archetype Resistance

- `grounding-test` — Archetype 1: Premature action without reading state
- `distractor-test` — Archetype 3: Context pollution from irrelevant artifacts
- `recovery-test` — Archetype 4: Fragile execution when subagent fails

### Output Validation

- Required artifacts created in correct `.aiwg/` paths
- Document structure matches templates
- Traceability links intact

## Process

1. **Load Workflow**: Read flow command definition
2. **Select Scenarios**: Based on --scenario flag or all applicable
3. **Setup Workspace**: Create isolated `.aiwg/working/` test space
4. **Execute Flow**: Run workflow against each scenario
5. **Validate Outputs**: Check artifact presence, structure, and content
6. **Generate Report**: Output results with pass/fail per assertion
7. **Cleanup**: Remove test workspace

## Output Format

```json
{
  "workflow": "flow-security-review-cycle",
  "timestamp": "2026-04-01T10:30:00Z",
  "scenarios": {
    "grounding-test": {
      "passed": true,
      "score": 1.0,
      "assertions": [
        {"name": "threat-model-created", "passed": true},
        {"name": "security-gate-run", "passed": true}
      ],
      "duration_ms": 45000
    },
    "distractor-test": {
      "passed": false,
      "score": 0.7,
      "assertions": [
        {"name": "correct-assets-only", "passed": false, "evidence": "Distractor file referenced in output"}
      ],
      "duration_ms": 38000
    }
  },
  "summary": {
    "passed": 4,
    "failed": 1,
    "total": 5,
    "score": 0.80
  }
}
```

## Examples

```bash
# Full evaluation of a workflow
/eval-workflow flow-security-review-cycle

# Single scenario with verbose output
/eval-workflow flow-inception-to-elaboration --scenario grounding-test --verbose

# Strict mode with output saved
/eval-workflow flow-deploy-to-production --strict --output .aiwg/reports/deploy-eval.json
```

## Success Criteria

| Metric | Target |
|--------|--------|
| Artifact creation | 100% |
| Grounding compliance | >90% |
| Distractor resistance | >80% |
| Recovery success | ≥80% |
| Overall | ≥85% |

## Related Commands

- `/eval-agent` - Test individual agents
- `/eval-report` - Generate aggregate quality report
- `aiwg lint agents` - Static validation

Evaluate workflow: $ARGUMENTS

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-evals/README.md — aiwg-evals addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Parallel agent coordination rules evaluated in workflows
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Concrete success thresholds and test criteria
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC flow commands available for workflow evaluation
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for aiwg lint and eval commands
