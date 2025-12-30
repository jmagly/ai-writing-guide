# REF-004: MAGIS Multi-Agent GitHub Issue Resolution

## Citation

Tao, W., Zhou, Y., Wang, Y., Zhang, W., Zhang, H., & Cheng, Y. (2024). *MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue Resolution*. arXiv:2403.17927v2 [cs.SE].

**URL**: https://arxiv.org/abs/2403.17927

**Category**: cs.SE (Software Engineering)

**Affiliations**: Fudan University, Huawei Technologies

## Abstract Summary

MAGIS addresses the complexity of repository-level GitHub issue resolution through a multi-agent framework. While LLMs show promise in code generation, they struggle with repository-level issues that require understanding codebases holistically. MAGIS coordinates four specialized agents (Manager, Repository Custodian, Developer, QA Engineer) through structured Planning and Coding phases to achieve an eight-fold improvement over direct GPT-4 application.

**Core Challenge Addressed**: How to decompose complex repository-level issues into manageable tasks and coordinate multiple agents to produce tested, reviewable code changes.

**Key Results**:
- 13.94% resolution rate on SWE-bench benchmark
- Eight-fold improvement over baseline GPT-4 (1.74%)
- Demonstrated importance of file location and task decomposition

## Architecture Overview

### The Four Agents

| Agent | Primary Responsibility | Key Technique |
|-------|------------------------|---------------|
| **Manager** | Coordination, task decomposition, team assembly | Circular speech meetings, role definition |
| **Repository Custodian** | File location, context management | BM25 retrieval, memory mechanism |
| **Developer** | Code modification, diff generation | Multi-step: locate lines → extract → modify |
| **QA Engineer** | Code review, quality decisions | Iterative feedback loops |

### Workflow Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                      PLANNING PHASE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Issue → [BM25 Retrieval] → [Memory Filter] → Candidate Files   │
│                                    │                             │
│                    [Task Decomposition]                          │
│                           │                                      │
│                    [Team Building]                               │
│                           │                                      │
│                    [Kick-off Meeting]                            │
│                           ↓                                      │
│                    Executable Work Plan                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                       CODING PHASE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For each task:                                                  │
│    Developer: Locate lines → Extract code → Generate changes     │
│         ↓                                                        │
│    QA Engineer: Review diff → Approve/Reject                     │
│         ↓                                                        │
│    [If rejected: feedback loop, max N iterations]                │
│         ↓                                                        │
│    Merge approved changes                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Repository Custodian & File Location

**Paper Concept**: The Custodian uses BM25 ranking to identify candidate files from the issue description, then applies a memory mechanism to filter irrelevant results and reuse cached file summaries.

**Technique Details**:
- BM25 initial ranking based on issue text
- Memory stores file summaries from previous queries
- For cached files: reuse summary + diff delta (avoids full LLM reprocessing)
- Relevance filtering: LLM evaluates whether cached summary relates to current issue

**Paper Finding**: File location is critical—the paper's empirical analysis found that "locating lines" is the primary failure mode in LLM-based issue resolution.

**AIWG Alignment**: **Partial** - AIWG's Explore agent uses Glob/Grep for file discovery but lacks the memory mechanism for cross-session optimization. The Context Librarian agent provides some similar functionality for artifact indexing.

**Implementation Opportunity**: Create a file location agent with BM25-style ranking and session memory for improved context management.

### 2. Task Decomposition Pattern

**Paper Concept**: The Manager converts a single complex issue into multiple file-level tasks. Each task specifies which file to modify, what changes are needed, and dependencies on other tasks.

**Technique Details**:
- Issue → File-level tasks (one task per modified file)
- Explicit dependency tracking between tasks
- Sequential execution respects dependencies
- Parallel execution for independent tasks

**Paper Finding**: Decomposition reduces cognitive load on individual agents compared to solving entire issues at once.

**AIWG Alignment**: **Strong** - AIWG's multi-agent documentation pattern uses Primary Author → Parallel Reviewers → Synthesizer, which parallels MAGIS task decomposition. Flow commands encode similar sequential/parallel patterns.

**Enhancement Opportunity**: Formalize dependency-aware task decomposition in TodoWrite or a new task planning agent.

### 3. Multi-Step Code Generation

**Paper Concept**: Rather than generating complete patches directly, Developers work in decomposed steps: identify line ranges → extract code → generate replacements → create diff.

**Technique Details**:
1. Analyze task requirements to identify line ranges needing modification
2. Extract original code sections from those ranges
3. Generate replacement code guided by task description
4. Create git diff for review

**Paper Finding**: Separating "where to change" from "what to change" improves accuracy.

**AIWG Alignment**: **Weak** - AIWG's Software Implementer agent generates code but doesn't explicitly separate line localization from code generation. Claude Code's Edit tool does operate on specific ranges.

**Implementation Opportunity**: Add explicit line-localization step to code modification workflows.

### 4. Developer-QA Iteration Loop

**Paper Concept**: Each Developer is paired with a QA Engineer who reviews changes and provides feedback. The loop continues until approval or iteration limit.

**Technique Details**:
- Developer generates diff
- QA Engineer reviews against task requirements
- Structured feedback on rejection
- Developer revises with feedback incorporated
- Maximum iteration bound (prevents infinite loops)

**Paper Finding**: Task-specific QA criteria outperform generic code standards. The paired relationship ensures focused review.

**AIWG Alignment**: **Strong** - AIWG's multi-agent pattern includes parallel reviewers and synthesis. The Test Engineer and Code Reviewer agents provide similar validation, though not as tightly coupled iteration loops.

**Enhancement Opportunity**: Implement explicit iteration counters and structured feedback formats in review workflows.

### 5. Memory Mechanism for Context Optimization

**Paper Concept**: A persistent memory stores file summaries, version information, and query results. When files haven't changed significantly, cached data is reused with delta updates.

**Technique Details**:
- Store: file path, version hash, LLM-generated summary
- On query: check if file version exists in memory
- If cached and unchanged: reuse summary directly
- If cached but changed: use summary + diff delta
- If uncached: full LLM summarization, then cache

**Paper Finding**: Memory mechanism significantly reduces token usage on large repositories by avoiding redundant summarization.

**AIWG Alignment**: **Weak** - AIWG doesn't implement cross-session memory. The `.aiwg/working/` directory provides temporary state, but no persistent cache for file analysis.

**Implementation Opportunity**: Create a memory addon that caches file analysis for context optimization across sessions.

### 6. Kick-off Meeting Pattern

**Paper Concept**: Before coding begins, all agents participate in a structured "circular speech" meeting where the Manager facilitates discussion, developers provide feedback on assignments, and execution sequences are finalized.

**Technique Details**:
- Manager presents task assignments
- Each Developer speaks to their task understanding
- Dependencies and conflicts identified
- Role descriptions adjusted based on feedback
- Final work plan generated

**Paper Finding**: The meeting improves task clarity and catches assignment issues before coding begins.

**AIWG Alignment**: **Partial** - AIWG's flow commands define agent assignments but lack an explicit "kick-off" deliberation phase. The Plan agent serves a similar purpose for implementation planning.

**Enhancement Opportunity**: Add a "planning consensus" step to flow commands that validates agent assignments before execution.

## AIWG Concept Mapping

| MAGIS Concept | AIWG Equivalent | Coverage |
|---------------|-----------------|----------|
| Manager Agent | Core Orchestrator (CLAUDE.md) | **Strong** |
| Repository Custodian | Explore Agent + Context Librarian | **Partial** |
| Developer Agent | Software Implementer | **Strong** |
| QA Engineer | Test Engineer + Code Reviewer | **Strong** |
| BM25 File Location | Glob + Grep tools | **Partial** |
| Memory Mechanism | None (gap) | **Weak** |
| Task Decomposition | TodoWrite + Flow Commands | **Moderate** |
| Iteration Loops | Review cycles in multi-agent pattern | **Moderate** |
| Kick-off Meeting | Plan agent (informal) | **Partial** |

## Comparison: MAGIS vs AIWG Approaches

### Where MAGIS Offers Novel Patterns

1. **Explicit File Location Phase**
   - MAGIS: Dedicated Custodian with BM25 + memory
   - AIWG: Ad-hoc file discovery via Explore/Glob/Grep
   - Gap: Systematic ranking and caching

2. **Line-Level Localization**
   - MAGIS: Explicit step separating "where" from "what"
   - AIWG: Implicit in Edit tool usage
   - Gap: Formal localization pattern

3. **Cross-Session Memory**
   - MAGIS: Persistent file summary cache
   - AIWG: Per-session context only
   - Gap: Memory addon needed

4. **Iteration Bounds**
   - MAGIS: Explicit max iterations in feedback loops
   - AIWG: Implicit in agent behavior
   - Gap: Configurable bounds in flow commands

### Where AIWG Extends MAGIS Concepts

1. **Phase-Based Lifecycle**
   - MAGIS: Two phases (Planning, Coding)
   - AIWG: Five phases (Inception → Production) with gates
   - Advantage: Broader SDLC coverage

2. **Agent Specialization Depth**
   - MAGIS: Four core agents
   - AIWG: 58+ specialized agents
   - Advantage: Finer-grained expertise

3. **Template-Driven Artifacts**
   - MAGIS: Ad-hoc output generation
   - AIWG: 100+ structured templates
   - Advantage: Consistent deliverables

4. **Natural Language Invocation**
   - MAGIS: Programmatic API
   - AIWG: Natural language translation layer
   - Advantage: User-friendly orchestration

## Implementation as AIWG Addon

Based on this analysis, MAGIS concepts would integrate into AIWG as a **Guided Implementation** addon with:

### Proposed Agents

| Agent | Role | Tools |
|-------|------|-------|
| `implementation-manager` | Decomposes issues into file-level tasks, tracks dependencies | Read, Write, Glob, Grep |
| `file-custodian` | Locates relevant files, manages context memory | Read, Glob, Grep, WebFetch |
| `line-locator` | Identifies specific line ranges for modification | Read, Grep |
| `implementation-qa` | Reviews code changes, provides structured feedback | Read, Grep, Bash |

### Proposed Commands

| Command | Purpose |
|---------|---------|
| `/guided-impl-start` | Initialize guided implementation session |
| `/guided-impl-plan` | Execute planning phase (decomposition, file location) |
| `/guided-impl-code` | Execute coding phase with iteration loops |
| `/guided-impl-status` | Check current phase and pending tasks |

### Proposed Flow

```
/flow-guided-implementation
├── Phase 1: Issue Analysis
│   ├── implementation-manager: Parse issue, identify scope
│   └── file-custodian: Locate candidate files (BM25-style)
├── Phase 2: Task Decomposition
│   ├── implementation-manager: Create file-level tasks
│   └── Consensus: Validate task breakdown
├── Phase 3: Iterative Coding
│   ├── For each task:
│   │   ├── line-locator: Identify modification ranges
│   │   ├── software-implementer: Generate changes
│   │   └── implementation-qa: Review → approve/iterate
│   └── Max iterations: configurable (default 3)
└── Phase 4: Integration
    ├── Merge all approved changes
    └── Generate PR/commit
```

## Design Principles (from Issue #1)

The addon should follow these principles from the original issue:

1. **Run to Completion**: Minimize user interaction during execution
2. **Optional Addon**: Not needed for all projects
3. **Complement Existing Tools**: Claude Code already does implicit MAGIS-like work; formalize rather than replace
4. **Autonomous Iteration**: Auto-retry within bounds before requesting user input

## Limitations and Considerations

### From MAGIS Paper

1. **Prompt Complexity**: Different issue types require careful prompt tuning
2. **Dataset Constraints**: Performance varies across languages and repository structures
3. **Iteration Bounds**: Fixed limits may prevent convergence on complex changes
4. **Context Pressure**: Large repositories strain token budgets even with memory

### For AIWG Implementation

1. **Memory Persistence**: Requires storage mechanism (file-based or DB)
2. **BM25 Implementation**: May need external library or simplified ranking
3. **Iteration Overhead**: Multiple review rounds increase token usage
4. **Integration Complexity**: Must coordinate with existing SDLC workflows

## Related AIWG Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| Software Implementer | `agents/software-implementer.md` | Code generation |
| Test Engineer | `agents/test-engineer.md` | QA review |
| Code Reviewer | `agents/code-reviewer.md` | Code review |
| Context Librarian | `agents/context-librarian.md` | Context management |
| Plan Agent | `.claude/agents/` | Implementation planning |
| Explore Agent | `.claude/agents/` | File discovery |

## References

### Primary Source

- Tao, W. et al. (2024). [MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue Resolution](https://arxiv.org/abs/2403.17927). arXiv:2403.17927

### Related AIWG References

- REF-001: Production-Grade Agentic AI Workflows (orchestration patterns)
- REF-002: LLM Failure Modes in Agentic Systems (error handling)
- REF-003: Agentic Development Antipatterns (implementation pitfalls)

### SWE-bench Benchmark

- [SWE-bench](https://www.swebench.com/) - Standard benchmark for repository-level issue resolution

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-30 | AIWG Analysis | Initial reference entry with addon design proposal |
