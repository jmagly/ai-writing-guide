---
ref: REF-DUAL
title: "Dual-Track Delivery: SAFe and RUP Citations"
authors:
  - "AIWG Research Team"
year: 2026
topics:
  - dual-track-agile
  - safe
  - rup
  - parallel-delivery
license:
  type: CC-BY-4.0
  commercial: true
aiwg_relevance: HIGH
quality_rating: 4
---

# Dual-Track Delivery: SAFe and RUP Citations

## Overview

This document provides academic and industry citations for AIWG's dual-track delivery pattern (parallel Research + Main delivery streams).

## AIWG Dual-Track Pattern

AIWG implements a dual-track delivery model:

| Track | Purpose | Artifacts | Cadence |
|-------|---------|-----------|---------|
| **Discovery Track** | Research, validation, design | Research findings, prototypes, validated requirements | Continuous |
| **Delivery Track** | Implementation, testing, deployment | Code, tests, documentation | Iteration-based |

## Industry Frameworks

### SAFe 6.0: Dual-Track Agile

**Citation**: Scaled Agile, Inc. (2023). SAFe 6.0 Framework. scaledagileframework.com

**Key Concepts**:

1. **Continuous Exploration**: Discovery track for innovation and validation
2. **Continuous Integration**: Delivery track for implementation
3. **Parallel Cadences**: Both tracks run simultaneously with synchronization points
4. **Lean Portfolio Management**: Investment decisions span both tracks

**SAFe Dual-Track Model**:
```
Discovery Track (Exploration)
├── Customer interviews
├── Design sprints
├── Prototyping
└── Validation testing

Delivery Track (Exploitation)
├── Sprint planning
├── Development
├── Testing
└── Deployment
```

**AIWG Alignment**:
- SAFe's Continuous Exploration → AIWG Discovery Track
- SAFe's Continuous Integration → AIWG Delivery Track
- Both use synchronization points (AIWG: phase gates)

### Rational Unified Process (RUP)

**Citation**: Kruchten, P. (2003). The Rational Unified Process: An Introduction (3rd ed.). Addison-Wesley.

**Key Concepts**:

1. **Parallel Workflows**: Requirements, analysis, design, implementation, test run concurrently
2. **Risk-Driven Iterations**: Address highest-risk items first
3. **Architecture-Centric**: Early focus on architecture decisions
4. **Iterative Development**: Multiple iterations within each phase

**RUP Workflow Parallelism**:
```
Phase:    Inception | Elaboration | Construction | Transition
----------|----------|-------------|-------------|-----------
Business  |  █████   |   ██████    |     ███     |    ██
Modeling  |          |             |             |
----------|----------|-------------|-------------|-----------
Require-  |  ████    |  ████████   |   ████████  |   ███
ments     |          |             |             |
----------|----------|-------------|-------------|-----------
Analysis  |   ███    | █████████   |   ██████    |   ██
& Design  |          |             |             |
----------|----------|-------------|-------------|-----------
Implement-|   ██     |  ███████    | ███████████ |  █████
ation     |          |             |             |
----------|----------|-------------|-------------|-----------
Test      |   █      |   █████     | ███████████ | ███████
          |          |             |             |
```

**AIWG Alignment**:
- RUP's parallel workflows → AIWG's concurrent Discovery/Delivery
- RUP's phases → AIWG's SDLC phases
- RUP's risk-driven approach → AIWG's research-backed prioritization

### Lean UX

**Citation**: Gothelf, J., & Seiden, J. (2016). Lean UX: Designing Great Products with Agile Teams (2nd ed.). O'Reilly Media.

**Key Concepts**:

1. **Continuous Discovery**: Never stop learning about users
2. **Build-Measure-Learn**: Rapid hypothesis testing
3. **Cross-Functional Collaboration**: Design and development in parallel
4. **Minimal Documentation**: Just enough to align the team

**AIWG Alignment**:
- Lean UX's continuous discovery → AIWG Discovery Track
- Build-Measure-Learn → AIWG's iterative refinement

## Comparison: AIWG vs Industry Patterns

| Aspect | SAFe | RUP | Lean UX | AIWG |
|--------|------|-----|---------|------|
| Discovery track | Continuous Exploration | Business Modeling, Requirements | Continuous Discovery | Discovery Track |
| Delivery track | Continuous Integration | Implementation, Test | Build | Delivery Track |
| Synchronization | Program Increment | Iteration milestones | Sprint review | Phase gates |
| Documentation | Moderate | Heavy | Light | Research-backed |
| AI integration | Limited | None | None | Native |

## Benefits of Dual-Track for AI-Assisted Development

### 1. Reduced Hallucination Risk

Research track validates information before delivery track uses it:
- Discovery: Verify facts, gather citations
- Delivery: Use validated information

### 2. Continuous Learning

Parallel tracks enable:
- Discovery: Researches new techniques
- Delivery: Applies validated techniques
- Feedback loop: Delivery informs Discovery priorities

### 3. Risk Mitigation

Separate tracks for:
- Discovery: Exploratory work (can fail safely)
- Delivery: Committed work (high confidence)

### 4. Quality Improvement

Research findings flow into delivery:
- Discovery: Identifies best practices
- Delivery: Implements best practices
- Metrics: Track improvement from research application

## AIWG Implementation

### Phase Structure

```
AIWG Phase Structure
│
├── Concept Phase
│   ├── Discovery: Problem exploration
│   └── Delivery: Intake form
│
├── Inception Phase
│   ├── Discovery: Requirements research
│   └── Delivery: Use cases, stories
│
├── Elaboration Phase
│   ├── Discovery: Architecture patterns
│   └── Delivery: Architecture design
│
├── Construction Phase
│   ├── Discovery: Implementation patterns
│   └── Delivery: Code, tests
│
└── Transition Phase
    ├── Discovery: Deployment patterns
    └── Delivery: Deployment, handoff
```

### Synchronization Points

| Gate | Discovery Deliverable | Delivery Deliverable |
|------|----------------------|---------------------|
| Inception Gate | Research findings | Validated requirements |
| Elaboration Gate | Pattern analysis | Architecture design |
| Construction Gate | Best practices | Tested code |
| Transition Gate | Operational patterns | Deployment plan |

### Workflow Integration

```yaml
dual_track_workflow:
  discovery:
    inputs:
      - user_questions
      - delivery_feedback
      - external_research
    outputs:
      - research_findings
      - validated_patterns
      - recommendations
    agents:
      - Technical Researcher
      - Domain Expert

  delivery:
    inputs:
      - requirements
      - research_findings
      - architecture
    outputs:
      - code
      - tests
      - documentation
    agents:
      - Software Implementer
      - Test Engineer

  synchronization:
    frequency: per_phase_gate
    mechanism: human_approval
    artifact_handoff: true
```

## Research Gaps

1. **Quantitative Validation**: No formal study comparing AIWG dual-track vs single-track
2. **Optimal Synchronization**: Unknown ideal frequency for track synchronization
3. **AI-Specific Patterns**: Limited research on dual-track for AI-assisted development

## Future Work

1. **Metrics Study**: Measure quality delta with/without Discovery track
2. **Synchronization Optimization**: Research optimal gate frequency
3. **AI Agent Specialization**: Dedicated Discovery vs Delivery agents

## Conclusion

AIWG's dual-track delivery pattern is well-grounded in established practices:
- SAFe's Continuous Exploration/Integration model
- RUP's parallel workflow execution
- Lean UX's continuous discovery approach

The pattern is particularly suited to AI-assisted development where:
- Information validation is critical (reduces hallucinations)
- Continuous learning improves quality
- Parallel work maximizes throughput

## References

1. Scaled Agile, Inc. (2023). SAFe 6.0 Framework. scaledagileframework.com
2. Kruchten, P. (2003). The Rational Unified Process: An Introduction (3rd ed.). Addison-Wesley.
3. Gothelf, J., & Seiden, J. (2016). Lean UX: Designing Great Products with Agile Teams (2nd ed.). O'Reilly Media.
4. Cagan, M. (2017). Dual-Track Agile. Silicon Valley Product Group.
5. Patton, J. (2014). User Story Mapping. O'Reilly Media.

## AIWG References

- @agentic/code/frameworks/sdlc-complete/README.md - SDLC framework
- @agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md - Orchestration
- @.aiwg/flows/flow-discovery-track.yaml - Discovery track flow
- @.aiwg/flows/flow-delivery-track.yaml - Delivery track flow
- #151 - Implementation issue

---

**Document Status**: ACTIVE
**Last Updated**: 2026-01-25
**Issue**: #151
