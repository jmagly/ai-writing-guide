# UAT Executor Guide: {Server Name}

## Plan Overview

**Plan file**: {plan_path}
**Server**: {server_name}
**Generated**: {generation_date}
**Tools**: {tool_count}
**Phases**: {phase_count}
**Total tests**: {test_count}
**Execution mode**: {quick | standard | full}

## Execution Rules

### Mandatory

1. Execute phases in order (Phase 0, 1, 2, ... N)
2. Execute tests within each phase sequentially
3. Negative tests with `Isolation: Required` get their own turn (single MCP call)
4. Substitute `${VARIABLE}` references with stored values before calling
5. Record pass/fail per criterion, not just per test
6. File an issue for every failure (unless `--no-issues`)
7. The cleanup phase ALWAYS runs, even if earlier phases failed
8. Never skip a test unless its prerequisite phase failed entirely

### Variable Handling

Variables are stored during execution and substituted in later phases:

```
Store: TEST_REPO_NAME = response.name
  → Stores the value of response.name as TEST_REPO_NAME

Later test:
  Parameters: {"repo": "${TEST_REPO_NAME}"}
  → Substitutes the stored value
```

If a variable is missing (because the storing test failed), mark dependent tests as `error: missing variable {name}`.

### Failure Handling

- **Test fails**: Record failure, file issue, continue to next test
- **Phase fails critically**: Skip dependent phases, mark as `skip: prerequisite failed`
- **MCP timeout**: Record as `error: timeout`, continue
- **Unexpected error**: Record full error details, continue

### Issue Filing Template

For each failure, file:

```markdown
## UAT Failure: {test_id} — {test_name}

**Phase**: {phase_name}
**MCP Tool**: {tool_name}
**Severity**: {infer from tool importance}

### Expected
{pass criteria from plan}

### Actual
{actual response or error}

### MCP Call
Tool: {tool_name}
Parameters:
```json
{exact parameters}
```

### Reproduction
Execute the MCP tool call above against {server_name}.

Labels: bug, uat
```

## Phase Checklist

- [ ] Phase 0: Preflight
- [ ] Phase 1: Seed Data
{repeat for each phase}
- [ ] Phase N: Cleanup

## Results Output

Save results to: `.aiwg/testing/uat/results/results-{server}-{timestamp}.yaml`
Save checkpoint to: `.aiwg/testing/uat/results/checkpoint-{server}-{timestamp}.yaml`

## Post-Execution

After all phases complete:
1. Print summary table (pass/fail/skip per phase)
2. List all filed issues
3. Report coverage percentage
4. Save results file
5. Suggest: `/uat-report {results_path}`
