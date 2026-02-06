# Task Management Integration Guide

**Issue:** #286
**Version:** 2026.2.0
**Status:** Active

## Overview

This guide documents how AIWG integrates task management with SDLC flow tracking. Task management provides an enhanced UX layer on top of `.aiwg/` state files, enabling better visibility and control without creating platform lock-in.

**Design principle:** Tasks are an enhancement, not a requirement. All workflows function identically with or without task management.

## Two-Layer Design

### Layer 1: `.aiwg/` State Files (Foundation)

The `.aiwg/` directory is the **source of truth** for all project state:

```
.aiwg/
├── flows/
│   ├── current-phase.txt          # Current SDLC phase
│   ├── phase-history.json         # Phase transition log
│   └── deliverables-status.json   # Artifact completion status
├── requirements/
│   └── UC-*.md                    # Requirements artifacts
├── architecture/
│   └── *.md                       # Architecture artifacts
└── planning/
    └── iteration-*.md             # Iteration plans
```

**Characteristics:**

- **Platform-agnostic** - Works everywhere (Claude Code, Cursor, CLI, vim, etc.)
- **File-based** - Easy to inspect, edit, version control
- **Machine-readable** - Agents parse and update state
- **Human-readable** - Developers can manually edit
- **Always present** - No optional dependency

### Layer 2: Task Management (Enhancement)

Task management (e.g., Claude Code Tasks) provides **UI enhancements**:

```
Tasks (Claude Code UI):
├── Phase: Elaboration
│   ├── ✓ Write SAD
│   ├── ⧗ Create ADRs (2/5)
│   └── ☐ Define test strategy
├── Phase: Construction
│   └── [Blocked by elaboration]
```

**Characteristics:**

- **Platform-specific** - Only available on supporting platforms
- **UI-focused** - Better visualization, progress tracking
- **Optional** - Workflows work without it
- **Synchronized** - Mirrors `.aiwg/` state
- **Bidirectional** - Updates flow both ways

**Key insight:** Tasks never contain information not also in `.aiwg/`. They are a view, not a data store.

## How It Works

### Synchronization Flow

```
┌─────────────────────────────────────────────────────┐
│ SDLC Flow Event                                     │
│ (e.g., phase transition, deliverable completed)    │
└──────────────┬──────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────┐
│ Update .aiwg/ State Files                           │
│ - current-phase.txt                                 │
│ - deliverables-status.json                          │
│ - phase-history.json                                │
└──────────────┬──────────────────────────────────────┘
               │
               ↓
         ┌─────┴──────┐
         │            │
    YES  │  Task      │  NO
    ←────┤  Support?  │────→
         │            │      (End - workflow continues)
         └─────┬──────┘
               │
               ↓
┌─────────────────────────────────────────────────────┐
│ Synchronize to Task Management                      │
│ - Create/update tasks                               │
│ - Set completion status                             │
│ - Update dependencies                               │
└──────────────┬──────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────┐
│ User Sees Task Update                               │
│ (Claude Code task panel, notifications)            │
└─────────────────────────────────────────────────────┘
```

**Reverse flow (user updates task):**

```
User updates task in UI
      ↓
Detect task state change
      ↓
Update .aiwg/ state files
      ↓
Trigger SDLC flow handlers
      ↓
Continue workflow
```

### State Consistency

**Invariant:** `.aiwg/` state is always canonical.

**Conflict resolution:**

| Scenario | Resolution |
|----------|------------|
| Task and `.aiwg/` match | No action |
| Task newer than `.aiwg/` | Update `.aiwg/`, trigger workflow |
| `.aiwg/` newer than task | Update task to match |
| Conflicting edits | `.aiwg/` wins, task updated |

**Consistency checks:**

```typescript
// Pseudo-code
function syncTasksFromState() {
  const phaseState = readFile('.aiwg/flows/current-phase.txt');
  const deliverables = readJSON('.aiwg/flows/deliverables-status.json');

  // Get or create task group for current phase
  const taskGroup = getOrCreateTaskGroup(phaseState);

  // Sync each deliverable to task
  for (const deliverable of deliverables) {
    const task = getOrCreateTask(taskGroup, deliverable.id);

    // Update task status from state
    if (task.status !== deliverable.status) {
      updateTask(task, {
        status: deliverable.status,
        progress: deliverable.progress,
        blockedBy: deliverable.blockedBy
      });
    }
  }
}
```

## Flow Integration Patterns

### Pattern 1: Phase Transition

**Scenario:** User transitions from Inception to Elaboration

**Without Tasks:**

```
User: "Transition to Elaboration"
      ↓
Agent reads .aiwg/flows/current-phase.txt
      ↓
Agent validates Inception deliverables complete
      ↓
Agent updates .aiwg/flows/current-phase.txt = "elaboration"
      ↓
Agent logs transition in .aiwg/flows/phase-history.json
      ↓
Agent responds: "Transitioned to Elaboration. Next deliverables: SAD, ADRs, Test Strategy"
```

**With Tasks:**

```
User: "Transition to Elaboration"
      ↓
Agent reads .aiwg/flows/current-phase.txt
      ↓
Agent validates Inception deliverables complete
      ↓
Agent updates .aiwg/flows/current-phase.txt = "elaboration"
      ↓
Agent logs transition in .aiwg/flows/phase-history.json
      ↓
Agent creates task group "Elaboration Phase"
      ↓
Agent creates tasks:
  - [ ] Write Software Architecture Document (SAD)
  - [ ] Create Architecture Decision Records (ADRs)
  - [ ] Define Test Strategy
  - [ ] Security Threat Model
      ↓
Agent responds: "Transitioned to Elaboration. See Tasks panel for deliverables."
```

**State files (identical in both):**

```json
// .aiwg/flows/deliverables-status.json
{
  "elaboration": {
    "sad": {
      "id": "sad",
      "title": "Software Architecture Document",
      "status": "not_started",
      "artifact_path": ".aiwg/architecture/software-architecture-doc.md",
      "created_at": "2026-02-06T10:30:00Z"
    },
    "adrs": {
      "id": "adrs",
      "title": "Architecture Decision Records",
      "status": "not_started",
      "artifact_count": 0,
      "target_count": 5,
      "artifact_path": ".aiwg/architecture/adr/",
      "created_at": "2026-02-06T10:30:00Z"
    }
  }
}
```

### Pattern 2: Deliverable Progress

**Scenario:** User creates first ADR

**Without Tasks:**

```
User: "Create ADR-001 for database selection"
      ↓
Agent creates .aiwg/architecture/adr/ADR-001-database-selection.md
      ↓
Agent updates .aiwg/flows/deliverables-status.json:
  adrs.artifact_count = 1
  adrs.progress = 0.20 (1/5)
      ↓
Agent responds: "Created ADR-001. Progress: 1/5 ADRs complete."
```

**With Tasks:**

```
User: "Create ADR-001 for database selection"
      ↓
Agent creates .aiwg/architecture/adr/ADR-001-database-selection.md
      ↓
Agent updates .aiwg/flows/deliverables-status.json:
  adrs.artifact_count = 1
  adrs.progress = 0.20 (1/5)
      ↓
Agent finds task "Create Architecture Decision Records"
      ↓
Agent updates task:
  status = "in_progress"
  progress = 20%
  description += "Created ADR-001"
      ↓
Agent responds: "Created ADR-001. Progress: 1/5 ADRs complete. (Task updated)"
```

**Task representation:**

```typescript
{
  id: "task-adrs",
  title: "Create Architecture Decision Records (ADRs)",
  status: "in_progress",
  progress: 20,
  metadata: {
    deliverable_id: "adrs",
    target_count: 5,
    current_count: 1,
    artifacts: [
      ".aiwg/architecture/adr/ADR-001-database-selection.md"
    ]
  }
}
```

### Pattern 3: Task Dependencies

**Scenario:** Construction phase blocked until Elaboration complete

**State representation:**

```json
// .aiwg/flows/deliverables-status.json
{
  "construction": {
    "implementation": {
      "id": "implementation",
      "status": "blocked",
      "blocked_by": ["elaboration.sad", "elaboration.adrs"],
      "blocked_reason": "Architecture must be approved before implementation"
    }
  }
}
```

**Task representation:**

```typescript
{
  id: "task-implementation",
  title: "Implement Core Features",
  status: "blocked",
  blockedBy: [
    "task-sad",
    "task-adrs"
  ],
  metadata: {
    blocked_reason: "Architecture must be approved before implementation"
  }
}
```

**Workflow:**

```
Elaboration tasks complete
      ↓
Agent updates .aiwg/flows/deliverables-status.json:
  elaboration.* = "complete"
  construction.implementation.blocked_by = []
  construction.implementation.status = "ready"
      ↓
Agent updates tasks:
  task-implementation.status = "todo"
  task-implementation.blockedBy = []
      ↓
User notification: "Construction phase unblocked. Ready to implement."
```

## Ralph Loop Integration

### Task Status Mirrors Ralph Iteration State

**Ralph loop structure:**

```typescript
interface RalphLoopState {
  loop_id: string;
  task: string;
  completion_criteria: string;
  iterations: RalphIteration[];
  status: "active" | "paused" | "complete" | "failed";
  progress: number;  // 0-1
}
```

**Task mapping:**

```typescript
{
  id: `ralph-${loop_id}`,
  title: task,
  status: mapStatus(loop.status),
  progress: Math.round(loop.progress * 100),
  metadata: {
    type: "ralph_loop",
    loop_id: loop_id,
    iterations: loop.iterations.length,
    completion_criteria: loop.completion_criteria
  }
}

function mapStatus(ralphStatus: string): TaskStatus {
  switch (ralphStatus) {
    case "active": return "in_progress";
    case "paused": return "todo";
    case "complete": return "done";
    case "failed": return "error";
  }
}
```

### Ralph with Task Sync

**Example: Fix all tests**

**Without Tasks:**

```bash
$ aiwg ralph "Fix all failing tests" --completion "npm test passes"

Ralph Loop Started
Loop ID: ralph-001
Task: Fix all failing tests

Iteration 1: Analyzing test failures...
Iteration 2: Fixed auth service test
Iteration 3: Fixed validation test
Progress: 3/5 tests passing (60%)
Iteration 4: Fixed integration test
Iteration 5: Fixed edge case
Progress: 5/5 tests passing (100%)

✓ Completion criteria met: npm test passes
Loop completed in 5 iterations
```

**With Tasks:**

```bash
$ aiwg ralph "Fix all failing tests" --completion "npm test passes"

Ralph Loop Started
Loop ID: ralph-001
Task created: "Fix all failing tests"

Iteration 1: Analyzing test failures...
Task updated: in_progress (0%)

Iteration 2: Fixed auth service test
Task updated: in_progress (20%)

Iteration 3: Fixed validation test
Task updated: in_progress (40%)

Iteration 4: Fixed integration test
Task updated: in_progress (80%)

Iteration 5: Fixed edge case
Task updated: done (100%)

✓ Completion criteria met: npm test passes
Loop completed in 5 iterations
Task marked complete
```

**State files:**

```json
// .aiwg/ralph/current-loop.json
{
  "loop_id": "ralph-001",
  "task": "Fix all failing tests",
  "status": "complete",
  "progress": 1.0,
  "iterations": [
    {
      "iteration": 1,
      "action": "Analyzing test failures",
      "progress": 0.0
    },
    {
      "iteration": 2,
      "action": "Fixed auth service test",
      "progress": 0.2
    }
    // ...
  ]
}
```

### Ralph Loop as Subtask

Ralph loops can create subtasks for granular progress:

```typescript
// Main task: "Fix all tests"
// Subtasks created per iteration:
[
  {
    id: "ralph-001-iter-1",
    title: "Analyze test failures",
    status: "done",
    parent: "ralph-001"
  },
  {
    id: "ralph-001-iter-2",
    title: "Fix auth service test",
    status: "done",
    parent: "ralph-001"
  },
  {
    id: "ralph-001-iter-3",
    title: "Fix validation test",
    status: "in_progress",
    parent: "ralph-001"
  }
]
```

**Benefits:**

- Visibility into Ralph progress
- Easy pause/resume at iteration boundaries
- Clear audit trail of what was done

## Cross-Platform Fallback

### Platform Support Matrix

| Platform | Task Management | Fallback Behavior |
|----------|----------------|-------------------|
| Claude Code | ✅ Full support | Sync to tasks |
| Cursor | ✅ Full support | Sync to tasks |
| Windsurf | ✅ Full support | Sync to tasks |
| Warp Terminal | ❌ No support | `.aiwg/` only |
| vim/neovim | ❌ No support | `.aiwg/` only |
| VS Code | ❌ No support | `.aiwg/` only |
| CLI | ❌ No support | `.aiwg/` only |

### Graceful Degradation

**Detection:**

```typescript
function hasTaskSupport(): boolean {
  return (
    typeof platform !== 'undefined' &&
    platform.tasks &&
    typeof platform.tasks.create === 'function'
  );
}
```

**Usage:**

```typescript
function completeDeliverable(deliverableId: string) {
  // Update source of truth (always)
  updateDeliverableStatus(deliverableId, "complete");

  // Sync to tasks if available (optional)
  if (hasTaskSupport()) {
    const task = findTaskForDeliverable(deliverableId);
    if (task) {
      platform.tasks.update(task.id, { status: "done" });
    }
  }

  // Workflow continues either way
}
```

### User Experience Differences

**With Task Support (Claude Code):**

```
User: "Transition to Elaboration"

✓ Transitioned to Elaboration phase

Tasks Created:
  📋 Write Software Architecture Document (SAD)
  📋 Create Architecture Decision Records (5)
  📋 Define Test Strategy
  📋 Create Security Threat Model

View in Tasks panel →
```

**Without Task Support (Warp Terminal):**

```
User: "Transition to Elaboration"

✓ Transitioned to Elaboration phase

Deliverables:
  - Write Software Architecture Document (SAD)
    Status: Not Started
    File: .aiwg/architecture/software-architecture-doc.md

  - Create Architecture Decision Records (5)
    Status: Not Started
    Directory: .aiwg/architecture/adr/

  - Define Test Strategy
    Status: Not Started
    File: .aiwg/testing/test-strategy.md

  - Create Security Threat Model
    Status: Not Started
    File: .aiwg/security/threat-model.md

Check status: aiwg status
```

**Key differences:**

| Aspect | With Tasks | Without Tasks |
|--------|-----------|---------------|
| Visualization | Task panel UI | Text output |
| Progress tracking | Visual progress bar | Numeric percentage |
| Notifications | System notifications | Text messages |
| Interaction | Click to complete | Command to update |
| Filtering | Task filtering UI | Manual grep/search |

**Identical aspects:**

- State stored in `.aiwg/`
- Workflow logic
- Completion validation
- Phase transitions
- Deliverable dependencies
- Ralph loop execution

## Example: Phase Transition With and Without Tasks

### Scenario Setup

Project: E-commerce platform
Current Phase: Inception
Deliverables Complete: ✓ Project intake, ✓ User stories, ✓ Use cases

### Without Task Management (Warp Terminal)

**User request:**

```bash
$ aiwg orchestrate "transition to elaboration"
```

**Agent execution:**

```
Validating Inception phase completion...
✓ Project intake complete
✓ User stories complete (12 stories)
✓ Use cases complete (8 use cases)

Transitioning to Elaboration phase...
✓ Updated .aiwg/flows/current-phase.txt
✓ Updated .aiwg/flows/phase-history.json
✓ Created deliverable tracking

Elaboration Phase Active

Required Deliverables:
1. Software Architecture Document (SAD)
   Path: .aiwg/architecture/software-architecture-doc.md
   Status: Not Started

2. Architecture Decision Records (ADRs)
   Path: .aiwg/architecture/adr/
   Target: 5 ADRs
   Status: 0/5 complete

3. Test Strategy
   Path: .aiwg/testing/test-strategy.md
   Status: Not Started

4. Security Threat Model
   Path: .aiwg/security/threat-model.md
   Status: Not Started

Next Steps:
- Start with: "Create SAD outline"
- Review: .aiwg/architecture/sad-template.md
- Check status: aiwg status
```

**State files created:**

```json
// .aiwg/flows/current-phase.txt
elaboration
```

```json
// .aiwg/flows/phase-history.json
{
  "transitions": [
    {
      "from": "inception",
      "to": "elaboration",
      "timestamp": "2026-02-06T10:30:00Z",
      "validated": true,
      "trigger": "user_request"
    }
  ]
}
```

```json
// .aiwg/flows/deliverables-status.json
{
  "elaboration": {
    "sad": {
      "id": "sad",
      "title": "Software Architecture Document",
      "status": "not_started",
      "artifact_path": ".aiwg/architecture/software-architecture-doc.md",
      "template": ".aiwg/architecture/sad-template.md",
      "created_at": "2026-02-06T10:30:00Z"
    },
    "adrs": {
      "id": "adrs",
      "title": "Architecture Decision Records",
      "status": "not_started",
      "artifact_count": 0,
      "target_count": 5,
      "artifact_path": ".aiwg/architecture/adr/",
      "created_at": "2026-02-06T10:30:00Z"
    },
    "test_strategy": {
      "id": "test_strategy",
      "title": "Test Strategy",
      "status": "not_started",
      "artifact_path": ".aiwg/testing/test-strategy.md",
      "template": ".aiwg/testing/test-strategy-template.md",
      "created_at": "2026-02-06T10:30:00Z"
    },
    "threat_model": {
      "id": "threat_model",
      "title": "Security Threat Model",
      "status": "not_started",
      "artifact_path": ".aiwg/security/threat-model.md",
      "template": ".aiwg/security/threat-model-template.md",
      "created_at": "2026-02-06T10:30:00Z"
    }
  }
}
```

**User continues work:**

```bash
$ aiwg status

Project: E-commerce Platform
Phase: Elaboration
Progress: 0% (0/4 deliverables)

Deliverables:
  ☐ Software Architecture Document (0%)
  ☐ Architecture Decision Records (0/5)
  ☐ Test Strategy (0%)
  ☐ Security Threat Model (0%)

$ aiwg orchestrate "start SAD"
# Agent begins creating SAD...
```

### With Task Management (Claude Code)

**User request:**

```
User: "transition to elaboration"
```

**Agent execution:**

```
Validating Inception phase completion...
✓ Project intake complete
✓ User stories complete (12 stories)
✓ Use cases complete (8 use cases)

Transitioning to Elaboration phase...
✓ Updated .aiwg/flows/current-phase.txt
✓ Updated .aiwg/flows/phase-history.json
✓ Created deliverable tracking
✓ Created task group "Elaboration Phase"
✓ Created 4 tasks

Elaboration Phase Active

Tasks created (see Tasks panel):
  📋 Write Software Architecture Document
  📋 Create Architecture Decision Records (5)
  📋 Define Test Strategy
  📋 Create Security Threat Model

Next Steps:
- View tasks in Tasks panel (⌘⇧T)
- Or: "start SAD"
```

**State files (identical to Warp):**

Same `.aiwg/flows/` files as above.

**Tasks created:**

```typescript
[
  {
    id: "task-elaboration-sad",
    title: "Write Software Architecture Document",
    description: "Create comprehensive SAD covering system overview, architecture views, and design decisions",
    status: "todo",
    progress: 0,
    priority: "high",
    group: "Elaboration Phase",
    metadata: {
      deliverable_id: "sad",
      artifact_path: ".aiwg/architecture/software-architecture-doc.md",
      template: ".aiwg/architecture/sad-template.md"
    },
    actions: [
      {
        label: "Start with template",
        command: "aiwg orchestrate 'create SAD from template'"
      }
    ]
  },
  {
    id: "task-elaboration-adrs",
    title: "Create Architecture Decision Records (5)",
    description: "Document key architecture decisions with rationale and trade-offs",
    status: "todo",
    progress: 0,
    priority: "high",
    group: "Elaboration Phase",
    metadata: {
      deliverable_id: "adrs",
      artifact_path: ".aiwg/architecture/adr/",
      target_count: 5,
      current_count: 0
    }
  },
  {
    id: "task-elaboration-test-strategy",
    title: "Define Test Strategy",
    description: "Establish testing approach, coverage targets, and tool selection",
    status: "todo",
    progress: 0,
    priority: "medium",
    group: "Elaboration Phase",
    metadata: {
      deliverable_id: "test_strategy",
      artifact_path: ".aiwg/testing/test-strategy.md",
      template: ".aiwg/testing/test-strategy-template.md"
    }
  },
  {
    id: "task-elaboration-threat-model",
    title: "Create Security Threat Model",
    description: "Identify security threats, attack vectors, and mitigations",
    status: "todo",
    progress: 0,
    priority: "high",
    group: "Elaboration Phase",
    metadata: {
      deliverable_id: "threat_model",
      artifact_path: ".aiwg/security/threat-model.md",
      template: ".aiwg/security/threat-model-template.md"
    }
  }
]
```

**User interface:**

```
┌─────────────────────────────────────────┐
│ Tasks (Elaboration Phase)              │
├─────────────────────────────────────────┤
│ ☐ Write Software Architecture Document │
│   Priority: High • 0%                   │
│   ► Start with template                 │
│                                         │
│ ☐ Create Architecture Decision Records │
│   Priority: High • 0/5 complete        │
│                                         │
│ ☐ Define Test Strategy                 │
│   Priority: Medium • 0%                 │
│                                         │
│ ☐ Create Security Threat Model         │
│   Priority: High • 0%                   │
└─────────────────────────────────────────┘
```

**User continues work:**

```
User: "start SAD"

Agent begins creating SAD...
✓ Created .aiwg/architecture/software-architecture-doc.md
✓ Updated task "Write Software Architecture Document"
  Status: In Progress (35%)

User sees in Tasks panel:
  ⧗ Write Software Architecture Document
    Priority: High • 35% • In Progress
```

**User completes SAD:**

```
User: "SAD is complete"

Agent:
✓ Validated SAD completeness
✓ Updated .aiwg/flows/deliverables-status.json
  elaboration.sad.status = "complete"
✓ Updated task "Write Software Architecture Document"
  Status: Done (100%)

Elaboration Progress: 1/4 deliverables (25%)

User sees in Tasks panel:
  ✓ Write Software Architecture Document
    Priority: High • 100% • Complete

Next deliverable:
  ☐ Create Architecture Decision Records (0/5)
```

### Side-by-Side Comparison

| Aspect | Without Tasks (Warp) | With Tasks (Claude Code) |
|--------|---------------------|--------------------------|
| **State Storage** | `.aiwg/flows/` files | `.aiwg/flows/` files (identical) |
| **Progress Display** | Text output | Task panel UI |
| **Status Check** | `aiwg status` command | Tasks panel (⌘⇧T) |
| **Deliverable List** | Text list in terminal | Task list with checkboxes |
| **Progress Tracking** | Percentage in text | Progress bars |
| **Notifications** | Text messages | System notifications |
| **Quick Actions** | Type commands | Click task actions |
| **Filtering** | Manual grep | Task panel filters |
| **History** | View files manually | Task history tab |
| **Workflow Logic** | Identical | Identical |
| **Completion Validation** | Identical | Identical |
| **Phase Transitions** | Identical | Identical |

**Key takeaway:** The underlying workflow, validation, and state management are **completely identical**. Tasks provide better visualization and interaction, but don't change how the system works.

## Best Practices

### For Users

**Without Task Management:**

1. **Use `aiwg status` regularly** - Check phase and deliverable progress
2. **Inspect `.aiwg/flows/` files** - Understand current state
3. **Follow command output** - Agent messages show next steps
4. **Use natural language** - "What's next?" works without tasks

**With Task Management:**

1. **Open Tasks panel frequently** - Visual progress overview
2. **Click task actions** - Quick access to common operations
3. **Filter by status** - Focus on in-progress or blocked items
4. **Enable notifications** - Stay informed of completions

### For Developers

**When building workflows:**

1. **Always update `.aiwg/` first** - Source of truth
2. **Sync to tasks if available** - Enhancement layer
3. **Never require tasks** - Fallback must work
4. **Test without tasks** - Ensure CLI/Warp compatibility
5. **Make tasks descriptive** - Help users understand context

**Task sync pattern:**

```typescript
async function completeDeliverable(id: string) {
  // 1. Update source of truth (required)
  await updateDeliverableStatus(id, "complete");

  // 2. Run workflow logic (required)
  await triggerWorkflowHandlers(id);

  // 3. Sync to tasks (optional enhancement)
  if (hasTaskSupport()) {
    await syncDeliverableToTask(id);
  }

  // 4. Notify user (both paths)
  notifyCompletion(id, hasTaskSupport());
}
```

### For Framework Authors

**When creating SDLC frameworks:**

1. **Design workflows task-agnostic** - Don't assume task support
2. **Provide clear text output** - Fallback experience matters
3. **Make task metadata rich** - When available, use it well
4. **Document both flows** - Examples with and without tasks
5. **Test cross-platform** - Verify Warp, CLI work identically

## Troubleshooting

### Tasks Out of Sync

**Problem:** Task status doesn't match `.aiwg/` state

**Diagnosis:**

```bash
# Check source of truth
cat .aiwg/flows/deliverables-status.json

# Compare with task status
/task list elaboration
```

**Solution:**

```bash
# Force resync from .aiwg/ to tasks
aiwg sync-tasks

# Or manually update .aiwg/ and let sync happen
# Edit .aiwg/flows/deliverables-status.json
# Save → auto-sync triggers
```

### Tasks Not Created

**Problem:** Phase transition doesn't create tasks

**Diagnosis:**

```bash
# Check platform support
/runtime-info | grep "Task Support"

# Should show: "Task Support: Yes" (Claude Code, Cursor)
# Or: "Task Support: No" (Warp, vim, CLI)
```

**Solution:**

If platform supports tasks but they're not created:

```bash
# Force task creation
aiwg create-phase-tasks elaboration

# Or restart workflow
aiwg orchestrate "transition to elaboration" --force
```

### Task Actions Don't Work

**Problem:** Clicking task action doesn't trigger workflow

**Diagnosis:**

```bash
# Check task metadata
/task inspect task-elaboration-sad

# Verify action.command is valid
```

**Solution:**

```bash
# Update task actions
aiwg update-task-actions task-elaboration-sad

# Or run command manually
aiwg orchestrate "create SAD from template"
```

## References

- @docs/cli-reference.md - CLI commands including `aiwg status`
- @agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md - Workflow orchestration
- @.aiwg/flows/ - State file examples (this repository)
- @docs/development/aiwg-development-guide.md - Framework development patterns
- Issue #286 - Task management integration

---

**Guide Version:** 2026.2.0
**Last Updated:** 2026-02-06
**Maintainer:** AIWG Team
