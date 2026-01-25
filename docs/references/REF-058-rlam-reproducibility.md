# REF-058: R-LAM - Reproducibility-Constrained Large Action Models

## Citation

Sureshkumar, V., et al. (2026). R-LAM: Towards Reproducibility in Large Action Model Workflows. arXiv:2601.09749.

**arXiv**: https://arxiv.org/abs/2601.09749
**PDF**: https://arxiv.org/pdf/2601.09749

## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2026 |
| Type | Research Paper (Agentic AI) |
| Focus | Reproducibility in LLM agent workflows |
| AIWG Relevance | **Critical** - Directly informs Ralph loop design, provenance tracking, and workflow reproducibility |

## Executive Summary

R-LAM addresses the reproducibility crisis in Large Action Model workflows by introducing structured constraints and provenance tracking. Without these constraints, 47% of workflows produce different outputs across runs. The framework ensures complex multi-step agent workflows can be reliably reproduced, audited, and debugged.

### Key Insight

> "Without explicit reproducibility constraints, LAM workflows exhibit significant variance across runs, making debugging, auditing, and scientific validation nearly impossible."

**AIWG Implication**: AIWG's Ralph loops and agent workflows must incorporate R-LAM's five components or face the same reproducibility challenges.

---

## Five Core Components

### 1. Structured Action Schemas

Every action has explicit:
- Input/output contracts
- Version tracking
- Determinism classification
- Side effect declarations

### 2. Deterministic Execution Modes

| Mode | Description | AIWG Use Case |
|------|-------------|---------------|
| **Strict** | Same inputs → same outputs | Critical production workflows |
| **Seeded** | Randomness from fixed seed | Testing, benchmarking |
| **Logged** | Non-deterministic but fully logged | Exploratory research |
| **Cached** | Results cached for replay | Development, debugging |

### 3. Provenance Tracking

Every action records:
- **Inputs**: All parameters and their values
- **Outputs**: Complete results
- **Environment**: System state, versions, timestamps
- **Agent State**: Model, temperature, context
- **Dependencies**: Prior actions this depends on

### 4. Failure-Aware Execution

Pre-check → Execute → Post-verify with:
- Fail → Skip + Log
- Fail → Retry Policy
- Fail → Rollback + Alert

### 5. Workflow Forking

Support for checkpoints, branching, comparison, and merge of execution paths.

---

## Key Findings for AIWG

### 1. Variance Without Constraints

| Metric | Without R-LAM | With R-LAM |
|--------|---------------|------------|
| **Output consistency** | 53% | 98% |
| **Replay success** | 77% | 99.5% |
| **Debug time (median)** | 45 min | 14 min |
| **Audit completeness** | 34% | 100% |

**AIWG Implication**: Without provenance tracking, nearly half of Ralph loops may produce different results on re-run.

### 2. Acceptable Overhead

> "The 8-12% execution time overhead is considered acceptable for workflows where reproducibility and auditability are requirements."

**AIWG Implication**: The cost of tracking is low relative to the debugging/validation benefits.

### 3. Provenance Enables Trust

> "Use of W3C PROV has been previously demonstrated as a means to increase reproducibility and trust of computer-generated outputs."

**AIWG Implication**: Integrate W3C PROV (REF-062) patterns into research framework provenance tracking.

---

## AIWG Implementation Mapping

| R-LAM Component | AIWG Implementation | Rationale |
|-----------------|---------------------|-----------|
| **Action Schemas** | Command/skill definitions with explicit inputs/outputs/tools | Each command declares what it needs and produces |
| **Determinism Modes** | Agent configuration (`temperature: 0` for strict; logging for exploratory) | Different modes for different use cases |
| **Provenance Tracking** | `.aiwg/research/provenance/` directory with PROV-compliant records | Complete audit trail of all research operations |
| **Failure Handling** | Ralph loop recovery patterns; checkpoint/resume capability | Graceful handling of failures without losing progress |
| **Workflow Forking** | Git branching for experiment variations; checkpoint files for Ralph | Multiple execution paths can be compared |

---

## Specific AIWG Design Decisions Informed by R-LAM

### 1. Ralph Loop Checkpointing

**Decision**: Ralph loops save state after each successful iteration to `.aiwg/ralph/checkpoints/`.

**R-LAM Justification**: Workflow Forking component. If a loop fails or is interrupted, it can resume from the last checkpoint rather than starting over.

### 2. Provenance Directory Structure

**Decision**: Create `.aiwg/research/provenance/` with operation logs.

**R-LAM Justification**: Provenance Tracking component. Every research operation (acquisition, documentation, integration) gets a provenance record.

```yaml
# .aiwg/research/provenance/op-2026-01-25-001.yaml
operation:
  id: op-2026-01-25-001
  type: paper_acquisition
  timestamp: "2026-01-25T10:00:00Z"

  inputs:
    source_url: "https://arxiv.org/abs/2501.04227"
    target_ref: REF-057

  outputs:
    pdf_path: "pdfs/full/REF-057-agent-laboratory.pdf"
    doc_path: "docs/references/REF-057-agent-laboratory.md"

  agent:
    type: research-acquisition
    model: claude-3
    temperature: 0.0

  dependencies:
    - none

  status: completed
```

### 3. Determinism Configuration

**Decision**: Research framework operations default to `temperature: 0` (strict mode) unless explicitly set otherwise.

**R-LAM Justification**: Deterministic Execution Modes. For reproducibility, default to deterministic; opt-in to stochastic.

### 4. Failure Recovery Patterns

**Decision**: Every multi-step workflow must have defined recovery behavior:
- Pre-check existence of required inputs
- Execute with retry policy (max 3 attempts with backoff)
- Post-verify outputs exist and are valid
- On failure: log + alert + preserve partial state

**R-LAM Justification**: Failure-Aware Execution component. The 23% replay failure rate without R-LAM comes from missing failure handling.

### 5. Git-Based Workflow Forking

**Decision**: Use git branches for major experiment variations; use checkpoint files for iteration-level state.

**R-LAM Justification**: Workflow Forking component. Git provides comparison and merge; checkpoint files provide fine-grained recovery.

---

## Research Framework Application

### Provenance Schema

```yaml
# Standard provenance record format
provenance_record:
  id: string           # Unique operation ID
  type: string         # Operation type (acquisition, documentation, integration)
  timestamp: datetime  # ISO 8601 timestamp

  inputs:              # All input parameters
    key: value

  outputs:             # All output artifacts
    key: path

  agent:               # Agent that performed operation
    type: string
    model: string
    temperature: float
    version: string

  environment:         # System context
    git_commit: string
    working_dir: string

  dependencies:        # Prior operations this depends on
    - operation_id

  status: string       # completed | failed | partial
  error: string        # If status == failed
```

### Reproducibility Checklist

For every research operation:

- [ ] Inputs documented (source URL, parameters)
- [ ] Timestamp recorded
- [ ] Agent/model version logged
- [ ] Outputs checksummed
- [ ] Dependencies traced
- [ ] Recovery behavior defined
- [ ] Provenance record created

---

## Key Quotes

### On the problem:
> "Without explicit reproducibility constraints, LAM workflows exhibit significant variance across runs, making debugging, auditing, and scientific validation nearly impossible."

### On provenance:
> "Use of W3C PROV has been previously demonstrated as a means to increase reproducibility and trust of computer-generated outputs."

### On overhead:
> "The 8-12% execution time overhead is considered acceptable for workflows where reproducibility and auditability are requirements."

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-062** | W3C PROV provides the provenance standard R-LAM recommends |
| **REF-056** | FAIR R1.2 requires provenance; R-LAM provides implementation |
| **REF-057** | Agent Laboratory workflows need R-LAM for reproducibility |
| **REF-002** | Failure Modes identifies issues R-LAM's failure handling addresses |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Research Acquisition | Initial AIWG-specific analysis document |
