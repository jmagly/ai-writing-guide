# Disk-Based Output Patterns

**Issue:** #287
**Version:** 2026.2.0
**Status:** Active

## Overview

Claude Code v2.1.2 changed large tool outputs to be saved to disk instead of truncated at 30,000 characters. This guide documents how AIWG patterns (executable feedback, debug memory, Ralph loops) should handle disk-based output references.

## What Changed

| Before (v2.1.1) | After (v2.1.2+) |
|------------------|------------------|
| Outputs >30KB truncated | Outputs >30KB saved to disk |
| Lost critical context (test results, stack traces) | Full output preserved in temp files |
| `[truncated]` marker at end | File path reference returned |

## Impact on AIWG Patterns

### Executable Feedback (REF-013)

The executable feedback loop requires complete test output to analyze failures. With disk-based outputs:

**Before**: Agents parsed inline test results from Bash output.
**Now**: Agents must detect file path references and read the full output.

**Updated pattern**:
```
1. Execute tests via Bash
2. Check if result contains file path reference
3. If yes: Read the output file with Read tool
4. Parse test results from complete output
5. Store file path in debug memory for reference
6. Analyze failures from full context
```

### Debug Memory

Debug memory entries should reference disk output paths:

```yaml
debug_memory:
  executions:
    - attempt: 1
      test_results:
        passed: 42
        failed: 3
        output_path: "/tmp/claude-tool-output-abc123.txt"
        output_hash: "sha256:..."
      failures:
        - test: "test_auth_flow"
          error: "Expected 200 but got 401"
          full_output_line: 847  # Line in output file
```

### Ralph Loop Analysis

Ralph loops analyzing iteration progress should:

1. **Preserve output paths** across iterations for diff comparison
2. **Extract key metrics** from full output rather than relying on truncated summaries
3. **Reference specific lines** in output files when reporting progress

```yaml
ralph_iteration:
  iteration: 3
  execution:
    command: "npm test"
    output_path: "/tmp/claude-output-iter3.txt"
    exit_code: 1
  analysis:
    total_tests: 156
    passing: 153
    failing: 3
    improvement_from_last: "+2 tests passing"
```

## Handling Patterns

### Detecting Disk Output

When a Bash tool result mentions a file path for output, the agent should:

1. Use the Read tool to access the full content
2. Apply targeted reading (offset/limit) for very large files
3. Search for specific patterns using Grep on the output file

### Scratchpad for Processing

Use the session scratchpad directory for intermediate processing:

```
/tmp/claude-{uid}/{session}/scratchpad/
  test-results-parsed.json
  coverage-report.json
  failure-analysis.md
```

### Output Retention

Disk outputs are session-scoped. For persistence across sessions:
- Extract relevant data into `.aiwg/working/` files
- Record summaries in debug memory
- Reference paths are ephemeral - store content, not paths

## Best Practices

1. **Always read full output** for test failures - truncated output misses root causes
2. **Parse structured output** (JSON, TAP) programmatically when available
3. **Use Grep on output files** for targeted extraction of error messages
4. **Store extracted data** in debug memory, not raw file paths
5. **Clean up** processed output from scratchpad when done

## Agent Integration

All code-generating agents should be aware of disk output behavior. The agent template includes guidance in the "Disk-Based Output Handling" section.

## References

- @agentic/code/frameworks/sdlc-complete/agents/agent-template.md - Agent template with output handling
- @.claude/rules/executable-feedback.md - Executable feedback rules
- @docs/task-management-integration.md - Task output patterns
