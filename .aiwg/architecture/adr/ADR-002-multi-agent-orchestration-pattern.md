# ADR-002: Multi-Agent Orchestration Pattern

**Date**: 2024-10-17
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: System Architecture

## Context

Complex SDLC artifacts (Software Architecture Documents, Test Plans, Deployment Runbooks) require multiple perspectives to achieve enterprise-grade quality. Traditional single-agent generation produces documents that lack:

- **Comprehensive review**: Security, performance, testability perspectives missing
- **Quality assurance**: No systematic review before finalization
- **Traceability**: Hard to track who contributed what and when
- **Consensus building**: No mechanism for resolving conflicting recommendations

The challenge is orchestrating multiple specialized agents efficiently while maintaining coherent document flow and avoiding context explosion.

## Decision

Implement a **Primary Author → Parallel Reviewers → Synthesizer → Archive** orchestration pattern:

```text
┌─────────────┐
│Primary Author│ (Creates initial draft)
└──────┬──────┘
       ↓
┌──────────────────────────────────┐
│     Parallel Review Phase        │
│  ┌──────────┐  ┌──────────┐     │
│  │Security  │  │Test      │     │ (Launch in single message)
│  │Architect │  │Architect │     │
│  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐     │
│  │Requirem. │  │Technical │     │
│  │Analyst   │  │Writer    │     │
│  └──────────┘  └──────────┘     │
└──────────────────────────────────┘
               ↓
        ┌──────────┐
        │Synthesizer│ (Merges feedback)
        └─────┬─────┘
              ↓
        ┌─────────┐
        │ Archive │ (Final baseline)
        └─────────┘
```

**Key principles**:
1. **Single Primary Author** per artifact (clear ownership)
2. **Parallel Reviewers** launched in one message (efficiency)
3. **Explicit Synthesis** step (conflict resolution)
4. **Structured Archive** (audit trail)

## Consequences

### Positive
- **Higher quality**: Multiple perspectives catch more issues
- **Faster reviews**: Parallel execution vs serial bottleneck
- **Full traceability**: Every review documented
- **Conflict resolution**: Synthesizer handles disagreements
- **Enterprise-ready**: Mimics real-world review processes

### Negative
- **Complexity overhead**: More coordination required
- **Longer generation time**: Multiple passes vs single shot
- **Potential conflicts**: Reviewers may disagree
- **Resource intensive**: Multiple agents running simultaneously
- **Synthesis challenges**: Merging feedback requires intelligence

### Neutral
- Changes fundamental generation approach from single to multi-pass
- Requires working directory structure for drafts and reviews
- Success depends on synthesizer agent quality

## Alternatives Considered

### 1. Single-Agent Generation
**Rejected**: Insufficient quality for enterprise artifacts, no review perspective

### 2. Serial Review Chain
**Rejected**: Too slow, creates bottlenecks, earlier reviews might be invalidated

### 3. Voting System (majority wins)
**Rejected**: Loses nuance, might discard valid minority concerns

### 4. Round-Robin Reviews
**Rejected**: Inefficient, doesn't leverage parallelism

### 5. Hierarchical Review (senior reviews junior)
**Rejected**: Creates artificial hierarchy, slows process

## Implementation Status

✅ Pattern documented in orchestration flows
✅ Working directory structure defined (`.aiwg/working/`)
✅ Synthesizer agents configured
✅ Parallel launch guidance in CLAUDE.md

## Example Implementation

```python
# Vision Document Generation (actual flow)
Step 1: Product Owner creates draft
Step 2: Parallel reviews (single message):
  - Market Researcher → Market validation
  - Scrum Master → Feasibility check
  - User Researcher → User value
  - Security Architect → Compliance
Step 3: Documentation Synthesizer merges
Step 4: Archive to .aiwg/requirements/vision.md
```

## Quality Gates

Before marking synthesis complete:
- [ ] All reviewers have responded
- [ ] Conflicts explicitly resolved
- [ ] Final document coherent
- [ ] Traceability maintained
- [ ] Archive location correct

## Related Decisions

- ADR-001: Modular Deployment (SDLC mode uses this heavily)
- ADR-005: Template-Based Generation (templates guide multi-agent flow)

## References

- Pattern Documentation: `docs/multi-agent-documentation-pattern.md`
- Orchestrator Architecture: `docs/orchestrator-architecture.md`
- Example Flows: `commands/flow-*.md`