# REF-057 AIWG Analysis: Agent Laboratory

**Source**: @docs/references/REF-057-agent-laboratory.md

**Paper**: Schmidgall, S., et al. (2025). Agent Laboratory: Using LLM Agents as Research Assistants. arXiv:2501.04227.

**AIWG Relevance**: HIGH - Validates multi-agent research patterns; quantifies human-in-the-loop cost benefits (84% reduction); informs quality gate design.

---

## AIWG Concept Mapping

### Agent Laboratory → AIWG Implementation

| Agent Lab Concept | AIWG Implementation | Coverage |
|-------------------|---------------------|----------|
| Literature Review Agent | Research Acquisition commands | **Strong** |
| Experiment Agent | Test Engineer, DevOps Engineer | **Strong** |
| Analysis Agent | Gap Analysis commands | **Moderate** |
| Writing Agent | Technical Writer, Documentation agents | **Strong** |
| Orchestrator | Executive Orchestrator + Phase Gates | **Strong** |
| Human Gates | Phase transition approvals | **Strong** |
| 84% Cost Reduction Pattern | Draft-then-edit workflow | **Implicit** |
| Quality Metrics Gap | Manual review gates | **Partial** |

### Three-Phase Pipeline Mapping

| Agent Lab Phase | AIWG Equivalent | Commands |
|-----------------|-----------------|----------|
| **Literature Review** | Research Framework | `/research-discover`, `/research-acquire` |
| **Experimentation** | Construction Phase | Test Engineer, build validation |
| **Report Writing** | Documentation | Technical Writer, `/research-document` |

---

## Key Findings for AIWG

### 1. Human-in-the-Loop is Non-Negotiable

**Agent Lab Finding**:
> "Human oversight remains essential at decision points: hypothesis selection, result interpretation, and final approval."

**AIWG Implementation**:
- Phase gate approvals require explicit human confirmation
- `--approve-gates` flag for batch approval vs individual review
- "Final" artifacts never auto-approved without human review

**Enhancement Opportunity**: Make human gates explicit in flow command output:

```
Phase: Elaboration → Construction
Gate Check:
  ✓ Requirements complete (auto-validated)
  ✓ Architecture documented (auto-validated)
  ⏸ HUMAN APPROVAL REQUIRED: Architecture approach acceptable?

  [approve] [reject] [request-changes]
```

### 2. The 84% Cost Reduction Context

**What Gets Automated (clerical work)**:
- Paper discovery and search
- Metadata extraction
- Initial summarization
- Citation formatting
- Draft generation

**What Stays Human (judgment)**:
- Topic relevance assessment
- Methodology evaluation
- Integration priority decisions
- Final approval

**AIWG Pattern**:
```yaml
research_workflow:
  automated:
    - search_academic_apis
    - extract_metadata
    - generate_initial_summary
    - format_citations

  human_gate:
    - topic_relevance_check
    - quality_assessment
    - integration_decision
```

### 3. The Evaluation Gap

**Agent Lab Finding**:
> "A gap exists between automated evaluation metrics and human quality assessment."

**AIWG Implication**: Automated validation (lint, tests, coverage) is necessary but insufficient. Human review gates cannot be bypassed by passing automated checks.

**Implementation**:
```yaml
# Phase gate check structure
gate_check:
  automated_validations:
    - lint_passing: required
    - tests_passing: required
    - coverage_threshold: 80%

  human_validations:
    - technical_accuracy: required
    - completeness: required
    - alignment_with_goals: required

  gate_passes_when:
    rule: "automated_ALL_pass AND human_ALL_approved"
```

---

## Draft-Then-Edit Pattern Implementation

### Pattern Definition

Based on Agent Laboratory's 84% cost reduction finding:

```
Agent Draft → Human Review → Human Edit → Agent Polish → Human Approve
```

### AIWG Implementation Examples

#### Research Documentation

```markdown
## Workflow: Research Paper Documentation

### Step 1: Agent Draft (Automated)
- Research Acquisition Agent generates initial REF-XXX.md
- Extracts metadata, summary, key quotes
- Formats cross-references

### Step 2: Human Review (Manual Gate)
- Researcher reviews draft for accuracy
- Flags errors, missing sections
- Marks relevance assessment

### Step 3: Human Edit (Manual)
- Researcher adds domain expertise
- Corrects technical errors
- Enhances AIWG-specific analysis

### Step 4: Agent Polish (Automated)
- Technical Writer agent improves prose
- Ensures template compliance
- Validates cross-references

### Step 5: Human Approve (Manual Gate)
- Final review before integration
- Confirm ready for citation
```

#### SDLC Artifacts

```markdown
## Pattern: Architecture Decision Record (ADR)

### Step 1: Agent Draft
- Architecture Designer generates ADR template
- Fills options based on context
- Adds relevant references

### Step 2: Human Review
- Architect reviews technical accuracy
- Validates options completeness
- Checks trade-off analysis

### Step 3: Human Edit
- Architect adds business context
- Refines decision rationale
- Documents constraints

### Step 4: Agent Polish
- Technical Writer improves clarity
- Ensures ADR format compliance

### Step 5: Human Approve
- Lead architect signs off
- ADR becomes authoritative
```

---

## Human Gate Implementation

### Gate Types

| Gate Type | When Applied | Auto-Bypass? |
|-----------|--------------|--------------|
| **Topic Approval** | Before research acquisition | Never |
| **Quality Gate** | After draft generation | Never |
| **Phase Gate** | Between SDLC phases | Never |
| **Final Approval** | Before artifact marked complete | Never |
| **Routine Validation** | Lint, tests, format | Always auto |

### Gate Command Pattern

```bash
# Gate check with explicit human approval
/flow-gate-check --phase elaboration-to-construction --require-human

# Output:
# Automated Checks:
#   ✓ Requirements documented (10 use cases)
#   ✓ NFRs specified (8 modules)
#   ✓ Architecture documented (SAD complete)
#   ✓ ADRs recorded (5 decisions)
#
# Human Review Required:
#   ⏸ Architecture approach acceptable for project scale?
#   ⏸ Risk assessment adequate?
#   ⏸ Test strategy appropriate?
#
# Enter [approve/reject/defer]: _
```

---

## Multi-Agent Specialization Validation

### Agent Laboratory Validates AIWG Pattern

Agent Laboratory uses specialized agents per phase. AIWG uses 53 specialized SDLC agents. This validates the design choice.

**Key Alignment**:
- Agent Lab: Literature Agent → Experiment Agent → Writing Agent
- AIWG: Research Acquisition → Test Engineer → Technical Writer

### Specialization Benefits (from paper)

| Benefit | Agent Lab Evidence | AIWG Implementation |
|---------|-------------------|---------------------|
| Task quality | Specialists outperform generalists | Role-based agent definitions |
| Cost efficiency | 84% reduction from specialization | Model tier per agent complexity |
| Coordination | Pipeline handoffs | Phase-based orchestration |
| Error isolation | Failures don't cascade | Agent boundaries in flows |

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Document Draft-Then-Edit Pattern

Add to CLAUDE.md:

```markdown
## Draft-Then-Edit Pattern

AIWG follows the draft-then-edit pattern validated by Agent Laboratory research (Schmidgall et al., 2025):

1. **Agent Draft**: AI generates initial artifact
2. **Human Review**: Expert reviews for accuracy
3. **Human Edit**: Expert adds domain knowledge
4. **Agent Polish**: AI improves clarity and compliance
5. **Human Approve**: Final sign-off

This pattern achieves 84% cost reduction by automating clerical work while keeping humans on judgment calls.

### When to Apply

| Artifact Type | Agent Draft? | Human Edit Required? |
|---------------|--------------|---------------------|
| REF-XXX documentation | Yes | Light review |
| Architecture decisions | Yes | Heavy edit |
| Security assessments | Yes | Heavy edit |
| Test plans | Yes | Moderate edit |
| Routine code | Yes | Light review |
| Critical code | Yes | Heavy edit |
```

#### 2. Explicit Human Gates in Flow Commands

Update flow command templates:

```yaml
# flow-elaboration-to-construction.yaml
gates:
  automated:
    - requirements_complete
    - architecture_documented
    - risks_assessed

  human_required:
    - name: "Architecture Approval"
      prompt: "Is the proposed architecture appropriate?"
      options: [approve, reject, request_changes]

    - name: "Risk Assessment"
      prompt: "Are identified risks acceptable?"
      options: [approve, reject, escalate]
```

#### 3. Cost-Benefit Tracking

Track what's automated vs human-reviewed:

```yaml
# .aiwg/metrics/cost-tracking.yaml
workflow_run:
  id: "run-2026-01-25-001"

  automated_operations:
    - type: "search"
      count: 15
      est_human_time_saved: "2h"
    - type: "draft_generation"
      count: 3
      est_human_time_saved: "6h"
    - type: "format_validation"
      count: 20
      est_human_time_saved: "1h"

  human_operations:
    - type: "gate_approval"
      count: 3
      actual_time: "15m"
    - type: "content_edit"
      count: 2
      actual_time: "1h"

  cost_reduction: "85%"  # (9h saved / 10.25h total)
```

### Short-Term (Enhancement)

#### 4. Quality Metric Calibration

Track correlation between automated and human assessments:

```yaml
# .aiwg/metrics/quality-calibration.yaml
artifact: "REF-057-analysis.md"
automated_scores:
  template_compliance: 95%
  cross_ref_completeness: 100%
  readability_score: 72

human_assessment:
  technical_accuracy: 4/5
  completeness: 5/5
  usefulness: 4/5

calibration_note: "Automated readability score doesn't capture domain terminology needs"
```

#### 5. Evaluation Gap Documentation

Document known gaps between automated metrics and human quality:

```markdown
## Known Evaluation Gaps

| Automated Metric | Human Assessment | Gap |
|------------------|------------------|-----|
| Readability score | Domain appropriateness | Jargon is necessary |
| Template compliance | Content quality | Format ≠ substance |
| Cross-ref count | Cross-ref relevance | Quantity ≠ quality |
| Test coverage | Test meaningfulness | Coverage ≠ value |
```

---

## Cross-References to AIWG Components

| Component | Location | Agent Lab Relevance |
|-----------|----------|---------------------|
| Research Acquisition | `/research-acquire` | Literature Review Agent pattern |
| Test Engineer | `agents/test-engineer.md` | Experiment Agent pattern |
| Technical Writer | `agents/technical-writer.md` | Writing Agent pattern |
| Phase Gates | `flow-gate-check` | Human Gate pattern |
| Executive Orchestrator | `agents/executive-orchestrator.md` | Orchestrator pattern |

---

## Key Quotes for Documentation

### On Cost Reduction:
> "Agent Laboratory achieves an 84% reduction in research costs while producing research outputs rated competitive with human-written papers."

### On Human-in-the-Loop:
> "Human oversight remains essential at decision points: hypothesis selection, result interpretation, and final approval."

### On Evaluation Gap:
> "A gap exists between automated evaluation metrics and human quality assessment."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional Term (Agent Lab) | Use In |
|-------------------|------------------------------|--------|
| Phase gates | Human-in-the-Loop Gates | All docs |
| Agent drafts | Automated Draft Generation | Technical docs |
| Human review | Quality Gates | Marketing |
| Multi-agent workflow | Specialized Agent Pipeline | Architecture docs |
| "AI assists, human decides" | Draft-Then-Edit Pattern | Marketing |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-057
**AIWG Priority**: HIGH
**Implementation Status**: Patterns align; explicit documentation needed
**Key Contribution**: Quantified validation of human-in-the-loop value
**Citable Statistic**: 84% cost reduction with HITL pattern
