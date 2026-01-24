# REF-010: Stage-Gate Systems - A New Tool for Managing New Products

## Citation

Cooper, R. G. (1990). Stage-gate systems: A new tool for managing new products. *Business Horizons*, 33(3), 44-54.

**Link**: [ResearchGate](https://www.researchgate.net/publication/4883499_Stage-Gate_Systems_A_New_Tool_for_Managing_New_Products)

## Summary

Introduced the Stage-Gate process, a widely adopted framework for managing product development through a series of stages (work phases) and gates (decision points). Each gate evaluates deliverables against criteria before allowing progression. This disciplined approach reduces risk and improves success rates in complex projects.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Stage** | Work phase where activities occur |
| **Gate** | Decision checkpoint with go/kill/hold/recycle options |
| **Deliverables** | Required outputs evaluated at gates |
| **Gatekeepers** | Decision makers who evaluate gate criteria |

### Stage-Gate Model

```
Idea → [Gate 1] → Stage 1 → [Gate 2] → Stage 2 → [Gate 3] → ... → Launch
         ↓           ↓           ↓           ↓
       Screen    Scoping    Business    Development
                            Case
```

### Key Principles

1. **Quality of Execution**: Each stage has defined activities and deliverables
2. **Sharp Early Gates**: Front-end gates cull weak projects early
3. **Parallel Processing**: Activities within stages can be concurrent
4. **Cross-Functional Teams**: Gates involve multiple perspectives
5. **Integrated Milestones**: Technical and business criteria combined

## AIWG Application

### Direct Implementation: SDLC Phase Gates

AIWG's SDLC workflow is a **direct implementation of Stage-Gate**:

| Cooper's Stage-Gate | AIWG SDLC |
|--------------------|-----------|
| Stage 1: Scoping | Inception Phase |
| Gate 1: Screen | Lifecycle Objective (LO) |
| Stage 2: Build Business Case | Elaboration Phase |
| Gate 2: Go to Development | Lifecycle Architecture (LA) |
| Stage 3: Development | Construction Phase |
| Gate 3: Go to Testing | Initial Operational Capability (IOC) |
| Stage 4: Testing & Validation | Transition Phase |
| Gate 4: Go to Launch | Product Release (PR) |

### Gate Implementation

```markdown
# AIWG Gate Check Pattern

## Gate: Elaboration → Construction

### Required Deliverables
- [ ] Software Architecture Document (SAD) baselined
- [ ] Architecture Decision Records (3-5 ADRs) approved
- [ ] Master Test Plan defined
- [ ] Risk register updated

### Gatekeeper Review
- Architecture Designer: Technical soundness
- Security Architect: Security requirements
- Test Architect: Testability
- Project Manager: Schedule/resource feasibility

### Decision
- [ ] GO: All criteria met
- [ ] HOLD: Criteria gaps, define remediation
- [ ] RECYCLE: Return to Elaboration with feedback
- [ ] KILL: Project not viable
```

### Why Stage-Gate for AI Projects

Stage-Gate is particularly valuable for AI-augmented development:

1. **Uncertainty Management**: Gates catch AI-generated errors before they propagate
2. **Multi-Perspective Validation**: Multiple agents review at each gate
3. **Incremental Commitment**: Resources allocated after each successful gate
4. **Clear Milestones**: Both humans and AI have explicit targets

## Key Quotes

> "A Stage-Gate system is both a conceptual and an operational model for moving a new product from idea to launch."

> "Quality of execution is the number one success factor in new product development."

> "The gates provide quality control checkpoints where go/kill decisions are made."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Workflow Orchestration | **Critical** - phase gate pattern |
| Quality Control | **Critical** - gate criteria |
| Project Management | **High** - milestone tracking |

## Cross-References

- **Flow Commands**: `.claude/commands/flow-gate-check.md`
- **Phase Transitions**: `.claude/commands/flow-*-to-*.md`
- **SDLC Framework**: `agentic/code/frameworks/sdlc-complete/`

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
