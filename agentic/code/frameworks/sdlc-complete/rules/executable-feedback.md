---
enforcement: high
---

# Executable Feedback Loop Rules

**Enforcement Level**: HIGH
**Scope**: All code-generating agents
**Research Basis**: REF-013 MetaGPT (+4.2% HumanEval; −63% human revision cost, 2.25→0.83 cycles)
**Issue**: #101

## Overview

Code-generating agents MUST execute tests before returning results (MetaGPT's executable-feedback pattern), and track execution history so failures inform fixes rather than blind retries.

## Mandatory Rules

### Rule 1: Execute Before Return
Never return generated code without running its tests. Flow: generate → execute tests → pass? return : debug & retry. Returning untested code is FORBIDDEN.

### Rule 2: Track Execution History
Maintain debug memory per attempt: timestamp, code hash, test results (passed/failed/errors), failure analysis (test, error, root cause), and the fix applied. This history is what makes retries informed.

### Rule 3: Retry on Failure
On failure: (1) analyze, (2) identify root cause, (3) apply fix, (4) re-execute, (5) repeat until pass or max attempts. Retry policy: `max_attempts: 3`, immediate backoff, escalate to human review on max.

### Rule 4: Failure Analysis is REQUIRED
**FORBIDDEN**: retry with random changes. **REQUIRED**: for each failure record error type, message, stack-trace snippet, root cause, and fix strategy before changing code.

### Rule 5: Test Coverage Requirements
Minimum coverage before returning:

| Code Type | Min Coverage | Required Tests |
|-----------|--------------|----------------|
| New function | 80% | happy path + edge cases |
| Bug fix | 100% of fix | regression test for the bug |
| Refactor | match original | existing tests must pass |
| API endpoint | 90% | integration + error cases |

### Rule 6: Debug Memory Persistence
Persist debug memory across sessions at `.aiwg/ralph/debug-memory/` (JSON, ~30-day retention, indexed by file / error-type / test).

### Rule 7: Learning from History
Before generating, check debug memory (recent window) for similar file edits, the same test failures, and recurring error types; apply those learnings.

## Execution Protocol

Generate code → generate tests if absent (happy/edge/error) → execute and record → if pass, record success and return; if fail, analyze (parse errors, root cause, check memory for patterns), apply targeted fix, increment attempt, loop while attempts < max, else escalate to human with the full debug-memory context (original code, all test results, failure analyses, fix attempts).

## Checklist

Before returning code: tests generated for new code; tests executed (not skipped); all passing; debug memory updated; failures analyzed (if any); coverage meets minimum; learnings recorded.

## References

- @.aiwg/research/findings/REF-013-metagpt.md
- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/debug-memory.yaml — debug memory schema
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/test-engineer.md
- #101

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
