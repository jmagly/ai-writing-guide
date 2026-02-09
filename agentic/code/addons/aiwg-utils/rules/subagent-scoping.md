# Subagent Scoping Rules

**Enforcement Level**: HIGH
**Scope**: All tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Issue**: #314

## Overview

These rules prevent context overload when delegating work to subagents by enforcing focused, single-purpose invocations with minimal context and clear output boundaries.

## Problem Statement

Agents frequently overload subagents by:
- Delegating multiple related tasks to a single subagent
- Dumping entire conversation histories when only a summary is needed
- Asking for "comprehensive analysis" instead of specific, bounded outputs
- Creating deep delegation chains that compound context bloat
- Failing to decompose complex tasks before delegation

This causes:
- Context window overflow and truncation
- Degraded output quality as subagent runs out of space
- Premature termination before completing all assigned work
- Expensive re-runs after failure due to scope issues

## Mandatory Rules

### Rule 1: Single Responsibility Per Subagent

Each subagent invocation MUST have ONE clear, focused objective.

**IMPORTANT CLARIFICATION**: This rule scopes individual subagent invocations. It does NOT limit the total number of subagents an orchestrator can spawn. Spawning 20 focused subagents for a large project is correct; giving one subagent 20 tasks is wrong.

**FORBIDDEN**:
```
Task: "Review the authentication module for security issues, suggest performance
improvements, update the documentation, and write integration tests."

Delegation: Give all 4 tasks to one subagent
```

**REQUIRED**:
```
Task: Complex auth module work

Decomposition:
  1. Security review subagent
  2. Performance optimization subagent
  3. Documentation update subagent
  4. Test generation subagent

Delegation: Spawn 4 focused subagents, each with one responsibility
```

### Rule 2: Context Minimization

Only include context directly relevant to the subagent's task.

**FORBIDDEN**:
```
Subagent context:
  - Full 50-message conversation history
  - All 15 files in the module
  - Complete architecture documentation
  - Entire project requirements

Subagent task: "Check if function validateEmail() handles null input correctly"
```

**REQUIRED**:
```
Subagent context:
  - The validateEmail() function (10 lines)
  - Relevant test file section (20 lines)
  - Acceptance criteria for email validation (3 bullet points)

Subagent task: "Check if validateEmail() handles null input correctly"
```

### Rule 3: Task Decomposition Before Delegation

Before spawning subagents, decompose complex tasks into atomic units.

**FORBIDDEN**:
```
Complex task: Implement user registration flow

Direct delegation:
  Subagent: "Implement the entire user registration flow"
```

**REQUIRED**:
```
Complex task: Implement user registration flow

Decomposition:
  1. Validate user input (email, password format)
  2. Check for duplicate email
  3. Hash password
  4. Create database record
  5. Send verification email
  6. Return success response

Delegation:
  - Subagent 1: Input validation function
  - Subagent 2: Duplicate check query
  - Subagent 3: Password hashing integration
  - Subagent 4: Database insertion
  - Subagent 5: Email sending
  - Subagent 6: Response builder

Each atomic, each can succeed/fail independently
```

### Rule 4: Parallel Over Sequential Overload

When N related tasks exist, spawn N separate subagents in parallel. This pattern scales to any number of parallel subagents as needed by the workflow.

**FORBIDDEN**:
```
Tasks:
  - Write tests for login()
  - Write tests for logout()
  - Write tests for refreshToken()
  - Write tests for validateSession()

Delegation: One subagent: "Write tests for login, logout, refreshToken, and validateSession"
```

**REQUIRED**:
```
Tasks:
  - Write tests for login()
  - Write tests for logout()
  - Write tests for refreshToken()
  - Write tests for validateSession()

Delegation: Spawn 4 test-writing subagents in parallel, one per function
```

**Note**: This pattern applies to large workflows as well. If decomposition produces 20 atomic tasks, spawn 20 parallel subagents. The limit is on what goes INTO each subagent, not on how many subagents you spawn.

### Rule 5: Output Scoping

Tell the subagent exactly what format and scope of output to return.

**FORBIDDEN**:
```
Subagent task: "Analyze the authentication system and provide recommendations"

Expected output: Not specified
```

**REQUIRED**:
```
Subagent task: "Identify the top 3 security risks in the authentication system"

Expected output:
  - List format
  - Exactly 3 items
  - Each item: risk name, severity (critical/high/medium), 1-sentence description
  - No more than 300 words total
```

### Rule 6: No Deep Recursive Delegation Chains

Subagents should not spawn their own subagents more than 1 level deep.

**FORBIDDEN**:
```
Agent -> Subagent A -> Subagent B -> Subagent C -> Subagent D

Depth: 4 levels (agent + 3 nested subagents)
```

**REQUIRED**:
```
Agent -> Subagent A
     -> Subagent B
     -> Subagent C
     -> Subagent D

Depth: 1 level (agent + direct subagents only)
```

**Acceptable exception** (1 level of recursion):
```
Agent -> Subagent A -> Subagent A.1
                   -> Subagent A.2

Depth: 2 levels maximum
```

If deeper decomposition is needed, the parent agent should handle it.

### Rule 7: Context Budget Estimation

Before delegating, estimate whether the task fits comfortably in context. If `AIWG_CONTEXT_WINDOW` is set in the project context file, use that value as the available context. Otherwise, assume the platform default.

See `@.claude/rules/context-budget.md` for the full context budget configuration system, including parallel subagent limits and compaction guidance.

**Context Budget Formula**:
```
Available Context = AIWG_CONTEXT_WINDOW (if set) or platform default

Estimated Usage:
  - System prompt: 2k tokens
  - Task context: X tokens
  - Task description: Y tokens
  - Expected output: Z tokens
  - Buffer for reasoning: 20% of window

Total Estimated = (2k + X + Y + Z) * 1.2

If Total Estimated > 50% of Available Context:
  -> Task is too large, decompose further
```

**Parallel limits** (when `AIWG_CONTEXT_WINDOW` is set):

| Context Window | Max Parallel Subagents |
|----------------|----------------------|
| ≤64k | 1-2 |
| 65k-128k | 2-4 |
| 129k-256k | 4-8 |
| 257k-512k | 8-12 |
| >512k | 12-20 |
| Unset | No limit (platform decides) |

Formula: `max_parallel = max(1, floor(context_window / 50000))` capped at 20.

## Detection Patterns

### Signs of Overloaded Subagents

| Symptom | Indicates |
|---------|-----------|
| Subagent produces truncated output | Context overflow |
| Subagent addresses only 2 of 5 tasks | Too many tasks assigned |
| Subagent output quality degrades near end | Ran out of space for reasoning |
| Subagent fails with "context too long" error | Exceeded window size |
| Subagent provides superficial analysis | Not enough room to go deep |
| Re-running subagent produces different subset of work | Non-deterministic due to overload |

### Warning Signs Before Delegation

| Check | Red Flag | Action |
|-------|----------|--------|
| Task verb count | >3 verbs (analyze, refactor, document, test) | Decompose into separate tasks |
| Context file count | >5 files | Minimize to only essential files |
| Expected output length | >2000 words or >500 lines of code | Split into smaller deliverables |
| Task has "and" | "Do X and Y and Z" | Separate into X, Y, Z subagents |
| Complexity estimate | "This will take hours" | Too complex for one subagent |

## Best Practices

### Good Delegation Patterns

**Pattern 1: Focused Analysis**
```
Agent task: Review security of authentication module

Good delegation:
  Subagent 1: "List all functions in auth.ts that handle passwords"
  Subagent 2: "For each function identified, check if password is hashed before storage"
  Subagent 3: "Verify password comparison uses constant-time algorithm"

Each subagent: Small context, single check, clear output
```

**Pattern 2: Incremental Implementation**
```
Agent task: Add logging to user service

Good delegation:
  Subagent 1: "Add info-level log on successful user creation"
  Subagent 2: "Add warn-level log on failed user validation"
  Subagent 3: "Add error-level log on database save failure"

Each subagent: One log statement, clear location, minimal context
```

**Pattern 3: Structured Output**
```
Agent task: Extract key metrics from test run

Good delegation:
  Subagent: "From test output, extract exactly 4 values:
    1. Total test count (integer)
    2. Pass count (integer)
    3. Fail count (integer)
    4. Duration in seconds (float)
  Return as JSON: {total, pass, fail, duration}"

Clear output format prevents rambling analysis
```

## Orchestrator Fan-Out Patterns

### The Distinction

**These rules limit what goes INTO each subagent, not how many subagents an orchestrator can spawn.**

When an orchestrator receives a large ticket or workflow:
- **CORRECT**: Decompose into N atomic subtasks, spawn N subagents (one per subtask)
- **WRONG**: Give one subagent the entire ticket with N tasks bundled together

**Note**: If `AIWG_CONTEXT_WINDOW` is set, the total number of *concurrent* parallel subagents should respect the budget limit. All N subtasks still execute — just in sequential waves rather than all at once. See `@.claude/rules/context-budget.md`.

### Orchestrator Pattern Examples

**Example 1: Large Feature Implementation**

```
Ticket: "Implement user authentication system"

Orchestrator decomposition (10 subtasks):
  1. Design database schema for users table
  2. Create user model and validation
  3. Implement password hashing service
  4. Build registration endpoint
  5. Build login endpoint
  6. Build logout endpoint
  7. Implement session management
  8. Add authentication middleware
  9. Write unit tests for auth functions
  10. Write integration tests for auth flow

CORRECT delegation:
  Spawn 10 subagents in parallel, one per subtask
  Each subagent gets:
    - One atomic task
    - Minimal context (only files/info relevant to that task)
    - Clear output specification

WRONG delegation:
  Spawn 1 subagent: "Implement the entire authentication system"
  This violates Rule 1 (single responsibility per subagent)
```

**Example 2: Multi-File Refactoring**

```
Ticket: "Refactor error handling across 15 service files"

Orchestrator decomposition (15 subtasks):
  1. Refactor error handling in userService.ts
  2. Refactor error handling in authService.ts
  3. Refactor error handling in orderService.ts
  ... (12 more files)

CORRECT delegation:
  Spawn 15 subagents in parallel, one per file
  Each subagent gets:
    - Single file to refactor
    - Error handling pattern specification
    - Expected output: refactored file

WRONG delegation:
  Spawn 1 subagent: "Refactor error handling in all 15 service files"
  This violates Rules 1, 2, and 4
```

**Example 3: Test Suite Generation**

```
Ticket: "Write comprehensive tests for payment module (20 functions)"

Orchestrator decomposition (20 subtasks):
  1. Write tests for processPayment()
  2. Write tests for refundPayment()
  3. Write tests for validateCard()
  ... (17 more functions)

CORRECT delegation:
  Spawn 20 subagents in parallel, one per function
  Each subagent gets:
    - Single function signature and implementation
    - Test requirements (coverage, edge cases)
    - Expected output: test file for that function

WRONG delegation:
  Spawn 1 subagent: "Write tests for all 20 payment functions"
  This guarantees context overflow and incomplete coverage
```

### When to Spawn Many Subagents

An orchestrator SHOULD spawn many subagents when:

| Scenario | Subagent Count | Rationale |
|----------|---------------|-----------|
| Large feature with independent components | 10-20+ | Each component is atomic |
| Multi-file refactoring | 1 per file | Each file is independent |
| Test generation for module | 1 per function | Each function's tests are independent |
| Security audit of microservices | 1 per service | Each service is independent |
| Documentation updates across repo | 1 per doc section | Each section is independent |
| API endpoint implementation | 1 per endpoint | Each endpoint is independent |

### The Anti-Pattern to Avoid

The anti-pattern is NOT "spawning too many subagents."

The anti-pattern IS:
- Giving one subagent multiple tasks → overload
- Dumping entire project context into one subagent → overload
- Making one subagent responsible for large scope → overload

Spawning 50 focused subagents with minimal context is BETTER than spawning 5 overloaded subagents with massive context.

### Orchestrator Decision Flow

```
Orchestrator receives large ticket
  ↓
Identify all subtasks (decomposition)
  ↓
For each subtask:
  - Is it atomic? (cannot be meaningfully decomposed further)
  - Is context minimal? (<20% of subagent window)
  - Is output scoped? (clear format and boundaries)
  ↓
If YES to all: Spawn one subagent per subtask
If NO to any: Decompose that subtask further
  ↓
Execute subagents in parallel
  ↓
Aggregate results
```

## Integration with Other Rules

### With Instruction Comprehension

These rules complement `@.claude/rules/instruction-comprehension.md`:
- Instruction comprehension: Understand the full user request
- Subagent scoping: Break that request into manageable chunks for delegation

### With Research Before Decision

These rules complement `@.claude/rules/research-before-decision.md`:
- Research-before-decision: Know what needs to be done
- Subagent scoping: Delegate that work effectively without overload

### With Anti-Laziness

These rules complement `@.claude/rules/anti-laziness.md`:
- Anti-laziness: Complete the task, don't take shortcuts
- Subagent scoping: Complete the task by delegating appropriately, not overloading

## Platform Applicability

This rule applies universally across all AI coding platforms:
- Claude Code, Codex, Copilot, Cursor, Warp, Factory, OpenCode, Windsurf
- Any agent that delegates work to subagents

Effective delegation is foundational to multi-agent systems.

## Metrics

Track these metrics for subagent effectiveness:

| Metric | Target | Indicates |
|--------|--------|-----------|
| Subagent success rate | >90% | Well-scoped tasks |
| Context utilization | 20-50% | Appropriate sizing |
| Output truncation rate | <5% | Not overloaded |
| Average task decomposition depth | <3 levels | Manageable complexity |
| Parallel subagent ratio | >0.5 | Using parallelism effectively |

## Checklist

Before spawning a subagent:

- [ ] Task has exactly ONE clear objective
- [ ] Context includes only what's directly relevant (estimated <20% of window)
- [ ] Expected output format and scope are explicit
- [ ] Task is atomic (cannot be meaningfully decomposed further)
- [ ] If multiple similar tasks exist, spawning separate subagents instead of bundling
- [ ] Delegation depth will not exceed 2 levels
- [ ] Context budget estimated and within safe bounds (<50% of window)
- [ ] If `AIWG_CONTEXT_WINDOW` is set, parallel count is within budget (see `@.claude/rules/context-budget.md`)

Before giving a subagent multiple tasks:

- [ ] STOP - this is likely wrong
- [ ] Re-evaluate: can these be separate subagents?
- [ ] If tasks are truly inseparable, document why

Before limiting the number of subagents spawned:

- [ ] STOP - the rules limit what goes INTO each subagent, not how many subagents you spawn
- [ ] Re-evaluate: is each subagent truly focused on one atomic task?
- [ ] If yes, spawning many subagents is correct

## References

- @.claude/rules/context-budget.md - Context window budget configuration and parallel limits
- @.claude/rules/instruction-comprehension.md - Understanding user requests
- @.claude/rules/research-before-decision.md - Informed delegation
- @.claude/rules/anti-laziness.md - Complete work without shortcuts
- @.claude/rules/tao-loop.md - TAO loop standardization

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-09
