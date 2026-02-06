# Agent Teams Evaluation for SDLC Workflows

**Status**: Research Output
**Created**: 2026-02-06
**Issue**: #280
**Feature**: Claude Code v2.1.32 Agent Teams (Experimental)

## Executive Summary

**Recommendation**: **MONITOR** but do not adopt Agent Teams at this time.

Agent Teams is an experimental feature (requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) that enables multi-agent collaboration via tmux sessions with `TeammateIdle` and `TaskCompleted` hook events. While conceptually promising for SDLC workflows, the feature has significant limitations that make it unsuitable for AIWG adoption:

- **Experimental status**: API may change, stability unknown
- **Platform lock-in**: tmux dependency limits cross-platform support
- **Cost implications**: Estimated 2-3x token cost vs sequential orchestration
- **Coordination overhead**: State synchronization challenges for artifact handoffs
- **Limited graduation criteria**: Unclear when feature will stabilize

AIWG should maintain its sequential orchestration pattern as the cross-platform default and monitor Agent Teams as it matures.

---

## 1. Current AIWG Orchestration Pattern

### Sequential Task-Based Orchestration

AIWG currently uses a **sequential, orchestrator-driven pattern** where the core Claude Code platform (or main agent) coordinates all multi-agent workflows via the Task tool.

**Pattern**:
```
User: "Let's transition to Elaboration"
  ↓
Core Platform (Orchestrator):
  1. Interpret intent → map to flow template
  2. Read flow-inception-to-elaboration.md as orchestration guide
  3. Extract agent assignments from template
  4. Launch Task tool agents sequentially or in parallel:
     - Primary Author creates draft
     - Parallel Reviewers (3-5) provide feedback
     - Documentation Synthesizer merges consensus
  5. Finalize artifacts to .aiwg/
```

### Key Characteristics

| Aspect | Current Implementation |
|--------|----------------------|
| **Control Flow** | Centralized via orchestrator |
| **Agent Coordination** | Task tool invocations with explicit prompts |
| **Parallelism** | Launch multiple Task calls in single message |
| **Context Management** | Orchestrator maintains workflow state |
| **Artifact Handoff** | Via file paths (`.aiwg/working/`) |
| **State Preservation** | Sequential execution preserves context chain |
| **Error Handling** | Orchestrator detects and recovers from failures |
| **Progress Tracking** | Orchestrator reports status to user |

### Example: Software Architecture Document Generation

**Step 1**: Primary Author
```python
Task(
    subagent_type="architecture-designer",
    description="Create SAD draft",
    prompt="""
    Read template: $AIWG_ROOT/templates/analysis-design/software-architecture-doc-template.md
    Read requirements from: .aiwg/requirements/
    Create initial SAD draft
    Save to: .aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md
    """
)
```

**Step 2**: Parallel Reviewers (single message, multiple Task calls)
```python
# All launched simultaneously
Task(security-architect): Security validation
Task(test-architect): Testability review
Task(requirements-analyst): Requirements traceability
Task(technical-writer): Clarity and consistency

# Each creates: .aiwg/working/architecture/sad/reviews/{role}-review.md
```

**Step 3**: Synthesizer
```python
Task(
    subagent_type="documentation-synthesizer",
    description="Merge SAD feedback",
    prompt="""
    Read all reviews from: .aiwg/working/architecture/sad/reviews/
    Merge feedback, resolve conflicts
    Create final: .aiwg/architecture/software-architecture-doc.md
    """
)
```

**Step 4**: Archive (orchestrator)
```python
archive_workflow(".aiwg/working/architecture/sad/", ".aiwg/archive/2025-10/sad-complete/")
```

### Strengths of Current Pattern

1. **Explicit control flow** - Clear orchestration logic in templates
2. **Debuggable** - Task invocations are visible in conversation
3. **Cross-platform** - Works with all Task-supporting platforms
4. **Cost-efficient** - Context shared via orchestrator, minimal duplication
5. **Error recovery** - Orchestrator can detect failures and retry
6. **Progress visibility** - User sees orchestrator status updates
7. **Artifact management** - Centralized file tracking via orchestrator

### Weaknesses of Current Pattern

1. **Sequential bottleneck** - Orchestrator must wait for each Task to complete before proceeding
2. **No peer-to-peer** - Agents cannot directly communicate (must go through orchestrator)
3. **Rigid coordination** - Workflow must be pre-defined in template
4. **Limited autonomy** - Agents cannot self-organize or adapt workflow

---

## 2. Agent Teams Overview

### What Agent Teams Enables

**From Claude Code v2.1.32 Changelog**:
> Multi-agent collaboration via tmux sessions with TeammateIdle and TaskCompleted hooks.

**Core Concept**: Agents can collaborate directly without central orchestrator bottleneck, using hook events to detect when teammates finish work or when the overall task is complete.

### Hook Events

| Hook | Trigger | Purpose |
|------|---------|---------|
| `TeammateIdle` | A teammate finishes their current work | Enables handoffs, turn-taking, or parallel work |
| `TaskCompleted` | Overall task is done | Signals workflow completion |

### Enabling Agent Teams

Requires experimental flag:
```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

### Team Collaboration Pattern

**Conceptual Flow**:
```
Agent-1 ←→ Agent-2 ←→ Agent-3
    ↓ TeammateIdle    ↓ TaskCompleted
         Orchestrator (optional)
```

**Possible Patterns**:

1. **Triangular Review**: Requirements Analyst ↔ Architecture Designer ↔ Security Auditor
2. **Peer Review Team**: Code Reviewer + Security Auditor + Test Engineer
3. **Documentation Team**: Technical Writer + API Documenter + Architecture Documenter

### Differences from Current Pattern

| Aspect | Sequential Orchestration | Agent Teams |
|--------|-------------------------|-------------|
| Communication | Through orchestrator | Direct peer-to-peer |
| Coordination | Explicit Task calls | Autonomous via hooks |
| Parallelism | Launch multiple Tasks | Native multi-agent tmux |
| Context | Shared via orchestrator | Per-agent separate contexts |
| Workflow | Pre-defined templates | Emergent/adaptive |
| Control | Centralized | Decentralized |

---

## 3. Feasibility Analysis for SDLC Workflows

### Candidate Workflow #1: Inception Triangle

**Agents**: Requirements Analyst ↔ Architecture Designer ↔ Security Auditor

**Goal**: Iterative refinement of requirements through multi-perspective dialogue.

**Team Pattern**:
```
Requirements Analyst proposes use case
  ↓ TeammateIdle
Architecture Designer reviews for feasibility
  ↓ TeammateIdle
Security Auditor reviews for threats
  ↓ TeammateIdle
Requirements Analyst refines based on feedback
  ... continue until consensus ...
  ↓ TaskCompleted
Final use case baselined
```

**Feasibility Assessment**:

| Criterion | Assessment | Notes |
|-----------|-----------|-------|
| **Autonomy** | Medium | Agents must know when to speak vs wait |
| **Artifact Management** | Complex | Three agents editing same files - merge conflicts |
| **Termination** | Unclear | How do agents decide task is complete? |
| **Cost** | High | 3x agent contexts maintained throughout |
| **Coordination Overhead** | High | Hook handlers must orchestrate turn-taking |

**Verdict**: **FEASIBLE but costly**. Current sequential pattern with parallel review is more efficient and predictable.

### Candidate Workflow #2: Code Review Team

**Agents**: Code Reviewer + Security Auditor + Test Engineer

**Goal**: Multi-perspective code review with comprehensive feedback.

**Team Pattern**:
```
Code Reviewer analyzes logic/style
Security Auditor checks vulnerabilities
Test Engineer validates test coverage
  ... all work in parallel ...
  ↓ TeammateIdle (each agent)
Synthesizer collects all feedback
  ↓ TaskCompleted
Final review report
```

**Feasibility Assessment**:

| Criterion | Assessment | Notes |
|-----------|-----------|-------|
| **Autonomy** | High | Independent review tasks |
| **Artifact Management** | Simple | Read-only code review, separate feedback files |
| **Termination** | Clear | All reviews complete = TaskCompleted |
| **Cost** | Medium-High | 3x agent contexts, but read-only reduces overhead |
| **Coordination Overhead** | Low | No inter-agent dependencies |

**Verdict**: **FEASIBLE and appropriate**. This is genuinely parallel work with no coordination needed. However, current pattern (single message with 3x Task calls) achieves same parallelism with less overhead.

### Candidate Workflow #3: Documentation Team

**Agents**: Technical Writer + API Documenter + Architecture Documenter

**Goal**: Generate comprehensive documentation from multiple perspectives.

**Team Pattern**:
```
Technical Writer creates user-facing docs
API Documenter generates API reference
Architecture Documenter creates technical specs
  ... all work in parallel ...
  ↓ TeammateIdle (each agent)
Documentation Synthesizer merges and cross-links
  ↓ TaskCompleted
Final documentation set
```

**Feasibility Assessment**:

| Criterion | Assessment | Notes |
|-----------|-----------|-------|
| **Autonomy** | High | Independent documentation tasks |
| **Artifact Management** | Medium | Separate files but need cross-linking |
| **Termination** | Clear | All docs complete = TaskCompleted |
| **Cost** | High | 3x agent contexts writing separate files |
| **Coordination Overhead** | Medium | Cross-linking requires coordination |

**Verdict**: **FEASIBLE but questionable value**. Current pattern handles this efficiently with sequential or parallel Task calls.

---

## 4. Cost Analysis

### Sequential Orchestration Token Costs

**Pattern**: Orchestrator → Task(agent-1) → Task(agent-2) → Task(agent-3) → Synthesizer

**Token Breakdown** (example for Architecture Review):

| Agent Invocation | Context Loaded | Tokens (est.) |
|-----------------|----------------|---------------|
| Orchestrator reads template | Flow template + requirements | 5,000 |
| Task(architecture-designer) | Template + requirements | 8,000 |
| Task(security-architect) | Draft SAD | 6,000 |
| Task(test-architect) | Draft SAD | 6,000 |
| Task(requirements-analyst) | Draft SAD | 6,000 |
| Task(synthesizer) | Draft + 3 reviews | 10,000 |
| **TOTAL** | | **~41,000 tokens** |

**Key Efficiency**: Orchestrator context is shared. Reviewers only load draft, not full requirements history.

### Agent Teams Token Costs

**Pattern**: Agent-1 ↔ Agent-2 ↔ Agent-3 (separate contexts)

**Token Breakdown** (same workflow with teams):

| Agent | Context Loaded | Tokens (est.) |
|-------|----------------|---------------|
| Architecture Designer | Template + requirements + review history | 12,000 |
| Security Architect | Full conversation + draft | 15,000 |
| Test Architect | Full conversation + draft | 15,000 |
| Requirements Analyst | Full conversation + draft + feedback | 15,000 |
| Synthesizer | Full conversation + all artifacts | 18,000 |
| **TOTAL** | | **~75,000 tokens** |

**Key Inefficiency**: Each agent maintains separate context. Repeated loading of conversation history across agents.

### Cost Comparison

| Metric | Sequential | Agent Teams | Difference |
|--------|-----------|-------------|-----------|
| **Total tokens** | ~41,000 | ~75,000 | **+83% cost** |
| **Context duplication** | Minimal | High | Conversation replicated per agent |
| **Coordination overhead** | Low | Medium | Hook handlers, synchronization |
| **Latency** | Sequential wait | Parallel execution | Faster wall-clock time |

**Estimated Cost Multiplier**: **1.8-3x** for team-based workflows compared to sequential orchestration.

**Cost-Benefit Analysis**:
- **Benefit**: Reduced latency for genuinely parallel work (e.g., code review)
- **Cost**: 2-3x token consumption due to context duplication
- **Verdict**: Only cost-effective for workflows where latency is critical AND tasks are genuinely independent

---

## 5. Risks and Limitations

### Risk #1: Experimental Status

**Risk**: API may change without notice.

**Impact**: HIGH - Integration code may break across Claude Code updates.

**Mitigation**: Monitor changelog closely, version pin Claude Code if adopting early.

**Recommendation**: Wait for feature to exit experimental status.

### Risk #2: tmux Dependency

**Risk**: Agent Teams requires tmux sessions, limiting portability.

**Impact**: CRITICAL - Not available in all environments:
- ❌ Windows without WSL
- ❌ Docker containers without tmux
- ❌ Cloud IDEs (varies)
- ❌ CI/CD environments
- ✅ macOS/Linux with tmux installed

**Mitigation**: None - fundamental dependency.

**Recommendation**: Cannot be primary AIWG pattern due to cross-platform requirement.

### Risk #3: Token Cost Escalation

**Risk**: 2-3x token cost for team workflows due to context duplication.

**Impact**: HIGH - Significantly increases operational costs for SDLC workflows.

**Mitigation**:
- Use teams only for high-value, latency-sensitive workflows
- Prefer sequential orchestration for routine operations

**Recommendation**: Cost-prohibitive for general-purpose SDLC orchestration.

### Risk #4: State Synchronization Challenges

**Risk**: Agents with separate contexts may have inconsistent views of artifact state.

**Impact**: MEDIUM - Merge conflicts, conflicting feedback, duplicate work.

**Example**:
```
Agent-1 reads .aiwg/working/sad-v0.1.md
Agent-2 also reads .aiwg/working/sad-v0.1.md
Agent-1 writes .aiwg/working/sad-v0.2.md
Agent-2 writes .aiwg/working/sad-v0.2.md (overwrites!)
```

**Mitigation**: Strict artifact locking or coordination protocol via hooks.

**Recommendation**: Requires additional coordination layer, negating team benefits.

### Risk #5: Unclear Termination

**Risk**: How do agents decide when the team task is complete?

**Impact**: MEDIUM - Workflows may run indefinitely or terminate prematurely.

**Mitigation**: Explicit termination criteria, TaskCompleted hook logic.

**Recommendation**: Adds complexity vs explicit orchestrator control.

### Risk #6: Debugging Complexity

**Risk**: Multi-agent conversations in separate tmux sessions are harder to debug.

**Impact**: MEDIUM - Error tracing, audit trails, reproducibility suffer.

**Mitigation**: Comprehensive logging via hooks.

**Recommendation**: Current sequential pattern is easier to debug and audit.

### Risk #7: Limited Hook Documentation

**Risk**: TeammateIdle/TaskCompleted hook semantics are unclear from changelog.

**Impact**: HIGH - Cannot implement robust team workflows without understanding:
- When does TeammateIdle fire?
- What data is available in hook context?
- How to signal TaskCompleted?
- Error handling patterns?

**Mitigation**: Experimental exploration, waiting for official documentation.

**Recommendation**: Feature is too immature for production adoption.

---

## 6. Graduation Criteria

AIWG should adopt Agent Teams **only when**:

### Criterion #1: Feature Exits Experimental Status

- [ ] `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` flag removed
- [ ] Feature documented in official Claude Code documentation
- [ ] API stability guaranteed (no breaking changes without major version bump)

### Criterion #2: Cost-Benefit Analysis Positive

- [ ] Token cost analysis shows net positive for specific workflows
- [ ] Latency improvements justify 2-3x cost increase
- [ ] Cost calculators available for team vs sequential comparison

### Criterion #3: Cross-Platform Alternative Exists

- [ ] tmux dependency removed OR
- [ ] Platform-agnostic team coordination mechanism available OR
- [ ] Graceful fallback to sequential orchestration on unsupported platforms

### Criterion #4: Robust Coordination Patterns Documented

- [ ] Official examples of artifact handoff patterns
- [ ] State synchronization best practices documented
- [ ] Error recovery patterns for team failures
- [ ] Termination criteria patterns documented

### Criterion #5: Reliability Comparable to Sequential Pattern

- [ ] Error rate ≤ sequential orchestration
- [ ] Reproducibility supported (deterministic team behavior)
- [ ] Audit trails for multi-agent conversations
- [ ] Debugging tools for team workflows

### Criterion #6: Hook Ecosystem Mature

- [ ] TeammateIdle hook semantics fully documented
- [ ] TaskCompleted hook semantics fully documented
- [ ] Hook error handling patterns clear
- [ ] Hook testing frameworks available

**Current Status**: **0/6 criteria met**

**Estimated Timeline to Graduation**: 6-12 months (based on typical experimental feature lifecycle)

---

## 7. Recommendation

### Monitor, Do Not Adopt

**Status**: Agent Teams is experimental and immature for AIWG production use.

**Rationale**:
1. **Experimental flag required** - API instability risk
2. **Platform lock-in** - tmux dependency breaks cross-platform support
3. **Cost-prohibitive** - 2-3x token cost without clear benefits for most workflows
4. **Coordination complexity** - State synchronization challenges
5. **Limited documentation** - Hook semantics unclear

### Create Reference Implementations

To prepare for potential future adoption, create **reference hook handlers** as learning tools:

**`.claude/hooks/agent-teams/teammate-idle.js`** (example):
```javascript
export default function({ agent_id, agent_type }) {
  // Log when teammate becomes idle
  const log = {
    event: 'teammate_idle',
    agent_id,
    agent_type,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(log));

  // Placeholder for future coordination logic
  // TODO: Implement handoff patterns when feature stabilizes
}
```

**`.claude/hooks/agent-teams/task-completed.js`** (example):
```javascript
export default function({ team_id, task_summary }) {
  // Log when team task completes
  const log = {
    event: 'task_completed',
    team_id,
    task_summary,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(log));

  // Placeholder for future workflow finalization
  // TODO: Implement artifact collection when feature stabilizes
}
```

**Purpose**: Learning and experimentation, not production use.

### Maintain Sequential Orchestration as Default

AIWG's current sequential Task-based orchestration should remain the **primary pattern** for all SDLC workflows:

**Reasons**:
1. **Cross-platform** - Works everywhere Task tool is supported
2. **Cost-efficient** - Minimal context duplication
3. **Debuggable** - Clear orchestration flow in conversation
4. **Reliable** - Proven pattern with predictable behavior
5. **Well-documented** - Extensive examples in AIWG templates

**No code changes needed** - Current architecture is sound.

### Monitor Changelog for Graduation Signals

Track Claude Code releases for:
- Removal of experimental flag
- Official documentation for Agent Teams
- Cost optimization announcements
- Cross-platform support

**Review cadence**: Quarterly evaluation of graduation criteria.

---

## 8. Cross-Platform Note

### Agent Teams is Claude Code-Specific

**Important**: Agent Teams via tmux sessions is a **Claude Code-specific feature**. It is not part of:
- Anthropic Claude API
- OpenAI Agent API
- Google Gemini agents
- Microsoft Copilot agents
- Other agent platforms

**AIWG's Mission**: Cross-platform SDLC framework.

**Implication**: Even if Agent Teams graduates and becomes stable, AIWG must maintain sequential orchestration as the **cross-platform default pattern** to support:
- Claude Code users (with optional Agent Teams optimization)
- GitHub Copilot users (Task-equivalent orchestration)
- Factory AI users (agent dispatch patterns)
- OpenCode users (agent workflow patterns)
- Cursor users (agent invocation patterns)
- Any future platforms supporting multi-agent workflows

**Strategy**:
```
AIWG Core Pattern:
  Sequential Task-based orchestration (works everywhere)

Optional Optimization:
  Agent Teams (Claude Code only, when mature)
```

**No platform lock-in** - AIWG remains portable.

---

## 9. Open Questions

### Q1: Hook Event Details

**Question**: What exactly does TeammateIdle provide in hook context?

**Unknown**:
- Agent state information?
- Artifacts produced?
- Time idle?
- Next agent to activate?

**Action**: Experimental exploration when feature stabilizes.

### Q2: Team Size Limits

**Question**: How many agents can be in a team?

**Unknown**:
- tmux session limits?
- Context window implications?
- Performance degradation?

**Action**: Benchmark when feature exits experimental.

### Q3: Team Lifecycle Management

**Question**: How are teams created, paused, resumed, terminated?

**Unknown**:
- Explicit API calls?
- Implicit via hooks?
- Integration with named sessions?

**Action**: Await official documentation.

### Q4: Error Recovery

**Question**: What happens when a team member fails?

**Unknown**:
- Does team continue?
- How to restart failed agent?
- Error propagation semantics?

**Action**: Test error scenarios when stable.

### Q5: Artifact Coordination

**Question**: How do teams avoid merge conflicts on shared artifacts?

**Unknown**:
- Built-in locking?
- Convention-based coordination?
- Hook-driven handoffs?

**Action**: Design patterns when feature matures.

---

## 10. References

- **Claude Code v2.1.32 Changelog**: Agent Teams feature introduction
- **AIWG Orchestrator Architecture**: `@agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
- **AIWG Feature Leverage Analysis**: `@.aiwg/planning/claude-code-features-leverage.md`
- **Multi-Agent Documentation Pattern**: `@agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-06 | AIWG Analysis | Initial evaluation of Agent Teams for SDLC workflows |
