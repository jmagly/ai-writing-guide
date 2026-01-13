# Guided Implementation Feature

## Overview

Autonomous implementation workflow with bounded iteration for issue-to-code resolution.

**Status**: Implemented (Minimal Design)
**Issue**: https://git.integrolabs.net/roctinam/ai-writing-guide/issues/1

---

## Problem Statement

AIWG's SDLC framework excels at project planning but lacks formalized "on-the-ground" implementation mechanics. Users must babysit Claude through implementation cycles.

**Goal**: Run to completion with minimal user interaction, auto-retry within bounds, escalate when truly blocked.

## Design Principles

1. **Run to Completion**: Minimize user interaction during execution
2. **Complement, Don't Duplicate**: Use existing tools (Grep, Glob, Edit, TodoWrite, Task)
3. **Bounded Iteration**: Auto-retry up to N times, then escalate
4. **Autonomous Decision-Making**: Don't ask unless truly blocked

---

## Gap Analysis

### What Already Exists

| Capability | Existing Component | Coverage |
|------------|-------------------|----------|
| File location | Grep + Glob tools | 100% |
| Task decomposition | TodoWrite tool | 100% |
| Line localization | Grep + Read + Edit | 100% |
| Code generation | software-implementer agent | 100% |
| Code review | code-reviewer agent | 100% |
| Test debugging | debugger agent | 100% |

### What Was Missing

| Gap | Solution | Type |
|-----|----------|------|
| Iteration bounds | `iteration-control` | Skill |
| Orchestration | `/flow-guided-implementation` | Flow command |

---

## Implementation

### Components Created

```
agentic/code/frameworks/sdlc-complete/commands/flow-guided-implementation.md  # Orchestration
agentic/code/addons/guided-implementation/
├── manifest.json
├── README.md
└── skills/iteration-control/SKILL.md              # Bounded retry logic
```

### Workflow

```
INPUT: Issue/requirement
         │
         v
┌────────────────────────────────┐
│ PHASE 1: ANALYSIS              │
│ Tools: Grep, Glob, Read        │
│ Find relevant files            │
└────────────────────────────────┘
         │
         v
┌────────────────────────────────┐
│ PHASE 2: DECOMPOSITION         │
│ Tool: TodoWrite                │
│ Create file-level tasks        │
└────────────────────────────────┘
         │
         v
┌────────────────────────────────┐
│ PHASE 3: ITERATIVE CODING      │
│ Tools: Edit, Bash, Task        │
│ Skill: iteration-control       │
│                                │
│ FOR EACH task:                 │
│   Generate → Validate → Decide │
│   Retry or Escalate            │
└────────────────────────────────┘
         │
         v
┌────────────────────────────────┐
│ PHASE 4: INTEGRATION           │
│ Tools: Bash (git)              │
│ Commit changes                 │
└────────────────────────────────┘
```

---

## Acceptance Criteria

### Functional

- [x] `/flow-guided-implementation` command orchestrates workflow
- [x] Bounded retries (configurable, default 3)
- [x] Escalation to user with context on max iterations
- [x] TodoWrite integration for task tracking
- [x] Uses existing agents (software-implementer, code-reviewer, debugger)

### Quality

- [x] No redundant agents (uses existing)
- [x] Skill-based iteration control (not agent)
- [x] Research properly cited
- [x] Traceability maintained

---

## What Was NOT Implemented (By Design)

| MAGIS Feature | Why Skipped |
|---------------|-------------|
| BM25 file ranking | Grep + Glob sufficient for most cases |
| Cross-session memory | Session memory adequate, cache adds complexity |
| Dedicated Manager agent | Claude Code IS the orchestrator |
| Repository Custodian agent | Grep + Glob cover file location |
| Line Locator agent | Edit tool handles line-level changes |
| QA Engineer agent | code-reviewer + test-engineer exist |

---

## Usage

```bash
# Basic
/flow-guided-implementation Add refresh token support

# From issue URL
/flow-guided-implementation --issue https://github.com/org/repo/issues/42

# Custom retry limit
/flow-guided-implementation --max-retries 5 Fix login validation
```

---

## Traceability

| Artifact | Location |
|----------|----------|
| Issue | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/1 |
| Research | @.aiwg/research/REF-004-magis-multi-agent-issue-resolution.md |
| Analysis | @.aiwg/working/guided-impl-analysis/SYNTHESIS.md |
| Flow Command | @agentic/code/frameworks/sdlc-complete/commands/flow-guided-implementation.md |
| Skill | @agentic/code/addons/guided-implementation/skills/iteration-control/SKILL.md |
| Addon | @agentic/code/addons/guided-implementation/ |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-30 | Claude | Initial over-engineered spec (4 agents) |
| 2025-12-30 | Claude | Revised to minimal design (1 skill + 1 flow) after gap analysis |
