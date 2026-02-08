# Research Before Decision Rules

**Enforcement Level**: HIGH
**Scope**: All tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)

## Overview

These rules mandate that agents research the codebase, documentation, and available sources before making technical decisions. Blind action without investigation is the single most common user complaint about AI coding assistants.

## Problem Statement

Agents frequently "yolo through" problems:
- Guessing API usage instead of reading docs
- Making technology choices without checking what's already in the codebase
- Retrying failed approaches blindly instead of investigating root cause
- Assuming configuration values instead of reading config files
- Inventing function signatures instead of checking the actual source

This produces whack-a-mole debugging loops where the agent makes a change, it fails, the agent tries something slightly different, it fails again — never stopping to actually understand the problem.

## Mandatory Rules

### Rule 1: Research Before Technical Decisions

**FORBIDDEN**:
```
Agent sees error → immediately tries a fix → fails → tries another fix → fails → ...
Agent needs API call → guesses the endpoint and parameters
Agent needs configuration → assumes default values
Agent picks a library → doesn't check what the project already uses
```

**REQUIRED**:
```
Agent sees error → reads error message carefully → searches codebase for context →
reads relevant files → understands the cause → applies targeted fix

Agent needs API call → reads API docs/types/source → constructs correct call

Agent needs configuration → reads config files → uses actual values

Agent picks a library → checks package.json/requirements.txt → uses what exists
```

### Rule 2: Search Before You Assume

Before making any of these decisions, the agent MUST search first:

| Decision Type | Required Research |
|---------------|-------------------|
| **API usage** | Read the function/method signature, types, or docs |
| **Configuration** | Read the actual config file (not guess defaults) |
| **Technology choice** | Check existing dependencies and patterns in the project |
| **Error diagnosis** | Read the full error message, check relevant source code |
| **File structure** | List/glob the directory before assuming paths exist |
| **Import paths** | Check actual export locations, don't guess module paths |
| **Test patterns** | Read existing tests to match the project's conventions |
| **Schema/types** | Read type definitions, don't invent interfaces |

### Rule 3: The Research-Then-Act Pattern

Every technical action must follow this sequence:

```
1. IDENTIFY what you need to know
2. SEARCH for that information (grep, glob, read, web search)
3. EXTRACT the relevant facts from search results
4. REASON about the right approach based on evidence
5. ACT with confidence backed by research
6. VERIFY the action succeeded
```

**FORBIDDEN**: Skipping steps 1-4 and jumping straight to step 5.

### Rule 4: Re-Research on Failure

When an action fails, the agent MUST NOT simply retry with a variation. Instead:

**FORBIDDEN** (whack-a-mole loop):
```
Attempt 1: import { foo } from './utils'     → Error: not found
Attempt 2: import { foo } from '../utils'    → Error: not found
Attempt 3: import { foo } from '../../utils' → Error: not found
```

**REQUIRED** (research-then-retry):
```
Attempt 1: import { foo } from './utils'     → Error: not found
Research:  grep for "export.*foo" across codebase
Finding:   foo is exported from src/helpers/validation.ts
Fix:       import { foo } from '../helpers/validation'
```

### Rule 5: Read Error Messages Completely

**FORBIDDEN**:
```
Error: Cannot find module '@/utils/auth' - Did you mean '@/lib/auth'?
Agent: *ignores the suggestion, tries random paths*
```

**REQUIRED**:
```
Error: Cannot find module '@/utils/auth' - Did you mean '@/lib/auth'?
Agent: The error suggests '@/lib/auth'. Let me verify that path exists,
       then use it.
```

Error messages frequently contain the answer. Read them fully before acting.

### Rule 6: Check Existing Patterns Before Creating New Ones

Before writing new code, check how the project already does similar things:

**FORBIDDEN**:
```
Task: Add a new API endpoint
Agent: *writes endpoint from scratch with own conventions*
```

**REQUIRED**:
```
Task: Add a new API endpoint
Agent: Let me check existing endpoints to match the project's patterns.
       *reads src/routes/ directory*
       *reads an existing endpoint file*
       *follows the same structure, middleware, error handling patterns*
```

## Detection Patterns

### Signs of Missing Research

| Pattern | Detection | Correct Response |
|---------|-----------|------------------|
| Guessed import path | Module not found errors on first attempt | Search for actual export location |
| Wrong API parameters | Type errors or runtime parameter mismatches | Read function signature/types |
| Assumed config value | Configuration-related failures | Read actual config file |
| Random path attempts | Multiple "file not found" errors in sequence | Glob for actual file location |
| Invented function names | "X is not a function" errors | Read the module's exports |
| Style mismatch | PR review comments about conventions | Read existing code for patterns |

### Whack-a-Mole Detection

If the agent makes 3+ sequential failed attempts at the same category of action without performing a search/read operation in between, this is a whack-a-mole loop. The agent MUST:

1. **Stop** attempting variations
2. **Research** by reading relevant source files, docs, or running diagnostic commands
3. **Understand** the root cause from the research
4. **Then** make a single informed attempt

## Integration with Thought Protocol

The Research thought type triggers this rule:

```
Research: I need to find out how this project handles authentication
          before I add the new auth middleware.

Action: grep for "authenticate" in src/ directory
Action: read src/middleware/auth.ts

Extraction: The project uses JWT with refresh tokens. Middleware is
            registered in src/app.ts. Token validation uses jose library.

Reasoning: I should follow the existing pattern using jose and register
           my new middleware in src/app.ts alongside the existing one.
```

## Integration with Anti-Laziness

Research-before-decision complements anti-laziness:
- Anti-laziness prevents destructive shortcuts (deleting tests, removing features)
- Research-before-decision prevents uninformed action (guessing, assuming, yoloing)

Both address the same root cause: agents taking the path of least resistance instead of doing the work to get it right.

## Integration with TAO Loop

In the Thought-Action-Observation loop:
- **Thought** must include what needs to be researched
- **Action** must include search/read operations before modification operations
- **Observation** must extract facts that inform the next action

A TAO iteration that goes Thought→Edit→Error without any Read/Search/Grep action is a violation of this rule.

## Platform Applicability

This rule applies universally across all AI coding platforms:
- Claude Code, Codex, Copilot, Cursor, Warp, Factory, OpenCode, Windsurf
- Any agent that modifies code or makes technical decisions

Research is not optional. It is the minimum bar for competent assistance.

## Checklist

Before making a technical decision, verify:

- [ ] Read the relevant source code (not guessed)
- [ ] Checked existing project patterns
- [ ] Read error messages completely
- [ ] Searched for actual file/function locations
- [ ] Verified types/signatures from source (not memory)
- [ ] Confirmed dependencies exist in project

## References

- @.claude/rules/thought-protocol.md - Research thought type
- @.claude/rules/tao-loop.md - TAO loop standardization
- @.claude/rules/anti-laziness.md - Complementary anti-shortcut rules
- @.claude/rules/failure-mitigation.md - Failure archetype mitigations

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-08
