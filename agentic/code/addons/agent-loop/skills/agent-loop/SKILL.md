---
namespace: aiwg
name: agent-loop
description: Detect requests for iterative autonomous agent loops and route to the appropriate loop executor
version: 3.1.0
platforms: [all]

---

<!-- AIWG-SKILL-CALLOUT -->
> **Skill access pattern (post-kernel-pivot, 2026.5+)**
>
> Skill names referenced in this document are AIWG skills, **not slash commands**. Most are not kernel-listed and cannot be invoked as `/skill-name` by the platform. Reach them via:
>
> ```bash
> aiwg discover "<capability>"
> aiwg show skill <name>
> ```
>
> Only kernel-listed skills (`aiwg-doctor`, `aiwg-refresh`, `aiwg-status`, `aiwg-help`, `use`, `steward`) are directly invokable as slash commands. See [skill-discovery rule](../../../addons/aiwg-utils/rules/skill-discovery.md).


# Agent Loop Skill

You detect when users want iterative autonomous task execution and route to an internal, in-session loop by default. External daemon loops are opt-in and require an explicit request.

## Loop Taxonomy

This skill is the **detection and routing layer** for autonomous agent loops — iterative patterns where a single agent retries a task against completion criteria until success or limits.

| Loop Type | Implementation | Description |
|-----------|---------------|-------------|
| **Internal Agent Loop** | current assistant session / internal loop | Default visible iterate-until-complete workflow in the active session |
| **Al** | internal `ralph` concept | Basic iterate-until-complete when named without external qualifiers |
| **External Agent Loop** | `agent-loop-ext` / `ralph-external` daemon | Explicitly requested background, detached, crash-resilient, or resumable work |
| *(future)* | — | Reflection loops, critic-actor loops, branching loops |

Generic loop requests route to the internal in-session loop. As new loop types are added, this skill will route based on task characteristics.

## Routing Policy

### Default: Internal/In-Session Loop

Use the internal loop when the user says `agent-loop`, `al`, `ralph`, `loop`, `iterate`, `keep trying`, `fix until green`, `address issues`, `handle all listed issues`, or supplies an iteration bound such as `--iterations 200` without explicit external wording.

Run the work visibly in the current assistant session:

1. Establish completion criteria.
2. Act on the next bounded slice of work.
3. Verify with the relevant checks.
4. Adapt and continue until completion, blocker, or the requested iteration cap.

Do not launch detached processes, background sessions, or the Ralph external daemon for generic loop requests.

### Explicit External Route

Route to `agent-loop-ext` / `ralph-external` only when the user explicitly asks for external execution, background execution, a daemon, detached operation, crash resilience, session survival, resume-later behavior, unattended long-running work, or when they name `agent-loop-ext`, `ralph-external`, or the Ralph daemon directly.

If the user says `ralph` without external/background/daemon qualifiers, treat it as the internal loop concept.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "ralph this: [task]" → iterative loop with extracted task
- "ralph it" (after describing work in conversation) → loop using conversation context
- "keep trying until [condition]" → loop with completion condition
- "fix until green" → test-fixing loop shorthand
- "loop until [condition]" → condition-based iteration
- "al: [task]" → shortcut for agent-loop invocation

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| `ralph this: X` | "ralph this: fix all lint errors" | Internal loop: extract task, infer completion |
| `ralph: X` | "ralph: migrate to TypeScript" | Internal loop: extract task, infer completion |
| `ralph it` | "ralph it" (after task description) | Internal loop: use conversation context |
| `keep trying until X` | "keep trying until tests pass" | Internal loop: task = current context, completion = X |
| `loop until X` | "loop until coverage >80%" | Internal loop: task = improve coverage, completion = X |
| `iterate until X` | "iterate until no errors" | Internal loop: task = fix errors, completion = X |
| `run until passes` | "run until passes" | Internal loop: infer test command |
| `fix until green` | "fix until green" | Internal loop: task = fix tests, completion = tests pass |
| `keep fixing until X` | "keep fixing until lint is clean" | Internal loop: task = fix lint, completion = X |
| `al: X` | "al: fix all lint errors" | Internal loop shortcut: extract task |

## Extraction Logic

### Task Extraction

**From explicit task**:
- "ralph this: fix all TypeScript errors" → Task: "fix all TypeScript errors"
- "ralph: migrate src/ to ESM" → Task: "migrate src/ to ESM"

**From context**:
- "ralph it" after discussing a refactor → Use previous conversation as task context

### Completion Inference

When the user doesn't specify explicit verification, delegate to the **`infer-completion-criteria`** skill (`@$AIWG_ROOT/agentic/code/addons/agent-loop/skills/infer-completion-criteria/SKILL.md`). That skill runs a deterministic 5-layer pipeline:

1. **Task verb** → criterion class (test-pass, type-clean, regression-gate, coverage, lint-clean, build-pass, implement-feature)
2. **Project context files** (CLAUDE.md / AGENTS.md / AIWG.md) → canonical commands from the Development section
3. **Package manifests** (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, etc.) → discovered scripts
4. **CI configuration** (`.github/workflows/`, `.gitea/workflows/`, GitLab/CircleCI/Jenkins) → team's actual "passes" definition
5. **`.aiwg/` artifacts** (test-strategy, related use cases by ID match, prior progress files) → project-specific gates

Synthesis is validated against the `vague-discretion` rule and emits a structured YAML proposal with criterion, verification command, rationale chain, confidence level, and alternatives considered.

**Use the inline table below ONLY as a last-resort fallback** when the inference skill is unavailable (degraded environment, missing skill deployment). It is intentionally narrow — JavaScript/Node-centric — and represents prior state before `infer-completion-criteria` was added.

Legacy fallback table:

| Task Pattern | Inferred Completion |
|--------------|---------------------|
| "fix tests" | "npm test passes" |
| "fix lint" / "fix linting" | "npm run lint passes" |
| "fix types" / "fix TypeScript" | "npx tsc --noEmit passes" |
| "fix build" | "npm run build succeeds" |
| "add tests" | "test coverage increases" |
| "migrate to ESM" | "node runs without errors" |
| "refactor X" | "npm test passes" (preserve behavior) |

When the inference skill IS available, prefer it. The skill handles multi-language projects, monorepos, CI-defined gates, use-case acceptance criteria, and the refusal case (truly vague tasks like "make it better" that have no measurable criterion).

### Examples

**User**: "ralph this: migrate all files in lib/ to ESM"
**Extraction**:
- Task: "migrate all files in lib/ to ESM"
- Completion (inferred): "node --experimental-vm-modules lib/index.js runs without errors"

**Action**: Run an internal loop in the current session for `migrate all files in lib/ to ESM` until the inferred completion command succeeds

---

**User**: "keep fixing until the tests are green"
**Extraction**:
- Task: "fix failing tests" (from context or implied)
- Completion: "npm test passes with 0 failures"

**Action**: Run an internal loop in the current session until `npm test` passes

---

**User**: "ralph it" (after discussing adding auth validation)
**Extraction**:
- Task: (from conversation context about auth validation)
- Completion: (infer based on task type)

**Action**: Run an internal loop in the current session using the context-based task and inferred criteria

---

**User**: "loop until coverage is above 80%"
**Extraction**:
- Task: "add tests to improve coverage"
- Completion: "npm run coverage shows >80%"

**Action**: Run an internal loop in the current session until the coverage report shows more than 80%

---

**User**: "Run this in the background with crash recovery and let me attach later"
**Extraction**:
- Task: (from conversation context)
- Completion: (infer based on task type)

**Action**: Route to `agent-loop-ext` / `ralph-external` because the user explicitly requested background crash-resilient execution

## Clarification Prompts

If extraction is ambiguous, ask the user:

```
I'll start an iterative loop for: {extracted task}

What command verifies completion?
1. npm test (Recommended for test fixes)
2. npx tsc --noEmit (For type errors)
3. npm run lint (For lint errors)
4. npm run build (For build issues)
5. Custom command...
```

Or if task is unclear:

```
I detected an iterative loop request. To start iterating:

What task should I repeat until success?
What command tells me when it's done?
```

## External/Multi-Loop Support

**Version 2.0** added concurrent loop execution with registry tracking. This applies to explicit external daemon loops, not ordinary internal `agent-loop` requests.

### Concurrency Limits

- **MAX_CONCURRENT_LOOPS**: 4 (per REF-086)
- **Research basis**: 17.2x error trap beyond 4 concurrent agents
- **Communication overhead**: n*(n-1)/2 paths = 6 at max capacity

### Loop ID Format

All loops have unique identifiers:
- Pattern: `ralph-{slug}-{uuid8}`
- Example: `ralph-fix-tests-a1b2c3d4`

### --loop-id Parameter

Users can optionally specify a loop ID for external daemon loops:

```
/ralph "fix tests" --completion "npm test passes" --loop-id ralph-my-fixes-12345678
```

If not provided, ID is auto-generated from task description.

### Registry Tracking

External active loops are tracked in `.aiwg/ralph/registry.json`:

```json
{
  "version": "2.0.0",
  "max_concurrent_loops": 4,
  "active_loops": [
    {
      "loop_id": "ralph-fix-tests-a1b2c3d4",
      "status": "running",
      "iteration": 5,
      "task": "fix all TypeScript errors",
      "started_at": "2026-02-02T21:00:00Z",
      "pid": 12345
    }
  ]
}
```

### Concurrent Loop Behavior

**When starting a new external loop**:

1. Check registry: `active_loops.length < 4`
2. If at limit: Show error with active loop list
3. If space available: Register new loop and start

**User sees**:

```
Error: Maximum concurrent loops (4) reached

Active loops:
1. ralph-fix-tests-a1b2c3d4 (iteration 5) - fix TypeScript errors
2. ralph-add-docs-b2c3d4e5 (iteration 3) - add JSDoc comments
3. ralph-refactor-c3d4e5f6 (iteration 8) - refactor API module
4. ralph-migrate-d4e5f6a7 (iteration 2) - migrate to ESM

Abort one with: aiwg ralph-abort {loop_id}
```

### Loop Status Commands

**Check all active loops**:
```
aiwg ralph-status --all
```

**Check specific loop**:
```
aiwg ralph-status ralph-fix-tests-a1b2c3d4
```

**Abort a loop**:
```
aiwg ralph-abort ralph-fix-tests-a1b2c3d4
```

**Resume a paused loop**:
```
aiwg ralph-resume ralph-fix-tests-a1b2c3d4
```

### Directory Structure

Multi-loop structure per loop:

```
.aiwg/ralph/
├── registry.json                    # Multi-loop registry
└── loops/
    ├── ralph-fix-tests-a1b2c3d4/
    │   ├── state.json
    │   ├── checkpoints/
    │   │   ├── iteration-001.json.gz
    │   │   └── iteration-002.json.gz
    │   └── analytics/
    │       └── analytics.json
    └── ralph-add-docs-b2c3d4e5/
        ├── state.json
        └── ...
```

## Invocation

Once task and completion are extracted/confirmed, use the default internal route unless explicit external wording is present.

For the default internal route:

- **Task**: The extracted task description
- **Completion criteria**: The verification command or condition
- **Max iterations**: If user mentioned iteration limit
- **Timeout**: If user mentioned time limit
- **Operation**: Iterate in the current assistant session with visible progress and verification after meaningful changes

For explicit external daemon routes:

- **Task**: The extracted task description
- **Completion criteria**: The verification command or condition
- **Max iterations**: If user mentioned iteration limit
- **Timeout**: If user mentioned time limit
- **Loop ID**: If user wants a custom loop identifier
- **Operation**: Route through `agent-loop-ext` / `ralph-external`, then surface status, log, attach, and abort commands

### External Multi-Loop Examples

**Parallel bug fixes**:
```
User: "run an external ralph loop to fix TypeScript errors in src/"
→ Loop 1: ralph-fix-ts-errors-a1b2c3d4

User: "also run an external ralph loop to add missing tests in lib/"
→ Loop 2: ralph-add-tests-b2c3d4e5

Both running in parallel until completion criteria met.
```

**Sequential with manual abort**:
```
User: "run an external ralph loop to refactor the entire auth module"
→ Loop 1: ralph-refactor-auth-c3d4e5f6 (running)

User: "actually, abort that and just fix the login bug"
→ aiwg ralph-abort ralph-refactor-auth-c3d4e5f6
→ Loop 2: ralph-fix-login-d4e5f6a7 (running)
```

## Integration Notes

- This skill has **high priority** - iterative loop phrases should route here
- The skill is **exclusive** - once triggered, handle the entire request
- Always confirm extraction before invoking if there's ambiguity
- Prefer inferring completion criteria over asking (ask only if truly unclear)
- Default ambiguous requests to the internal in-session loop
- Do not start `ralph-external`, detached daemons, or background `aiwg ralph` processes unless the user explicitly asks for them
- Check registry capacity before starting explicit external loops
- Show helpful errors with active loop list when explicit external loops are at capacity

## Related

- `infer-completion-criteria` skill - derives measurable `--completion` from project state when the user doesn't supply one
- `ralph` skill - legacy name for the iterative loop concept; `agent-loop` is canonical and defaults to in-session execution
- `agent-loop-ext` skill - crash-resilient external loop with state persistence
- `ralph-status` skill - check loop progress
- `ralph-resume` skill - continue interrupted loops
- `ralph-abort` skill - abort active loops
- `@$AIWG_ROOT/agentic/code/addons/ralph/schemas/loop-registry.yaml` - Registry schema
- `@$AIWG_ROOT/agentic/code/addons/ralph/schemas/loop-state.yaml` - Loop state schema
- `@.aiwg/research/findings/REF-086-cognitive-load-limits.md` - Concurrency research

## Version History

- **3.1.0**: Defaulted generic `agent-loop` routing to internal in-session loops; require explicit wording for external daemon loops
- **3.0.0**: Renamed from `ralph-loop` to `agent-loop`; added loop taxonomy (Issue #558)
- **2.0.0**: Added multi-loop support with registry tracking (Issue #268)
- **1.0.0**: Initial single-loop implementation

## References

- @$AIWG_ROOT/agentic/code/addons/ralph/README.md — Ralph addon overview and loop executor documentation
- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/loop-registry.yaml — Registry schema for multi-loop tracking
- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/loop-state.yaml — Loop state schema
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Loop termination and completion criteria rules
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for ralph commands
