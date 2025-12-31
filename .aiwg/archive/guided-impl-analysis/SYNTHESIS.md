# Guided Implementation: Gap Analysis Synthesis

**Date**: 2025-12-30
**Issue**: https://git.integrolabs.net/roctinam/ai-writing-guide/issues/1
**Status**: Analysis Complete - Ready for Minimal Implementation

---

## Key Finding

**Most MAGIS concepts are already covered by existing Claude Code tools and AIWG agents.**

The original implementation (4 new agents, 4 commands, 1 flow) was over-engineered.

---

## Coverage Analysis

| MAGIS Concept | Existing Coverage | Gap? |
|---------------|-------------------|------|
| Manager (coordination) | Core Orchestrator (Claude Code itself) | NO |
| Manager (decomposition) | TodoWrite tool | NO |
| Repository Custodian (file location) | Grep + Glob tools | NO |
| Repository Custodian (ranking) | Simple heuristics | MINOR |
| Developer (line localization) | Grep + Read + Edit tool | NO |
| Developer (code generation) | software-implementer agent | NO |
| QA Engineer (review) | code-reviewer agent | NO |
| QA Engineer (testing) | test-engineer agent + Bash | NO |
| **Iteration bounds** | Not formalized | **YES** |
| **Orchestration sequencing** | No guided-impl specific flow | **YES** |
| Memory mechanism | Session memory sufficient | NO (defer) |

---

## Actual Gaps (Minimal)

### Gap 1: Iteration Control

**Problem**: Claude retries implicitly but has no formal "max N attempts then escalate" behavior.

**Solution**: Skill (not agent) that tracks iteration count and decides retry vs escalate.

### Gap 2: Orchestration Flow

**Problem**: No single command sequences file location → task decomposition → iterative coding → integration with the "run to completion" behavior.

**Solution**: Flow command that orchestrates existing tools/agents with iteration bounds.

---

## MVP Implementation

### Files to Create

```
.claude/commands/flow-guided-implementation.md    # Orchestration flow
agentic/code/addons/guided-implementation/
├── manifest.json                                  # Minimal manifest
├── README.md                                      # Usage docs
└── skills/
    └── iteration-control/
        └── SKILL.md                               # Iteration bounds skill
```

### Files to DELETE (over-engineered)

```
agentic/code/addons/guided-implementation/agents/  # All 4 agents - not needed
agentic/code/addons/guided-implementation/commands/ # Redundant with flow
agentic/code/addons/guided-implementation/flows/   # Replace with .claude/commands/
```

---

## Workflow (Using Existing Components)

```
INPUT: Issue/requirement
         │
         v
┌─────────────────────────────────────────────┐
│ PHASE 1: FILE LOCATION                      │
│ Tools: Grep + Glob (existing)               │
│ Optional: file-ranking skill                │
└─────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────┐
│ PHASE 2: TASK DECOMPOSITION                 │
│ Tool: TodoWrite (existing)                  │
└─────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────┐
│ PHASE 3: ITERATIVE CODING (per task)        │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Line location: Grep + Read          │    │
│  │ Code gen: Edit OR Task(impl)        │    │
│  │ Validate: Bash (tests)              │    │
│  │ Review: Task(code-reviewer)         │    │
│  │                                     │    │
│  │ ** iteration-control skill **       │    │
│  │ if fail && iter < max: retry        │    │
│  │ if fail && iter >= max: escalate    │    │
│  │ if pass: next task                  │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────┐
│ PHASE 4: INTEGRATION                        │
│ Tools: Bash (git), /commit-and-push         │
└─────────────────────────────────────────────┘
         │
         v
OUTPUT: PR/Commit with tested code
```

---

## Decision Matrix: Skill vs Agent vs Tool

| Need | Use | Rationale |
|------|-----|-----------|
| File search | Grep/Glob (tool) | Atomic, no expertise needed |
| Task tracking | TodoWrite (tool) | Already handles decomposition |
| Code changes | Edit/Write (tool) | Simple changes direct, complex via agent |
| Complex impl | Task(software-implementer) | Domain expertise, TDD cycle |
| Code review | Task(code-reviewer) | Judgment required |
| Test debug | Task(debugger) | Root cause analysis |
| **Iteration control** | **Skill** | Stateless decision logic |
| **Orchestration** | **Flow command** | Multi-phase coordination |

---

## Next Steps

1. Delete over-engineered agents from addon
2. Create minimal `iteration-control` skill
3. Create `/flow-guided-implementation` command
4. Update feature spec with minimal design
5. Test with real implementation task

---

## References

- @.aiwg/research/REF-004-magis-multi-agent-issue-resolution.md
- @.aiwg/features/guided-implementation/README.md (needs update)
- @agentic/code/frameworks/sdlc-complete/agents/software-implementer.md
- @agentic/code/frameworks/sdlc-complete/agents/code-reviewer.md
