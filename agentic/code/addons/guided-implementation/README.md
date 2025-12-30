# Guided Implementation Addon

Bounded iteration control for autonomous issue-to-code implementation.

## Overview

This addon provides a single skill (`iteration-control`) that enables autonomous implementation workflows with bounded retries. It complements the `/flow-guided-implementation` command by managing retry logic and escalation.

**Key Insight**: Most implementation capabilities already exist in Claude Code (Grep, Glob, Edit, TodoWrite, Task). The missing piece is iteration control—knowing when to retry vs escalate.

## What This Addon Provides

| Component | Purpose |
|-----------|---------|
| `iteration-control` skill | Manages bounded retries with escalation |

## What Already Exists (Not Duplicated)

| Capability | Existing Tool/Agent |
|------------|---------------------|
| File location | Grep + Glob |
| Task decomposition | TodoWrite |
| Code generation | Edit + software-implementer agent |
| Code review | code-reviewer agent |
| Test debugging | debugger agent |
| Orchestration | `/flow-guided-implementation` command |

## Installation

```bash
# Via AIWG CLI
aiwg addon install guided-implementation

# Or copy to project
cp -r agentic/code/addons/guided-implementation/ .aiwg/addons/
```

## Usage

The skill is used by `/flow-guided-implementation`:

```
/flow-guided-implementation Add user authentication with JWT

# With custom retry limit
/flow-guided-implementation --max-retries 5 Fix the login validation bug
```

### Iteration Control Logic

```
FOR EACH task:
  iteration = 0
  LOOP:
    generate_code()
    validate() -> result

    # iteration-control skill decides:
    IF result.pass: proceed to next task
    IF result.fail AND iteration < max: retry with feedback
    IF result.fail AND iteration >= max: escalate to user
```

### Escalation Format

When max iterations reached:

```
ESCALATION: Max iterations reached (3/3)

Attempts:
- Iter 1: Test failed - undefined token
- Iter 2: Test failed - token missing userId
- Iter 3: Test failed - userId format mismatch

Pattern detected: userId format inconsistency

Question: The implementation uses string, test expects number.
Which format should be used?
```

## Research Foundation

Based on MAGIS (Multi-Agent GitHub Issue Resolution):

> Developer-QA iteration loops with bounds improve code quality while preventing infinite loops.

See: @.aiwg/research/REF-004-magis-multi-agent-issue-resolution.md

## Directory Structure

```
guided-implementation/
├── manifest.json
├── README.md
└── skills/
    └── iteration-control/
        └── SKILL.md
```

## Traceability

| Artifact | Location |
|----------|----------|
| Issue | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/1 |
| Feature Spec | @.aiwg/features/guided-implementation/README.md |
| Research | @.aiwg/research/REF-004-magis-multi-agent-issue-resolution.md |
| Flow Command | @agentic/code/frameworks/sdlc-complete/commands/flow-guided-implementation.md |
| Analysis | @.aiwg/working/guided-impl-analysis/SYNTHESIS.md |
