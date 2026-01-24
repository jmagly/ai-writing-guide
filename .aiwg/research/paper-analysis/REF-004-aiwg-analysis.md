# REF-004 AIWG Analysis: MAGIS Multi-Agent GitHub Issue Resolution

> **Source Paper**: [MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue ReSolution](https://arxiv.org/abs/2403.17927)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Analysis Date**: 2026-01-24

## Overview

MAGIS achieves 13.94% GitHub issue resolution on SWE-bench (8x improvement over GPT-4 baseline) through a four-agent collaborative framework: Manager, Repository Custodian, Developer, and QA Engineer. The paper provides empirical validation for multi-agent decomposition and introduces novel patterns applicable to AIWG.

**Key Results**:
- 13.94% resolved ratio (vs GPT-4's 1.74%)
- 97.39% applied ratio (code changes successfully git-apply)
- 8x improvement using same base model

## Direct AIWG Alignments

| MAGIS Concept | AIWG Equivalent | Strength |
|---------------|-----------------|----------|
| **Manager Agent** | Project Manager agent + flow orchestration | **Strong** |
| **Repository Custodian** | Code Intelligence agent + context gathering | **Moderate** |
| **Developer Agents** | Code Writer, Test Engineer, etc. (53 agents) | **Strong** |
| **QA Engineer** | Code Reviewer agent + review flows | **Strong** |
| **Kick-off Meeting** | Agent collaboration in flows | **Moderate** |
| **Multi-step Coding** | Decomposed subtasks in SDLC phases | **Strong** |
| **File-level Tasks** | Use case → implementation mapping | **Strong** |
| **Memory Mechanism** | `.aiwg/` artifact persistence | **Partial** |

## MAGIS Innovations AIWG Can Adopt

### 1. Memory Mechanism for Repository Evolution

**MAGIS Implementation** (Algorithm 1, p.5):
```
For each file in repository:
    If previously analyzed:
        summary_previous ← retrieve from memory
        diff ← git diff previous current
        If len(summary) < len(file):
            summary_updated ← summary_previous + LLM(diff)
    Else:
        summary ← LLM(file)

    memory.store(file, version, summary)
```

**AIWG Application**:

**Proposed**: `.aiwg/knowledge/repository-memory.json`
```json
{
  "src/auth/login.ts": {
    "version": "a4f3b2c",
    "summary": "Handles user authentication with JWT tokens...",
    "last_analyzed": "2026-01-24T10:30:00Z"
  },
  "src/auth/session.ts": {
    "version": "b2e1d9a",
    "summary": "Manages user session lifecycle...",
    "last_analyzed": "2026-01-24T10:32:00Z",
    "diff_from_previous": "Added session timeout configuration"
  }
}
```

**Benefits**:
- Reduce LLM queries for unchanged files
- Faster context loading for large repositories
- Incremental understanding as code evolves

**Implementation Location**: `agentic/code/addons/code-intelligence/memory-mechanism/`

### 2. Line-Level Localization Before Code Generation

**MAGIS Multi-Step Process** (Algorithm 3, p.6):
```
1. Locate: {[start_line, end_line]} ← LLM(file, task, P9)
2. Extract: old_code ← file[start_line:end_line]
3. Generate: new_code ← LLM(file, task, old_code, P10)
4. Replace: file' ← replace(file, old_code, new_code)
5. Review: QA Engineer evaluates change
```

**Current AIWG Pattern**:
```markdown
Developer agent receives task → generates full code change
```

**Proposed Enhancement** (Code Writer agent):
```markdown
## Modification Protocol

When modifying existing code:

1. **Locate**: Identify exact line ranges requiring change
   - Use grep/glob to find relevant sections
   - Output: "Lines X-Y in file.ts require modification"

2. **Extract**: Read current implementation
   - Use Read tool with line numbers
   - Understand existing logic and dependencies

3. **Generate**: Create replacement code
   - Maintain existing style and patterns
   - Add inline comments explaining changes

4. **Verify**: Self-check before submission
   - Does change address the requirement?
   - Are existing tests still valid?
```

**Benefits**:
- Leverages LLM strength in code generation
- Mitigates weakness in code modification
- Improves accuracy (MAGIS Figure 6 shows strong correlation)

**Implementation**: Update `agentic/code/frameworks/sdlc-complete/agents/code-writer.md`

### 3. Formalized Kick-off Meetings

**MAGIS Pattern** (Section 3.2.1, p.6 + Figure 7, p.17):

```
Manager opens → States issue, tasks, expected collaboration
Developer 1 speaks → Identifies dependencies, suggests sequence
Developer 2 speaks → Confirms understanding, notes potential conflicts
Developer N speaks → ...
Manager summarizes → Generates executable work plan
```

**AIWG Application**:

**New Skill**: `.claude/skills/planning-meeting.md`

```markdown
# Planning Meeting Skill

## Purpose
Coordinate multiple agents before execution to identify dependencies,
resolve conflicts, and optimize execution order.

## Process

1. **Convene**: Gather all agents assigned to the workflow
2. **Present**: Manager agent describes overall goal and individual tasks
3. **Discuss**: Each agent identifies:
   - Prerequisites for their task
   - Outputs they produce for other agents
   - Potential conflicts with other tasks
4. **Sequence**: Determine execution order (sequential vs parallel)
5. **Commit**: Generate executable plan with dependencies

## Outputs

- `.aiwg/working/planning-meeting-notes.md`
- `.aiwg/working/execution-plan.json`
```

**Example Execution Plan**:
```json
{
  "workflow": "implement-auth-feature",
  "agents": [
    {
      "name": "database-designer",
      "task": "Design user schema",
      "dependencies": [],
      "outputs_for": ["api-designer", "test-engineer"]
    },
    {
      "name": "api-designer",
      "task": "Define authentication endpoints",
      "dependencies": ["database-designer"],
      "outputs_for": ["code-writer", "test-engineer"]
    }
  ],
  "execution_sequence": [
    {"parallel": false, "agents": ["database-designer"]},
    {"parallel": false, "agents": ["api-designer"]},
    {"parallel": true, "agents": ["code-writer", "test-engineer"]}
  ]
}
```

**Benefits**:
- Reduces conflicts between parallel agents
- Optimizes execution order
- Documents decision-making process

**Implementation**: `agentic/code/addons/collaboration/planning-meetings/`

### 4. Dedicated QA Engineer per Developer

**MAGIS Pattern** (Algorithm 3):
```
For each Developer agent:
    qa_engineer ← LLM(developer_task, P8)  # Generate specialized QA role

    Loop:
        code_change ← Developer.execute(task)
        review ← qa_engineer.review(code_change, task)

        If review.decision == "approve":
            break
        Else:
            task ← task + review.feedback
            Continue (max N iterations)
```

**AIWG Current Pattern**:
- Code Reviewer agent operates on completed work
- Review happens after implementation complete

**AIWG Enhancement**:

**Proposed Flow Command Syntax**:
```yaml
agents:
  - role: code-writer
    task: "Implement authentication"
    paired_reviewer:
      role: security-focused-code-reviewer
      context: "authentication implementation"
      max_iterations: 3

  - role: test-engineer
    task: "Write integration tests"
    paired_reviewer:
      role: test-coverage-reviewer
      context: "authentication tests"
      max_iterations: 2
```

**Benefits**:
- Immediate, task-specific feedback
- Catches errors early (before merging)
- Reduces rework in later phases

**Implementation**: Extend flow command syntax, add iteration logic to orchestrator

## MAGIS Empirical Findings Applied to AIWG

### Finding 1: File Locating Precision Matters

**MAGIS Evidence** (p.2-3): Claude-2 performance decreased from 1.96% → 1.22% as recall increased from 29.58% → 51.06%.

**AIWG Implication**: Code Intelligence agent should prioritize **relevant files** over **all files**.

**Proposed Enhancement**:
```markdown
# In Code Intelligence agent

## File Relevance Scoring

When locating files for a task:

1. **Initial candidates**: Use grep/glob for broad search
2. **Summarize**: For each file, generate 2-3 sentence summary
3. **Score relevance**: Rate 1-5 how relevant to current task
4. **Filter**: Only include files with score ≥4
5. **Minimize**: If >5 files, prioritize highest scores

This prevents context overload while maintaining high recall.
```

**Location**: `agentic/code/addons/code-intelligence/file-relevance-scoring.md`

### Finding 2: Line Locating Strongly Predicts Success

**MAGIS Evidence** (Figure 6, p.9): Resolved ratio increases sharply with line coverage ratio, especially in 0.6-1.0 range.

**AIWG Implication**: Agents should **explicitly identify target lines** before generating code.

**Proposed Workflow**:
```markdown
# Code Writer agent modification protocol

## Step 1: Locate Target Lines
Use grep with context to identify modification points:
```bash
grep -n "function authenticate" src/auth.ts
# Output: Line 45: export function authenticate(credentials: Credentials)
```

## Step 2: Read Context
```bash
# Read lines 40-60 for context
```

## Step 3: State Intent
"I will modify lines 48-52 in src/auth.ts to add session timeout validation"

## Step 4: Generate Replacement
[Generate new code for lines 48-52]

## Step 5: Verify
Does the change address the requirement? Are line numbers correct?
```

**Location**: Update Code Writer agent with this protocol

### Finding 3: Complexity Decomposition Reduces Negative Impact

**MAGIS Evidence** (Table 3, p.9):
- GPT-4 correlation with # files: −25.15
- MAGIS: −1.55 (94% reduction in negative impact)

**AIWG Implication**: Multi-file changes should be **decomposed into file-level tasks**, each handled by specialized agent.

**Current AIWG**: Single Code Writer may handle multi-file changes

**Proposed Enhancement** (Project Manager agent):
```markdown
## Multi-File Change Decomposition

When a requirement affects multiple files:

1. **Identify files**: List all files requiring modification
2. **Define tasks**: Create one file-level task per file
   - Task 1: "Update user model in src/models/user.ts"
   - Task 2: "Update auth service in src/services/auth.ts"
   - Task 3: "Update API routes in src/routes/auth.ts"
3. **Assign specialists**: Create/assign agent per task
4. **Coordinate**: Use planning meeting to resolve dependencies
5. **Integrate**: Merge changes after individual completion

This mirrors MAGIS's Manager → multiple Developers pattern.
```

**Location**: `agentic/code/frameworks/sdlc-complete/agents/project-manager.md`

## Implementation Roadmap

### Short-Term (Immediate AIWG Enhancements)

#### 1. Add Memory Mechanism to Code Intelligence Agent

**Priority**: High
**Effort**: Medium (2-3 days)
**Impact**: High (faster context loading, reduced costs)

**Tasks**:
- Create `.aiwg/knowledge/repository-memory.json` schema
- Implement incremental diff-based updates
- Add memory querying to Code Intelligence agent
- Test with multi-session workflow

**Location**: `agentic/code/addons/code-intelligence/repository-memory/`

#### 2. Formalize Multi-Step Modification Protocol in Code Writer

**Priority**: High
**Effort**: Low (1 day)
**Impact**: High (improved accuracy)

**Tasks**:
- Add "Locate → Extract → Generate → Verify" section to Code Writer
- Provide grep/read examples
- Add line number validation step
- Update agent documentation

**Location**: `agentic/code/frameworks/sdlc-complete/agents/code-writer.md`

#### 3. Enhance File Locating Precision in Code Intelligence

**Priority**: High
**Effort**: Medium (2 days)
**Impact**: Medium (avoid context overload)

**Tasks**:
- Add relevance scoring step
- Implement top-N filtering (N=5-7)
- Test with distractor scenarios (REF-002 Archetype 3)
- Document scoring criteria

**Location**: Code Intelligence agent enhancement

### Medium-Term (Flow Command Extensions)

#### 4. Implement Planning Meetings for Multi-Agent Workflows

**Priority**: Medium
**Effort**: High (1 week)
**Impact**: Medium (optimized execution)

**Tasks**:
- Create planning-meeting skill
- Generate execution plan with dependencies
- Test with multi-file implementation workflow
- Document planning meeting patterns

**Location**: `agentic/code/addons/collaboration/planning-meetings/`

#### 5. Add Paired Reviewer Pattern to Flow Commands

**Priority**: Medium
**Effort**: High (1 week)
**Impact**: High (early error detection)

**Tasks**:
- Add `paired_reviewer:` syntax to flow commands
- Implement iteration logic (max N attempts)
- Create specialized reviewer agent templates
- Test with authentication implementation case

**Location**: Flow command parser + orchestrator

#### 6. Decompose Multi-File Changes in Project Manager

**Priority**: Medium
**Effort**: Medium (3-4 days)
**Impact**: High (94% complexity reduction)

**Tasks**:
- Detect multi-file requirements automatically
- Generate file-level subtasks
- Assign specialized agents per file
- Coordinate via planning meeting
- Test with multi-component feature

**Location**: `agentic/code/frameworks/sdlc-complete/agents/project-manager.md`

### Long-Term (Framework Evolution)

#### 7. Incremental Repository Understanding

**Priority**: Low
**Effort**: Very High (2-3 weeks)
**Impact**: High (scale to large codebases)

**Tasks**:
- Persistent memory across sessions
- Git-based change tracking integration
- Diff-based summary updates
- Memory pruning strategies
- Performance benchmarking

**Location**: `agentic/code/addons/code-intelligence/incremental-understanding/`

#### 8. Dynamic Agent Generation

**Priority**: Low
**Effort**: Very High (3-4 weeks)
**Impact**: Medium (flexibility for novel tasks)

**Tasks**:
- Manager creates specialized agents on-demand (MAGIS pattern)
- Currently: Fixed catalog of 53 agents
- Future: Generate bespoke agents per unique task
- Agent template generation
- Capability inference from task description

**Location**: Core orchestration framework

## Comparative Analysis

### Where MAGIS Outperforms AIWG Design

1. **Memory Mechanism**: MAGIS reuses file summaries across repository updates; AIWG reprocesses each time
2. **Line-Level Localization**: MAGIS explicitly separates locating from generating; AIWG combines
3. **QA Iteration**: MAGIS pairs each developer with QA in tight loop; AIWG reviews after completion
4. **File Precision**: MAGIS filters aggressively after BM25; AIWG uses grep/glob without relevance scoring
5. **Kick-off Coordination**: MAGIS formalizes planning meetings; AIWG has implicit coordination

### Where AIWG Already Excels

1. **Agent Taxonomy**: 53 specialized agents vs MAGIS's 4 generic types
2. **Externalized Definitions**: All agents/commands version-controlled; MAGIS uses embedded prompts
3. **Template System**: 100+ structured templates; MAGIS generates ad-hoc
4. **Phase-Based Lifecycle**: Clear Inception→Transition stages; MAGIS focuses only on coding
5. **Natural Language Routing**: Simple language translations; MAGIS requires structured inputs

## Integration Opportunities

### Code Intelligence Addon

**Enhance with MAGIS patterns**:
```
agentic/code/addons/code-intelligence/
├── repository-memory/
│   ├── memory-store.ts
│   ├── diff-analyzer.ts
│   └── summary-updater.ts
├── file-relevance-scoring/
│   ├── scoring-algorithm.ts
│   └── relevance-filters.ts
└── line-localization/
    ├── target-finder.ts
    └── context-extractor.ts
```

### Collaboration Addon

**New addon for MAGIS-style coordination**:
```
agentic/code/addons/collaboration/
├── planning-meetings/
│   ├── meeting-orchestrator.md
│   ├── execution-plan-generator.md
│   └── dependency-resolver.md
└── paired-reviews/
    ├── review-iteration-handler.md
    └── specialized-reviewer-templates/
```

## Success Metrics

### Repository Memory

- **Cache Hit Rate**: >80% for unchanged files
- **Query Reduction**: >50% fewer LLM calls for context loading
- **Update Speed**: <2 seconds for diff-based summary updates

### Line Localization

- **Coverage Ratio**: >0.8 (80% of correct lines identified)
- **Precision**: >90% (identified lines are correct)
- **Time to Locate**: <10 seconds per target

### File Relevance

- **Precision**: >85% (files marked relevant are actually needed)
- **Recall**: >75% (relevant files are identified)
- **Context Size**: <10 files per task (avoid overload)

### Multi-Agent Coordination

- **Conflict Rate**: <5% (tasks require rework due to conflicts)
- **Parallel Efficiency**: >60% (parallel tasks vs sequential)
- **Planning Overhead**: <2 minutes per kick-off meeting

## Case Study Mapping

### MAGIS Django Issue #30664 → AIWG Equivalent

**MAGIS Process**:
1. Repository Custodian → Located 2 candidate files
2. Manager → Defined 2 tasks, recruited specialists
3. Kick-off Meeting → Determined execution sequence
4. Developer I → Modified code, QA approved immediately
5. Developer II → Three attempts, QA feedback, final approved
6. Result → Both changes merged, all tests pass

**AIWG Equivalent**:
1. **Code Intelligence** → Locate relevant files (with relevance scoring)
2. **Project Manager** → Decompose into file-level tasks
3. **Planning Meeting** → Agents discuss dependencies (new skill)
4. **Code Writer A** → Implement file A (with paired QA reviewer)
5. **Code Writer B** → Implement file B (with paired QA reviewer)
6. **Integration** → Merge changes, run full test suite

**Key Additions Needed**:
- Planning meeting skill
- Paired reviewer pattern
- File relevance scoring
- Line localization protocol

## Key Quotes

### On Memory Mechanism

> "Considering that applying the code change often modifies a specific part of the file rather than the entire file, we propose a memory mechanism to reuse the previously queried information." (p.5)

### On Manager Flexibility

> "This setup improves team flexibility and adaptability, enabling the formation of teams that can meet various issues efficiently." (p.4)

### On Multi-Step Coding

> "we transform the code change generation into the multi-step coding process that is designed to leverage the strengths of LLMs in code generation while mitigating their weaknesses in code change generation." (p.6)

### On QA Engineer Necessity

> "To address this problem, our framework pairs each Developer agent with a QA Engineer agent, designed to offer task-specific, timely feedback." (p.5)

### On Performance Gains

> "our framework's effectiveness is eight-fold that of the base LLM, GPT-4. This substantial increase underscores our framework's capability to harness the potential of LLMs more effectively." (p.7)

### On Line Locating Priority

> "the Developer agent should prioritize improving its capability of locating code lines" (p.9)

## Related AIWG Components

| Component | Relevance |
|-----------|-----------|
| `@agentic/code/addons/code-intelligence/` | Memory mechanism implementation location |
| `@agentic/code/frameworks/sdlc-complete/agents/code-writer.md` | Line localization protocol |
| `@agentic/code/frameworks/sdlc-complete/agents/project-manager.md` | Multi-file decomposition |
| `@agentic/code/addons/collaboration/` | Planning meetings, paired reviews (new) |
| `@.claude/skills/planning-meeting.md` | Kick-off meeting implementation (new) |

## References

- **Source Paper**: Tao, W. et al. (2024). [MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue ReSolution](https://arxiv.org/abs/2403.17927). arXiv:2403.17927v2
- **Benchmark**: [SWE-bench](https://www.swebench.com/)
- **AIWG Documentation**: SDLC Framework, Multi-Agent Pattern, Agent Catalog
- **Related Papers**: REF-001 (Production patterns), REF-002 (Failure archetypes complement MAGIS recovery patterns)
