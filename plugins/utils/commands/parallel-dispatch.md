---
name: parallel-dispatch
description: Dispatch multiple agents in parallel with dependency-aware coordination
args: <task-file> [--max-parallel <n>] [--timeout <ms>] [--output <dir>]
---

# Parallel Dispatch

Orchestrate parallel agent execution with dependency awareness.

## Research Foundation

- **REF-001**: BP-9 - Parallel execution for throughput
- **REF-002**: Archetype 4 - Coordination prevents fragile execution

## Usage

```bash
/parallel-dispatch tasks.yaml
/parallel-dispatch review-tasks.yaml --max-parallel 4
/parallel-dispatch build-tasks.yaml --timeout 300000 --output .aiwg/working/build/
```

## Task File Format

```yaml
# tasks.yaml
name: architecture-review
description: Parallel architecture review with synthesis

tasks:
  # Independent tasks run in parallel
  - id: security-review
    agent: security-architect
    prompt: "Review architecture at .aiwg/architecture/sad.md for security"
    output: reviews/security.md
    dependencies: []

  - id: test-review
    agent: test-architect
    prompt: "Review architecture for testability"
    output: reviews/testability.md
    dependencies: []

  - id: ops-review
    agent: devops-engineer
    prompt: "Review architecture for operational concerns"
    output: reviews/operations.md
    dependencies: []

  # Dependent task waits for prerequisites
  - id: synthesis
    agent: documentation-synthesizer
    prompt: "Synthesize all reviews into final assessment"
    output: final-review.md
    dependencies:
      - security-review
      - test-review
      - ops-review

settings:
  max_parallel: 3
  timeout_per_task: 120000
  output_dir: .aiwg/working/reviews/
  on_failure: continue  # or: stop, retry
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --max-parallel | 4 | Maximum concurrent agents |
| --timeout | 120000 | Per-task timeout (ms) |
| --output | .aiwg/working/ | Output directory |
| --on-failure | continue | Failure handling: continue, stop, retry |
| --dry-run | false | Show execution plan without running |

## Execution Model

```
┌─────────────────────────────────────────┐
│           Parallel Dispatch              │
├─────────────────────────────────────────┤
│                                         │
│  Wave 1: Independent Tasks              │
│  ┌───────┐ ┌───────┐ ┌───────┐         │
│  │Task A │ │Task B │ │Task C │         │
│  └───┬───┘ └───┬───┘ └───┬───┘         │
│      │         │         │              │
│      └────────┬──────────┘              │
│               ▼                         │
│  Wave 2: Dependent Tasks                │
│  ┌─────────────────┐                    │
│  │    Task D       │                    │
│  │ (depends on ABC)│                    │
│  └─────────────────┘                    │
│                                         │
└─────────────────────────────────────────┘
```

## Process

1. **Parse Tasks**: Load task file, validate dependencies
2. **Build DAG**: Create dependency graph
3. **Plan Waves**: Group tasks by dependency level
4. **Execute Waves**: Run each wave in parallel
5. **Collect Results**: Gather outputs, track failures
6. **Report**: Summary with timing and status

## Output

```markdown
# Parallel Dispatch Report

## Summary
- **Total Tasks**: 4
- **Succeeded**: 4
- **Failed**: 0
- **Total Time**: 45.2s
- **Parallel Efficiency**: 73%

## Execution Timeline

| Wave | Tasks | Duration | Status |
|------|-------|----------|--------|
| 1 | security, test, ops | 32.1s | ✓ |
| 2 | synthesis | 13.1s | ✓ |

## Task Details

| Task | Agent | Duration | Status | Output |
|------|-------|----------|--------|--------|
| security-review | security-architect | 32.1s | ✓ | reviews/security.md |
| test-review | test-architect | 28.4s | ✓ | reviews/testability.md |
| ops-review | devops-engineer | 25.6s | ✓ | reviews/operations.md |
| synthesis | documentation-synthesizer | 13.1s | ✓ | final-review.md |

## Outputs
- .aiwg/working/reviews/security.md
- .aiwg/working/reviews/testability.md
- .aiwg/working/reviews/operations.md
- .aiwg/working/reviews/final-review.md
```

## Error Handling

### on_failure: continue

```yaml
# Failed tasks don't block independent tasks
# Dependent tasks are skipped if prerequisite fails
```

### on_failure: stop

```yaml
# First failure stops all execution
# Useful for critical pipelines
```

### on_failure: retry

```yaml
# Failed tasks retry up to 3 times
# Uses exponential backoff
```

## Examples

### Code Review Pipeline

```yaml
name: code-review-pipeline
tasks:
  - id: security-scan
    agent: security-architect
    prompt: "Security review of PR changes"
    output: security-findings.md

  - id: code-quality
    agent: code-reviewer
    prompt: "Code quality review"
    output: quality-findings.md

  - id: test-coverage
    agent: test-engineer
    prompt: "Test coverage analysis"
    output: coverage-findings.md

  - id: final-review
    agent: code-reviewer
    prompt: "Synthesize all findings into PR review"
    output: pr-review.md
    dependencies: [security-scan, code-quality, test-coverage]
```

### Documentation Generation

```yaml
name: doc-generation
tasks:
  - id: api-docs
    agent: api-documenter
    prompt: "Generate API documentation"
    output: api/

  - id: user-guide
    agent: technical-writer
    prompt: "Generate user guide"
    output: user-guide/

  - id: architecture-docs
    agent: architecture-documenter
    prompt: "Generate architecture documentation"
    output: architecture/
```

## Related

- `prompts/reliability/parallel-hints.md` - Parallel patterns
- `prompts/core/multi-agent-pattern.md` - Multi-agent workflow
- `eval-agent --scenario parallel-test` - Test parallel execution

Dispatch tasks from: $ARGUMENTS
