# guided-implementation Overview

The guided-implementation addon provides bounded iteration control for autonomous issue-to-code workflows. It supplies a single skill (`iteration-control`) that manages retry logic and escalation, complementing the `/flow-guided-implementation` command.

## The Problem It Solves

Most implementation capabilities already exist in Claude Code: file search (Grep, Glob), task decomposition (TodoWrite), code generation (Edit), code review (code-reviewer agent), and test debugging (debugger agent). What was missing is a component that manages the loop itself — knowing when to retry a failed implementation attempt versus when to escalate to the user.

Without iteration control, an agent facing a failing test either gives up after one attempt (too conservative) or retries indefinitely in ways that produce increasingly divergent code (too aggressive). Iteration control establishes a bounded retry budget with structured escalation when the budget runs out.

## What the Addon Provides

| Component | Purpose |
|-----------|---------|
| `iteration-control` skill | Manages bounded retries with structured escalation |

Everything else the workflow needs — file operations, code generation, testing, review — is handled by Claude Code's native tools and the existing SDLC agents.

## How Iteration Control Works

For each implementation task:

```
iteration = 0
loop:
  generate_code()
  validate() → result

  if result.pass:
    proceed to next task
  elif result.fail AND iteration < max:
    retry with feedback (iteration += 1)
  elif result.fail AND iteration >= max:
    escalate to user
```

The skill tracks what was tried in each iteration and includes that history in the escalation message so the user has enough context to make a decision.

## Escalation Format

When the retry budget is exhausted, the skill produces a structured escalation:

```
ESCALATION: Max iterations reached (3/3)

Task: Implement JWT token validation

Attempts:
- Iter 1: Test failed — undefined token variable
- Iter 2: Test failed — token missing userId field  
- Iter 3: Test failed — userId format mismatch (string vs number)

Pattern detected: userId type inconsistency between implementation and test

Question: The implementation uses string, the test expects number.
Which format should userId be?
  A) string (implementation matches this)
  B) number (test expects this)
  C) Show me the relevant type definition
```

The escalation identifies the pattern across attempts rather than just reporting the last failure. This gives the user actionable context: the problem is a type inconsistency, not just a test failure.

## Usage

The skill is invoked by the `/flow-guided-implementation` command:

```
/flow-guided-implementation Add user authentication with JWT
```

With a custom retry limit:

```
/flow-guided-implementation --max-retries 5 Fix the login validation bug
```

The default retry limit is 3 attempts per task. For complex tasks requiring more exploration, increase it. For simple bugs, 3 is usually sufficient.

## Research Foundation

The iteration control design is based on MAGIS (Multi-Agent GitHub Issue Resolution) research, which found that bounded developer-QA iteration loops improve code quality while preventing infinite loops. The key insight is that bounded retries with human escalation outperform both single-attempt implementations and unbounded retry loops.

Reference: `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/commands/flow-guided-implementation.md`

## References

- `@$AIWG_ROOT/agentic/code/addons/guided-implementation/skills/iteration-control/SKILL.md` — Full skill definition
- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/commands/flow-guided-implementation.md` — The command this skill supports
