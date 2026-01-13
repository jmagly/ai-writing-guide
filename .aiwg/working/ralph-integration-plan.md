# Ralph Integration Plan

## Executive Summary

The Ralph Wiggum methodology transforms AI coding from "single-pass execution" to "iterative completion loops." This integration adds a complete Ralph subsystem to AIWG, enabling autonomous task execution with automatic recovery and iteration until success criteria are met.

**Core Philosophy**: "Iteration beats perfection" - predictable failure with automatic recovery beats unpredictable single-pass success.

---

## Table of Contents

1. [The Ralph Methodology](#1-the-ralph-methodology)
2. [Integration Architecture](#2-integration-architecture)
3. [Addon Structure](#3-addon-structure)
4. [Commands](#4-commands)
5. [Skills](#5-skills)
6. [Agents](#6-agents)
7. [Hooks](#7-hooks)
8. [CLI Integration](#8-cli-integration)
9. [User Documentation](#9-user-documentation)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. The Ralph Methodology

### Core Mechanism

The Ralph loop inverts traditional AI optimization from **"unpredictable success"** to **"predictable failure with automatic recovery"**.

```
┌─────────────────────────────────────────────────────────┐
│                    RALPH LOOP                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  Prompt  │───▶│  Execute │───▶│  Check   │          │
│  │  + Task  │    │   Task   │    │ Complete │          │
│  └──────────┘    └──────────┘    └────┬─────┘          │
│       ▲                               │                 │
│       │                               │                 │
│       │         ┌──────────┐          │                 │
│       │    NO   │ Re-inject│◀─────────┤                 │
│       └─────────│  Prompt  │          │                 │
│                 └──────────┘          │                 │
│                                       │ YES             │
│                               ┌───────▼─────┐           │
│                               │   SUCCESS   │           │
│                               └─────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Five-Phase Process

| Phase | Description | AIWG Integration |
|-------|-------------|------------------|
| **1. Define** | Clear task + completion criteria | `/ralph` command parameters |
| **2. Configure** | Set iteration limits (safety) | `--max-iterations`, `--timeout` |
| **3. Execute** | Run the loop | Ralph hook intercepts exit |
| **4. Monitor** | Watch via git commits | Trace system + git log |
| **5. Review** | Evaluate results | Completion report artifact |

### Ideal Use Cases

| Use Case | Why Ralph Excels |
|----------|------------------|
| **Batch refactors** | Iterate through files until all pass |
| **Migration tasks** | Keep trying until migration completes |
| **Greenfield projects** | Build incrementally until scaffold complete |
| **Test-until-pass** | Run tests, fix failures, repeat |
| **Linting/formatting** | Auto-fix until clean |

### Completion Criteria Best Practices

**Good criteria** (verifiable):
- "All tests pass"
- "No TypeScript errors"
- "Coverage > 80%"
- "All files in /src have JSDoc comments"

**Poor criteria** (subjective):
- "Code is good"
- "Feature is complete"
- "Performance is acceptable"

---

## 2. Integration Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        AIWG ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   /ralph    │   │ ralph skill │   │  ralph CLI  │           │
│  │   command   │   │  (trigger)  │   │  aiwg ralph │           │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │ ralph-loop  │                              │
│                    │   agent     │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐           │
│  │ ralph-loop  │  │  aiwg-trace  │  │    git       │           │
│  │    hook     │  │    hook      │  │   commits    │           │
│  └─────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component | Purpose | Location |
|-----------|---------|----------|
| **Addon** | Package all ralph components | `agentic/code/addons/ralph/` |
| **Command** | Slash command `/ralph` | `addons/ralph/commands/ralph.md` |
| **Skill** | Natural language triggers | `addons/ralph/skills/ralph-loop/` |
| **Agent** | Orchestration persona | `addons/ralph/agents/ralph-loop.md` |
| **Hook** | Exit interception | `addons/ralph/hooks/ralph-loop.js` |
| **CLI** | Direct invocation | `src/cli/ralph.mjs` |
| **Templates** | Task templates | `addons/ralph/templates/` |

---

## 3. Addon Structure

### Directory Layout

```
agentic/code/addons/ralph/
├── manifest.json              # Addon registration
├── README.md                  # User documentation
│
├── commands/
│   ├── ralph.md              # Main /ralph command
│   ├── ralph-status.md       # Check loop status
│   ├── ralph-abort.md        # Abort running loop
│   └── ralph-resume.md       # Resume interrupted loop
│
├── skills/
│   └── ralph-loop/
│       ├── SKILL.md          # Skill definition
│       └── manifest.json     # Skill metadata
│
├── agents/
│   ├── ralph-loop.md         # Loop orchestrator agent
│   └── ralph-verifier.md     # Completion criteria checker
│
├── hooks/
│   ├── ralph-loop.js         # Exit interception hook
│   └── ralph-commit.js       # Auto-commit on iteration
│
├── templates/
│   ├── ralph-task.md         # Task definition template
│   ├── ralph-completion.md   # Completion report template
│   └── ralph-config.json     # Default configuration
│
└── docs/
    ├── quickstart.md         # Getting started guide
    ├── best-practices.md     # Prompt engineering tips
    ├── troubleshooting.md    # Common issues
    └── examples/
        ├── batch-refactor.md
        ├── migration.md
        ├── test-fix-loop.md
        └── greenfield.md
```

### manifest.json

```json
{
  "id": "ralph",
  "type": "addon",
  "name": "Ralph Loop",
  "version": "1.0.0",
  "description": "Iterative AI coding loops with automatic recovery - iteration beats perfection",
  "core": false,
  "autoInstall": false,
  "author": "AIWG Contributors",
  "license": "MIT",
  "repository": "https://github.com/jmagly/ai-writing-guide",
  "keywords": [
    "ralph",
    "iteration",
    "loop",
    "autonomous",
    "batch",
    "refactor",
    "migration"
  ],
  "researchFoundation": {
    "REF-001": "Ralph Wiggum methodology - iterative AI execution",
    "REF-002": "BP-6 - Recovery requires execution history",
    "REF-003": "Archetype 4 - Predictable failure with automatic recovery"
  },
  "entry": {
    "commands": "commands/",
    "skills": "skills/",
    "agents": "agents/",
    "hooks": "hooks/",
    "templates": "templates/",
    "docs": "docs/"
  },
  "commands": [
    "ralph",
    "ralph-status",
    "ralph-abort",
    "ralph-resume"
  ],
  "skills": [
    "ralph-loop"
  ],
  "agents": [
    "ralph-loop",
    "ralph-verifier"
  ],
  "hooks": [
    "ralph-loop",
    "ralph-commit"
  ],
  "templates": [
    "ralph-task",
    "ralph-completion",
    "ralph-config"
  ],
  "dependencies": {
    "required": ["aiwg-hooks", "aiwg-utils"],
    "optional": []
  },
  "configuration": {
    "defaults": {
      "maxIterations": 10,
      "timeoutMinutes": 60,
      "autoCommit": true,
      "verboseTrace": false
    }
  }
}
```

---

## 4. Commands

### `/ralph` - Main Loop Command

**File**: `commands/ralph.md`

```yaml
---
description: Execute iterative task loop until completion criteria are met
category: automation
argument-hint: "<task>" --completion "<criteria>" [--max-iterations N] [--timeout M] [--interactive]
allowed-tools: Task, Read, Write, Bash, Glob, Grep, TodoWrite
orchestration: true
model: opus
---
```

**Full Definition**:

````markdown
---
description: Execute iterative task loop until completion criteria are met
category: automation
argument-hint: "<task>" --completion "<criteria>" [--max-iterations N] [--timeout M] [--interactive]
allowed-tools: Task, Read, Write, Bash, Glob, Grep, TodoWrite
orchestration: true
model: opus
---

# Ralph Loop

**You are the Ralph Loop Orchestrator** - executing iterative AI task loops until completion criteria are met.

## Core Philosophy

"Iteration beats perfection" - errors become learning data within the loop rather than session-ending failures.

## Your Role

You manage the iterative execution cycle:

1. **Parse** task definition and completion criteria
2. **Execute** the task
3. **Verify** completion criteria
4. **Iterate** if not complete (re-inject prompt with learnings)
5. **Report** final status

## Natural Language Triggers

Users may say:
- "ralph this: [task]"
- "loop until: [criteria]"
- "keep trying until [condition]"
- "iterate on [task] until [done]"
- "ralph loop [task]"

## Parameters

### Task (required)
The task to execute. Should be:
- Specific and actionable
- Measurable completion state
- Self-contained (all context provided)

### --completion (required)
Success criteria. Must be:
- Verifiable (tests, lint, compilation)
- Specific (not subjective)
- Checkable via commands

**Good examples**:
- `--completion "npm test passes with 0 failures"`
- `--completion "npx tsc --noEmit exits with code 0"`
- `--completion "all files in src/ have JSDoc comments"`
- `--completion "coverage report shows >80%"`

**Poor examples**:
- `--completion "code looks good"`
- `--completion "feature is done"`

### --max-iterations (default: 10)
Safety limit on iterations. Prevents infinite loops.

### --timeout (default: 60 minutes)
Maximum wall-clock time for entire loop.

### --interactive
Ask clarifying questions before starting loop.

**Questions asked**:
```
Q1: What specific outcome defines success?
Q2: What verification command should I run?
Q3: Are there any files I should NOT modify?
Q4: Should I commit after each iteration?
Q5: Any constraints on approach?
```

### --no-commit
Disable auto-commit after each iteration.

### --branch <name>
Create feature branch for loop work.

## Execution Flow

### Phase 1: Initialization

```
1. Parse task and completion criteria
2. Validate criteria are verifiable
3. Create .aiwg/ralph/ workspace
4. Initialize iteration counter (i=0)
5. Create feature branch if requested
6. Log: "Ralph loop initialized"
```

### Phase 2: Execute Iteration

```
For each iteration i:

1. Increment counter (i++)
2. Check iteration limit
3. Check timeout
4. Execute task with full context:
   - Original task prompt
   - Previous iteration results (if any)
   - Errors/failures to address
   - Git diff of changes so far
5. Auto-commit if enabled: "ralph: iteration {i}"
6. Proceed to verification
```

### Phase 3: Verify Completion

```
1. Run verification command from --completion
2. Parse result:
   - Exit code 0 → SUCCESS
   - Exit code non-zero → CONTINUE
3. If SUCCESS:
   - Generate completion report
   - Exit loop
4. If CONTINUE:
   - Extract learnings from failure
   - Re-inject prompt with learnings
   - Go to Phase 2
```

### Phase 4: Completion Report

Generate `.aiwg/ralph/completion-{timestamp}.md`:

```markdown
# Ralph Loop Completion Report

**Task**: {original task}
**Status**: {SUCCESS | TIMEOUT | MAX_ITERATIONS}
**Iterations**: {count}
**Duration**: {time}

## Iteration History

| # | Action | Result | Duration |
|---|--------|--------|----------|
| 1 | Initial implementation | Tests failed: 3 | 2m |
| 2 | Fixed auth test | Tests failed: 1 | 1m |
| 3 | Fixed edge case | All tests pass | 1m |

## Verification

```
$ npm test
✓ 42 tests passed
```

## Files Modified

- src/auth/login.ts (+15, -3)
- src/auth/logout.ts (+8, -2)
- test/auth.test.ts (+25, -0)

## Git Commits

- abc1234 ralph: iteration 1 - initial implementation
- def5678 ralph: iteration 2 - fix auth test
- ghi9012 ralph: iteration 3 - fix edge case
```

## Error Handling

### Max Iterations Reached

```
⚠️ Ralph loop reached maximum iterations ({max})

Last failure:
{error details}

Options:
1. Increase limit: /ralph-resume --max-iterations 20
2. Manual fix, then: /ralph-resume
3. Abort: /ralph-abort
```

### Timeout Reached

```
⚠️ Ralph loop timed out after {minutes} minutes

Iteration {i} was in progress:
{status}

Options:
1. Resume: /ralph-resume
2. Increase timeout: /ralph-resume --timeout 120
3. Abort: /ralph-abort
```

### Verification Command Failed

```
⚠️ Verification command failed to execute

Command: {command}
Error: {error}

Please check completion criteria syntax.
```

## Artifacts Generated

| Artifact | Path | Purpose |
|----------|------|---------|
| Loop state | `.aiwg/ralph/current-loop.json` | Resume support |
| Iteration logs | `.aiwg/ralph/iterations/` | Debug history |
| Completion report | `.aiwg/ralph/completion-*.md` | Final summary |

## Examples

### Basic Test Loop

```
/ralph "Fix all failing tests in src/auth/" --completion "npm test -- --testPathPattern=auth passes"
```

### TypeScript Migration

```
/ralph "Convert src/utils/ to TypeScript" --completion "npx tsc --noEmit exits with code 0" --max-iterations 20
```

### Coverage Target

```
/ralph "Add tests to reach 80% coverage" --completion "npm run coverage shows >80%" --timeout 120
```

### Interactive Complex Task

```
/ralph --interactive "Implement user authentication"
```

## Integration with AIWG

### Tracing
All iterations are traced via `aiwg-trace` hook:
```json
{"type": "ralph_iteration", "iteration": 1, "status": "continue"}
{"type": "ralph_iteration", "iteration": 2, "status": "continue"}
{"type": "ralph_complete", "iteration": 3, "status": "success"}
```

### Git Integration
- Creates feature branch: `ralph/{task-slug}`
- Commits each iteration: `ralph: iteration {N} - {summary}`
- Final squash optional: `ralph: {task summary}`

### Workspace
- State stored in `.aiwg/ralph/`
- Safe to delete after completion
- Enables `/ralph-resume` functionality

## Related Commands

- `/ralph-status` - Check current loop status
- `/ralph-abort` - Abort running loop
- `/ralph-resume` - Resume interrupted loop
````

### `/ralph-status` - Check Loop Status

```yaml
---
description: Check status of current or previous Ralph loop
category: automation
argument-hint: [--latest] [--all]
allowed-tools: Read, Glob
model: haiku
---
```

### `/ralph-abort` - Abort Loop

```yaml
---
description: Abort a running Ralph loop and generate partial report
category: automation
argument-hint: [--keep-changes] [--revert]
allowed-tools: Read, Write, Bash
model: sonnet
---
```

### `/ralph-resume` - Resume Loop

```yaml
---
description: Resume an interrupted Ralph loop from last checkpoint
category: automation
argument-hint: [--max-iterations N] [--timeout M]
allowed-tools: Read, Write, Task
orchestration: true
model: opus
---
```

---

## 5. Skills

### ralph-loop Skill

**File**: `skills/ralph-loop/SKILL.md`

```markdown
---
name: ralph-loop
description: Detect requests for iterative AI task loops and invoke Ralph
triggers:
  - "ralph this"
  - "ralph:"
  - "keep trying until"
  - "loop until"
  - "iterate until"
  - "run until passes"
  - "fix until green"
  - "keep fixing until"
  - "ralph it"
---

# Ralph Loop Skill

You detect when users want iterative task execution and route to `/ralph`.

## Trigger Patterns

| Pattern | Example | Action |
|---------|---------|--------|
| "ralph this: X" | "ralph this: fix all lint errors" | Extract task, infer completion |
| "keep trying until X" | "keep trying until tests pass" | Task = current context, completion = X |
| "loop until X" | "loop until coverage >80%" | Task = improve coverage, completion = X |
| "iterate on X until Y" | "iterate on auth until secure" | Task = X, completion = Y |
| "ralph it" | "ralph it" (after task description) | Use previous context |

## Extraction Rules

### Task Extraction

From: "ralph this: fix all TypeScript errors"
→ Task: "fix all TypeScript errors"
→ Completion: "npx tsc --noEmit exits with code 0"

From: "keep trying to add tests until coverage >80%"
→ Task: "add tests to improve coverage"
→ Completion: "coverage report shows >80%"

### Completion Inference

If user doesn't specify verification:

| Task Pattern | Inferred Completion |
|--------------|---------------------|
| "fix tests" | "npm test passes" |
| "fix lint" | "npm run lint passes" |
| "fix types" | "npx tsc --noEmit passes" |
| "fix build" | "npm run build succeeds" |
| "add tests" | "coverage increases" |

## Invocation

When triggered, invoke:

```
/ralph "{extracted_task}" --completion "{inferred_or_explicit_completion}"
```

If uncertain, ask:

```
I'll start a Ralph loop for: {task}

What command verifies completion?
1. npm test (Recommended)
2. npx tsc --noEmit
3. npm run lint
4. Custom command...
```

## Examples

**User**: "ralph this: migrate all files in lib/ to ESM"
**Skill**: `/ralph "migrate all files in lib/ to ESM" --completion "node --experimental-vm-modules lib/index.js runs without errors"`

**User**: "keep fixing until the tests are green"
**Skill**: `/ralph "fix failing tests" --completion "npm test passes with 0 failures"`

**User**: "ralph it" (after discussing a refactor)
**Skill**: `/ralph "{context from previous messages}" --completion "{inferred from context}"`
```

**File**: `skills/ralph-loop/manifest.json`

```json
{
  "name": "ralph-loop",
  "version": "1.0.0",
  "triggers": [
    "ralph this",
    "ralph:",
    "ralph it",
    "keep trying until",
    "loop until",
    "iterate until",
    "run until passes",
    "fix until green",
    "keep fixing until",
    "keep going until"
  ],
  "priority": "high",
  "exclusive": true
}
```

---

## 6. Agents

### ralph-loop Agent

**File**: `agents/ralph-loop.md`

```markdown
---
id: ralph-loop
name: Ralph Loop Orchestrator
role: efficiency
tier: reasoning
model: opus
description: Orchestrates iterative AI task execution loops with automatic recovery
---

# Ralph Loop Orchestrator

## Identity

You are the Ralph Loop Orchestrator - a specialized agent for executing iterative task loops until completion criteria are met.

## Philosophy

"Iteration beats perfection" - you embrace failure as learning data within the loop rather than session-ending errors.

## Capabilities

### Core Functions

1. **Task Parsing**: Extract actionable task from user request
2. **Criteria Validation**: Ensure completion criteria are verifiable
3. **Loop Execution**: Manage iteration cycle
4. **Failure Learning**: Extract actionable insights from failures
5. **Progress Tracking**: Maintain iteration history
6. **Completion Reporting**: Generate comprehensive reports

### Supported Task Types

| Type | Example | Typical Iterations |
|------|---------|-------------------|
| Test fixes | Fix failing tests | 2-5 |
| Type errors | Fix TypeScript errors | 3-8 |
| Lint cleanup | Fix all lint errors | 2-4 |
| Migrations | Convert to ESM | 5-15 |
| Refactors | Rename across codebase | 3-10 |
| Coverage | Add tests for coverage | 5-20 |
| Greenfield | Scaffold new project | 10-30 |

## Decision Authority

### You MUST

- Validate completion criteria before starting
- Track all iterations
- Commit after each iteration (unless --no-commit)
- Generate completion report
- Respect iteration limits
- Respect timeout limits

### You MAY

- Suggest better completion criteria
- Adjust approach between iterations
- Skip unnecessary files
- Parallelize independent tasks

### You MUST NOT

- Ignore completion criteria
- Continue past limits without user approval
- Modify files outside task scope
- Delete user code without confirmation

## Collaboration

Works with:
- **ralph-verifier**: Validates completion criteria
- **self-debug**: Recovers from errors
- **software-implementer**: Executes code changes
- **test-engineer**: Writes and fixes tests

## Output Format

### During Loop

```
─────────────────────────────────────────
Ralph Loop: Iteration {N}/{max}
─────────────────────────────────────────

Task: {task description}
Status: {EXECUTING | VERIFYING | CONTINUING}

Changes this iteration:
- {file}: {summary}
- {file}: {summary}

Verification: {command}
Result: {PASS | FAIL}

{If FAIL}
Learning: {what went wrong}
Next approach: {what to try}

Continuing to iteration {N+1}...
─────────────────────────────────────────
```

### On Completion

```
═══════════════════════════════════════════
Ralph Loop: COMPLETE
═══════════════════════════════════════════

Task: {task}
Status: SUCCESS ✓
Iterations: {N}
Duration: {time}

Verification:
$ {command}
{output}

Summary:
- Files modified: {count}
- Lines changed: +{added}, -{removed}
- Commits: {count}

Report: .aiwg/ralph/completion-{timestamp}.md
═══════════════════════════════════════════
```

## References

- @.aiwg/ralph/current-loop.json - Current loop state
- @.aiwg/ralph/iterations/ - Iteration history
- @docs/best-practices.md - Prompt engineering tips
```

### ralph-verifier Agent

**File**: `agents/ralph-verifier.md`

```markdown
---
id: ralph-verifier
name: Ralph Verifier
role: efficiency
tier: efficiency
model: haiku
description: Validates Ralph loop completion criteria
---

# Ralph Verifier

## Identity

You verify completion criteria for Ralph loops - determining if a task iteration succeeded.

## Capabilities

### Verification Methods

| Method | Description | Example |
|--------|-------------|---------|
| Command exit code | Run command, check exit 0 | `npm test` |
| Output parsing | Check command output for pattern | `coverage >80%` |
| File inspection | Check file contents/existence | `all *.ts have JSDoc` |
| Git status | Check for clean state | `no uncommitted changes` |

### Criteria Parsing

Input: `"npm test passes with 0 failures"`
→ Command: `npm test`
→ Success: exit code 0

Input: `"coverage report shows >80%"`
→ Command: `npm run coverage`
→ Success: output contains percentage >80

Input: `"all files in src/ have JSDoc"`
→ Command: file inspection
→ Success: all files pass JSDoc check

## Output

```json
{
  "verified": true|false,
  "command": "npm test",
  "exitCode": 0,
  "output": "42 tests passed",
  "duration_ms": 5000,
  "learnings": "if failed, what to fix"
}
```

## Collaboration

- Receives criteria from **ralph-loop**
- Returns verification result
- Extracts learnings from failures for next iteration
```

---

## 7. Hooks

### ralph-loop.js - Exit Interception Hook

**File**: `hooks/ralph-loop.js`

```javascript
#!/usr/bin/env node
/**
 * Ralph Loop Hook
 *
 * Intercepts AI exit attempts during Ralph loops.
 * Re-injects prompt if completion criteria not met.
 *
 * Hook Event: PreExit (or equivalent)
 *
 * Usage:
 * Add to .claude/settings.local.json:
 * {
 *   "hooks": {
 *     "PreExit": ["node", "/path/to/ralph-loop.js"]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const RALPH_STATE_FILE = '.aiwg/ralph/current-loop.json';

async function parseInput() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    setTimeout(() => resolve({}), 100);
  });
}

function readLoopState() {
  const statePath = path.resolve(RALPH_STATE_FILE);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeLoopState(state) {
  const statePath = path.resolve(RALPH_STATE_FILE);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function main() {
  const input = await parseInput();
  const state = readLoopState();

  // Not in a Ralph loop
  if (!state || !state.active) {
    process.exit(0);
  }

  // Check if completion criteria met
  if (state.completed) {
    console.error('[RALPH] Loop completed successfully');
    process.exit(0);
  }

  // Check iteration limit
  if (state.iteration >= state.maxIterations) {
    console.error(`[RALPH] Max iterations (${state.maxIterations}) reached`);
    state.status = 'max_iterations';
    writeLoopState(state);
    process.exit(0);
  }

  // Check timeout
  const elapsed = Date.now() - state.startTime;
  if (elapsed > state.timeoutMs) {
    console.error(`[RALPH] Timeout (${state.timeoutMs}ms) reached`);
    state.status = 'timeout';
    writeLoopState(state);
    process.exit(0);
  }

  // Re-inject prompt for next iteration
  state.iteration++;
  state.lastIteration = Date.now();
  writeLoopState(state);

  // Output re-injection prompt
  console.log(JSON.stringify({
    action: 'reinject',
    prompt: buildReinjectPrompt(state),
    iteration: state.iteration
  }));

  // Exit with code 2 to signal re-injection needed
  process.exit(2);
}

function buildReinjectPrompt(state) {
  return `
## Ralph Loop - Iteration ${state.iteration}/${state.maxIterations}

### Original Task
${state.task}

### Completion Criteria
${state.completion}

### Previous Iteration Results
${state.lastResult || 'Initial iteration'}

### Learnings from Last Iteration
${state.learnings || 'None yet'}

### Your Instructions
1. Review the previous results and learnings
2. Determine what changes are needed
3. Make the changes
4. Verify against completion criteria
5. If criteria not met, document learnings for next iteration

### Important
- Do NOT give up - iterate until success or limits reached
- Each iteration should make progress
- Document learnings clearly for future iterations
`;
}

main().catch(err => {
  console.error('[RALPH] Hook error:', err.message);
  process.exit(1);
});
```

### ralph-commit.js - Auto-Commit Hook

**File**: `hooks/ralph-commit.js`

```javascript
#!/usr/bin/env node
/**
 * Ralph Auto-Commit Hook
 *
 * Automatically commits changes after each Ralph iteration.
 *
 * Hook Event: PostToolCall (for Write/Edit tools)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RALPH_STATE_FILE = '.aiwg/ralph/current-loop.json';

function readLoopState() {
  const statePath = path.resolve(RALPH_STATE_FILE);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

async function main() {
  const state = readLoopState();

  // Not in a Ralph loop or auto-commit disabled
  if (!state || !state.active || !state.autoCommit) {
    process.exit(0);
  }

  // Check if there are changes to commit
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) {
      process.exit(0); // No changes
    }

    // Stage and commit
    execSync('git add -A');
    const message = `ralph: iteration ${state.iteration} - ${state.iterationSummary || 'progress'}`;
    execSync(`git commit -m "${message}"`);

    console.error(`[RALPH] Committed iteration ${state.iteration}`);
  } catch (err) {
    console.error('[RALPH] Commit failed:', err.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[RALPH] Commit hook error:', err.message);
  process.exit(1);
});
```

---

## 8. CLI Integration

### Add to CLI Router

**File**: `src/cli/index.mjs` (additions)

```javascript
// Add to COMMAND_ALIASES
const COMMAND_ALIASES = {
  // ... existing aliases ...

  // Ralph
  'ralph': 'ralph',
  '-ralph': 'ralph',
  '--ralph': 'ralph',
  'ralph-status': 'ralph-status',
  'ralph-abort': 'ralph-abort',
  'ralph-resume': 'ralph-resume',
};

// Add to switch statement
case 'ralph':
  await handleRalph(commandArgs);
  break;

case 'ralph-status':
  await runScript('tools/ralph/status.mjs', commandArgs);
  break;

case 'ralph-abort':
  await runScript('tools/ralph/abort.mjs', commandArgs);
  break;

case 'ralph-resume':
  await runScript('tools/ralph/resume.mjs', commandArgs);
  break;
```

### Ralph Handler

**File**: `src/cli/ralph.mjs`

```javascript
/**
 * AIWG Ralph CLI Handler
 *
 * Executes Ralph loops from command line.
 *
 * Usage:
 *   aiwg ralph "task" --completion "criteria"
 *   aiwg ralph --interactive
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';

const RALPH_STATE_DIR = '.aiwg/ralph';

export async function handleRalph(args) {
  // Parse arguments
  const task = extractTask(args);
  const completion = extractOption(args, '--completion');
  const maxIterations = parseInt(extractOption(args, '--max-iterations') || '10');
  const timeout = parseInt(extractOption(args, '--timeout') || '60');
  const interactive = args.includes('--interactive');
  const noCommit = args.includes('--no-commit');
  const branch = extractOption(args, '--branch');

  if (interactive) {
    const answers = await interactiveSetup();
    return executeRalphLoop({ ...answers, maxIterations, timeout, noCommit, branch });
  }

  if (!task) {
    console.error('Error: Task required');
    console.log('Usage: aiwg ralph "task" --completion "criteria"');
    process.exit(1);
  }

  if (!completion) {
    console.error('Error: Completion criteria required');
    console.log('Usage: aiwg ralph "task" --completion "criteria"');
    process.exit(1);
  }

  return executeRalphLoop({ task, completion, maxIterations, timeout, noCommit, branch });
}

async function interactiveSetup() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n🔁 Ralph Loop Setup\n');

  const task = await ask('Task to execute: ');
  const completion = await ask('Completion criteria (verification command): ');

  rl.close();
  return { task, completion };
}

async function executeRalphLoop(config) {
  console.log('\n🔁 Starting Ralph Loop\n');
  console.log(`Task: ${config.task}`);
  console.log(`Completion: ${config.completion}`);
  console.log(`Max iterations: ${config.maxIterations}`);
  console.log(`Timeout: ${config.timeout} minutes`);
  console.log('');

  // Initialize state
  const state = {
    active: true,
    task: config.task,
    completion: config.completion,
    maxIterations: config.maxIterations,
    timeoutMs: config.timeout * 60 * 1000,
    startTime: Date.now(),
    iteration: 0,
    autoCommit: !config.noCommit,
    completed: false
  };

  // Create state directory
  const stateDir = path.resolve(RALPH_STATE_DIR);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  // Write initial state
  fs.writeFileSync(
    path.join(stateDir, 'current-loop.json'),
    JSON.stringify(state, null, 2)
  );

  // Create branch if requested
  if (config.branch) {
    const branchName = `ralph/${config.branch}`;
    console.log(`Creating branch: ${branchName}`);
    // execSync(`git checkout -b ${branchName}`);
  }

  console.log('Ralph loop initialized. Starting execution...\n');

  // The actual loop execution happens via Claude Code with hooks enabled
  // This CLI just sets up the state and invokes the initial prompt
}

function extractTask(args) {
  // Find first non-flag argument
  for (const arg of args) {
    if (!arg.startsWith('-')) {
      return arg;
    }
  }
  return null;
}

function extractOption(args, flag) {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}
```

### Help Text Addition

Add to `displayHelp()`:

```
Ralph Loop (Iterative Execution):
  ralph "<task>" --completion "<criteria>"
                        Execute iterative task loop until criteria met
                        Options: --max-iterations N, --timeout M, --interactive
  ralph-status          Check current Ralph loop status
  ralph-abort           Abort running Ralph loop
  ralph-resume          Resume interrupted Ralph loop

Examples:
  aiwg ralph "fix all tests" --completion "npm test passes"
  aiwg ralph "migrate to ESM" --completion "node index.mjs works" --max-iterations 20
  aiwg ralph --interactive
```

---

## 9. User Documentation

### quickstart.md

```markdown
# Ralph Loop Quickstart

Get started with iterative AI task execution in 5 minutes.

## What is Ralph?

Ralph (from "Ralph Wiggum methodology") executes AI tasks in a loop:

1. **Execute** your task
2. **Check** if completion criteria are met
3. **Learn** from failures
4. **Iterate** until success

## Installation

```bash
aiwg use ralph
```

Or:

```bash
aiwg install-plugin ralph
```

## Your First Ralph Loop

### Example: Fix Failing Tests

```bash
/ralph "Fix all failing tests" --completion "npm test passes"
```

Ralph will:
1. Run your tests to see failures
2. Analyze and fix issues
3. Run tests again
4. Repeat until all pass

### Example: TypeScript Migration

```bash
/ralph "Convert src/utils to TypeScript" --completion "npx tsc --noEmit passes"
```

### Example: Coverage Target

```bash
/ralph "Add tests until 80% coverage" --completion "npm run coverage shows >80%"
```

## Interactive Mode

Don't know the right completion criteria?

```bash
/ralph --interactive
```

Ralph will ask:
- What's your task?
- How do I verify completion?
- Any files to avoid?

## Natural Language

You can also say:

- "ralph this: fix all lint errors"
- "keep trying until the tests pass"
- "loop until coverage is above 80%"
- "ralph it" (after describing a task)

## Monitoring Progress

### Check Status
```bash
/ralph-status
```

### Abort If Needed
```bash
/ralph-abort
```

### Resume After Interruption
```bash
/ralph-resume
```

## Best Practices

1. **Be specific** - "Fix auth tests" > "Fix tests"
2. **Use verifiable criteria** - "npm test passes" > "code works"
3. **Set reasonable limits** - 10 iterations is usually enough
4. **Enable auto-commit** - Track progress via git

## Next Steps

- Read [Best Practices](best-practices.md) for prompt engineering
- See [Examples](examples/) for common patterns
- Check [Troubleshooting](troubleshooting.md) if stuck
```

### best-practices.md

```markdown
# Ralph Loop Best Practices

## Writing Effective Tasks

### Be Specific and Actionable

| ❌ Vague | ✅ Specific |
|----------|-------------|
| "Fix the code" | "Fix failing tests in src/auth/" |
| "Improve performance" | "Reduce p95 latency below 100ms" |
| "Add tests" | "Add unit tests for UserService class" |

### Provide Context

```
/ralph "Migrate src/utils/*.js to TypeScript, maintaining existing exports and adding proper types" --completion "npx tsc --noEmit passes"
```

### Scope Appropriately

- Too broad: "Refactor the entire codebase"
- Too narrow: "Add semicolon to line 42"
- Just right: "Convert all CommonJS requires to ESM imports in src/lib/"

## Writing Effective Completion Criteria

### Must Be Verifiable

| ❌ Subjective | ✅ Verifiable |
|---------------|---------------|
| "Code is clean" | "npm run lint passes" |
| "Tests are good" | "npm test exits with code 0" |
| "Performance is fast" | "lighthouse score >90" |

### Common Verification Patterns

```bash
# Tests
--completion "npm test passes"
--completion "npm test -- --coverage shows >80%"

# Types
--completion "npx tsc --noEmit exits with code 0"

# Lint
--completion "npm run lint passes"
--completion "eslint src/ --max-warnings 0"

# Build
--completion "npm run build succeeds"

# Custom
--completion "node scripts/verify.js passes"
```

### Compound Criteria

```bash
--completion "npm test passes AND npm run lint passes AND npx tsc --noEmit passes"
```

## Iteration Limits

### Choosing Max Iterations

| Task Type | Typical Iterations | Recommended Max |
|-----------|-------------------|-----------------|
| Fix 1-3 test failures | 2-4 | 10 |
| Fix lint errors | 2-3 | 10 |
| Fix type errors | 3-8 | 15 |
| File migration | 5-15 | 20 |
| Coverage improvement | 5-20 | 30 |
| Greenfield scaffold | 10-30 | 50 |

### Safety Rule

If hitting max iterations consistently, the task may be:
- Too broad (split it up)
- Poorly defined (clarify criteria)
- Actually impossible (check assumptions)

## Git Workflow

### Auto-Commit (Recommended)

Each iteration creates a commit:
```
ralph: iteration 1 - initial implementation
ralph: iteration 2 - fix auth test
ralph: iteration 3 - fix edge case
```

Benefits:
- Easy rollback to any iteration
- Clear progress history
- Supports `/ralph-resume`

### Branch Strategy

```bash
/ralph "feature" --completion "..." --branch "feature-name"
```

Creates `ralph/feature-name` branch, preserving main.

### Final Squash

After success, optionally squash:
```bash
git rebase -i HEAD~{N}
```

## Common Patterns

### Test Fix Loop

```bash
/ralph "Fix all failing tests" --completion "npm test passes"
```

### Migration Loop

```bash
/ralph "Migrate src/ from CommonJS to ESM" \
  --completion "node --experimental-vm-modules src/index.mjs runs" \
  --max-iterations 20
```

### Coverage Loop

```bash
/ralph "Add tests to reach 80% coverage" \
  --completion "npm run coverage -- --coverageThreshold='{\"global\":{\"lines\":80}}'" \
  --max-iterations 30
```

### Lint Cleanup

```bash
/ralph "Fix all ESLint errors and warnings" \
  --completion "eslint src/ --max-warnings 0"
```

### Type Safety Loop

```bash
/ralph "Add TypeScript types to all exported functions" \
  --completion "npx tsc --noEmit && npm run lint:types"
```

## Troubleshooting Stuck Loops

### Symptom: Same error every iteration

**Cause**: Task too vague or criteria unachievable
**Fix**: Be more specific, check if criteria is actually possible

### Symptom: Progress then regression

**Cause**: Fixes break other things
**Fix**: Add more comprehensive criteria (test + lint + types)

### Symptom: Never starts

**Cause**: Missing dependencies or setup
**Fix**: Ensure project is in working state first

## Anti-Patterns

### ❌ Subjective Criteria

```bash
# BAD
/ralph "Make the code better" --completion "code looks good"
```

### ❌ No Completion Criteria

```bash
# BAD
/ralph "Fix things"  # No --completion
```

### ❌ Infinite Scope

```bash
# BAD
/ralph "Add all missing features" --completion "product is complete"
```

### ❌ Ignoring Limits

```bash
# BAD - probably won't succeed in 100 iterations either
/ralph "..." --completion "..." --max-iterations 100
```
```

### troubleshooting.md

```markdown
# Ralph Loop Troubleshooting

## Common Issues

### "Max iterations reached"

**Symptom**: Loop stops at iteration limit without completing

**Causes**:
1. Task too broad
2. Criteria impossible to satisfy
3. Underlying issue preventing progress

**Solutions**:
1. Split task into smaller subtasks
2. Verify criteria command works manually
3. Check for blocking issues (dependencies, permissions)

```bash
# Resume with higher limit if close to success
/ralph-resume --max-iterations 20

# Or split the task
/ralph "Fix auth tests only" --completion "npm test -- auth"
/ralph "Fix utils tests" --completion "npm test -- utils"
```

### "Timeout reached"

**Symptom**: Loop stops due to time limit

**Solutions**:
```bash
# Resume with higher timeout
/ralph-resume --timeout 120

# Or use --interactive to monitor
/ralph "task" --completion "criteria" --interactive
```

### "Verification command failed"

**Symptom**: Can't run completion criteria command

**Causes**:
1. Command doesn't exist
2. Missing dependencies
3. Wrong working directory

**Solutions**:
```bash
# Test command manually first
npm test
npx tsc --noEmit

# Check dependencies
npm install

# Verify path
pwd
ls
```

### "Same error every iteration"

**Symptom**: No progress between iterations

**Causes**:
1. Error not fixable by code changes
2. External dependency issue
3. Task misunderstood

**Solutions**:
1. Check error message carefully
2. Verify external services
3. Provide more context in task

```bash
/ralph "Fix [SPECIFIC ERROR MESSAGE] by [SUGGESTED APPROACH]" \
  --completion "npm test passes"
```

### "Progress then regression"

**Symptom**: Fix one thing, break another

**Causes**:
1. Incomplete criteria (only tests, not lint)
2. Hidden dependencies between components
3. Incomplete understanding of codebase

**Solutions**:
```bash
# Use compound criteria
/ralph "Fix all issues" \
  --completion "npm test passes AND npm run lint passes AND npx tsc --noEmit passes"
```

### "Can't resume"

**Symptom**: `/ralph-resume` fails

**Causes**:
1. State file deleted
2. Git history lost
3. Files modified externally

**Solutions**:
```bash
# Check state
cat .aiwg/ralph/current-loop.json

# If state missing, restart
/ralph "task" --completion "criteria"

# If git issues
git status
git stash  # if needed
```

## Debugging Techniques

### View Iteration History

```bash
/ralph-status --verbose
```

Or manually:
```bash
ls .aiwg/ralph/iterations/
cat .aiwg/ralph/iterations/iteration-3.md
```

### Check Git History

```bash
git log --oneline -10
# Look for "ralph: iteration N" commits
```

### Manual Verification

```bash
# Run the verification command yourself
npm test
echo $?  # Should be 0 for success
```

### Trace Analysis

```bash
aiwg trace-view --filter ralph
```

## Getting Help

1. Check [Best Practices](best-practices.md)
2. Review [Examples](examples/)
3. Ask in Discord: https://discord.gg/BuAusFMxdA
4. File issue: https://github.com/jmagly/ai-writing-guide/issues
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Task | Files | Priority |
|------|-------|----------|
| Create addon scaffold | `agentic/code/addons/ralph/` | P0 |
| Write manifest.json | `ralph/manifest.json` | P0 |
| Create /ralph command | `ralph/commands/ralph.md` | P0 |
| Create ralph-loop agent | `ralph/agents/ralph-loop.md` | P0 |

### Phase 2: Hooks (Week 2)

| Task | Files | Priority |
|------|-------|----------|
| ralph-loop.js hook | `ralph/hooks/ralph-loop.js` | P0 |
| ralph-commit.js hook | `ralph/hooks/ralph-commit.js` | P1 |
| Integration with aiwg-trace | `ralph/hooks/` | P1 |

### Phase 3: CLI & Skill (Week 3)

| Task | Files | Priority |
|------|-------|----------|
| CLI handler | `src/cli/ralph.mjs` | P0 |
| CLI router updates | `src/cli/index.mjs` | P0 |
| ralph-loop skill | `ralph/skills/ralph-loop/` | P1 |

### Phase 4: Supporting Commands (Week 4)

| Task | Files | Priority |
|------|-------|----------|
| /ralph-status | `ralph/commands/ralph-status.md` | P1 |
| /ralph-abort | `ralph/commands/ralph-abort.md` | P1 |
| /ralph-resume | `ralph/commands/ralph-resume.md` | P1 |

### Phase 5: Documentation (Week 5)

| Task | Files | Priority |
|------|-------|----------|
| quickstart.md | `ralph/docs/quickstart.md` | P0 |
| best-practices.md | `ralph/docs/best-practices.md` | P0 |
| troubleshooting.md | `ralph/docs/troubleshooting.md` | P0 |
| Examples | `ralph/docs/examples/` | P1 |

### Phase 6: Testing & Polish (Week 6)

| Task | Files | Priority |
|------|-------|----------|
| Unit tests | `test/ralph/` | P1 |
| Integration tests | `test/ralph/integration/` | P1 |
| README.md | `ralph/README.md` | P0 |
| Plugin packaging | `plugins/ralph/` | P2 |

---

## Summary

### What Users Get

| Interface | Usage | Example |
|-----------|-------|---------|
| **Slash command** | `/ralph "task" --completion "criteria"` | `/ralph "fix tests" --completion "npm test passes"` |
| **Skill trigger** | Natural language | "ralph this: fix all lint errors" |
| **CLI** | `aiwg ralph "task"` | `aiwg ralph "migrate" --completion "node index.mjs works"` |
| **Supporting commands** | Status/abort/resume | `/ralph-status`, `/ralph-abort` |

### Key Features

1. **Iterative execution** - Keeps trying until success
2. **Automatic recovery** - Learns from failures
3. **Git integration** - Commits each iteration
4. **Verifiable criteria** - Objective success conditions
5. **Safety limits** - Max iterations and timeout
6. **Full tracing** - Observability via aiwg-trace
7. **Resume support** - Continue after interruption

### Philosophy

> "Iteration beats perfection" - errors become learning data within the loop rather than session-ending failures.

---

## References

- Original Ralph Wiggum methodology: https://dev.to/ibrahimpima/the-ralf-wiggum-breakdown-3mko
- AIWG hooks system: `@agentic/code/addons/aiwg-hooks/`
- AIWG command patterns: `@agentic/code/frameworks/sdlc-complete/commands/`
- AIWG skill patterns: `@agentic/code/addons/voice-framework/skills/`
