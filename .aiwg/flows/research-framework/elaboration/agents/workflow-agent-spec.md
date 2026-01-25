# Agent Specification: Workflow Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Workflow Agent |
| **ID** | research-workflow-agent |
| **Purpose** | Orchestrate multi-stage research pipelines, manage DAG-based task dependencies, track progress, and handle failures with recovery |
| **Lifecycle Stage** | Orchestration (coordinates all stages) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Workflow Agent is the conductor of the Research Framework orchestra, orchestrating complex multi-stage workflows from discovery through archival. It creates and executes DAG-based (Directed Acyclic Graph) task dependencies, manages parallel execution with configurable concurrency, tracks real-time progress, handles stage failures with retry and recovery options, and generates comprehensive workflow reports. The agent enables users to complete complex research tasks (e.g., "comprehensive literature review on topic X") with a single command.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| DAG Construction | Build task dependency graphs from workflow templates | BR-WF-001 |
| Stage Orchestration | Execute stages in correct order with dependency enforcement | NFR-WF-03 |
| Parallel Execution | Run independent tasks concurrently with limits | NFR-WF-02 |
| Progress Tracking | Real-time status updates and time estimation | NFR-WF-04 |
| Failure Recovery | Resume from checkpoints, skip/retry failed tasks | NFR-WF-03 |
| Workflow Reporting | Generate completion reports with metrics | NFR-WF-05 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Dynamic Target Adjustment | Increase sources if quality filtering reduces count |
| Timeout Management | Enforce and extend stage timeouts |
| Partial Workflow | Execute subset of stages per user request |
| Workflow Templates | Pre-defined patterns for common research tasks |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | Execute agent commands, manage processes | Execute |
| Read | Access workflow templates, status files | Read |
| Write | Save status, reports, checkpoints | Write |
| Glob | Find workflow artifacts | Read |

### Agent Communication

| Agent | Interaction Type |
|-------|------------------|
| Discovery Agent | Task assignment, result collection |
| Acquisition Agent | Task assignment, result collection |
| Documentation Agent | Task assignment, result collection |
| Quality Agent | Task assignment, result collection |
| Citation Agent | Task assignment, result collection |
| Archival Agent | Task assignment, result collection |
| Provenance Agent | Event notification |

## 4. Triggers

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Full Workflow | `aiwg research workflow "topic" --deliverable TYPE` | Execute complete pipeline |
| Resume Workflow | `aiwg research workflow --resume WF-ID` | Resume from checkpoint |
| Partial Workflow | `aiwg research workflow --stages "discovery,documentation"` | Execute subset |
| Workflow Status | `aiwg research workflow --status WF-ID` | Check progress |
| Abort Workflow | `aiwg research workflow --abort WF-ID` | Cancel execution |

### Internal Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Stage Complete | Agent reports success | Start dependent stages |
| Stage Failed | Agent reports failure | Prompt for recovery action |
| Quality Gate | Quality scores available | Filter or supplement sources |
| Timeout | Stage exceeds limit | Prompt for extension/abort |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Research Topic | String | User command | Non-empty |
| Deliverable Type | Enum | User command | Valid type |
| Source Target | Integer | Optional flag | 1-100 range |
| Quality Threshold | Integer | Optional flag | 0-100 range |
| Stage Selection | Array | Optional flag | Valid stage names |
| Workflow ID | String | Resume command | Valid WF-ID exists |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| Workflow Status | JSON | `.aiwg/research/workflows/{WF-ID}-status.json` | Permanent |
| Workflow Summary | Markdown | `.aiwg/research/workflows/{WF-ID}-summary.md` | Permanent |
| Research Deliverable | Markdown | `.aiwg/research/outputs/` | Permanent |
| Stage Logs | Text | `.aiwg/research/workflows/{WF-ID}-logs/` | 30 days |
| DAG Visualization | DOT | `.aiwg/research/workflows/{WF-ID}-dag.dot` | Permanent |

### Output Schema: Workflow Status JSON

```json
{
  "workflow_id": "WF-2026-01-25-001",
  "topic": "Agentic AI frameworks",
  "deliverable": "comprehensive-literature-review",
  "status": "IN_PROGRESS",
  "progress_percent": 67,
  "start_time": "2026-01-25T10:00:00Z",
  "estimated_completion": "2026-01-25T12:15:00Z",
  "stages": [
    {
      "stage_id": 1,
      "name": "Discovery",
      "status": "COMPLETE",
      "start_time": "2026-01-25T10:00:00Z",
      "end_time": "2026-01-25T10:15:00Z",
      "items_processed": 25,
      "items_total": 25
    },
    {
      "stage_id": 2,
      "name": "Acquisition",
      "status": "COMPLETE",
      "start_time": "2026-01-25T10:15:00Z",
      "end_time": "2026-01-25T10:45:00Z",
      "items_processed": 25,
      "items_total": 25
    },
    {
      "stage_id": 3,
      "name": "Documentation",
      "status": "COMPLETE",
      "start_time": "2026-01-25T10:45:00Z",
      "end_time": "2026-01-25T11:15:00Z",
      "items_processed": 25,
      "items_total": 25
    },
    {
      "stage_id": 4,
      "name": "Quality",
      "status": "IN_PROGRESS",
      "start_time": "2026-01-25T11:15:00Z",
      "items_processed": 15,
      "items_total": 25
    },
    {
      "stage_id": 5,
      "name": "Integration",
      "status": "PENDING"
    },
    {
      "stage_id": 6,
      "name": "Archival",
      "status": "PENDING"
    }
  ],
  "metrics": {
    "sources_discovered": 25,
    "sources_acquired": 25,
    "sources_documented": 25,
    "sources_quality_approved": 0,
    "elapsed_time_minutes": 75,
    "estimated_remaining_minutes": 60
  },
  "checkpoint": {
    "stage": 4,
    "item": 15,
    "resumable": true
  }
}
```

### Output Schema: Workflow DAG

```
Stage 1: Discovery
    |
    v
Stage 2: Acquisition (parallel: 10 concurrent)
    |
    v
Stage 3: Documentation (parallel: 15 concurrent)
    |
    v
Stage 4: Quality Assessment (parallel: 20 concurrent)
    |
    v [Quality Gate: score >= 70]
    |
Stage 5: Integration
    |
    v
Stage 6: Archival
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Discovery Agent | Orchestrated | Stage 1 task execution |
| Acquisition Agent | Orchestrated | Stage 2 task execution |
| Documentation Agent | Orchestrated | Stage 3 task execution |
| Quality Agent | Orchestrated | Stage 4 task execution |
| Citation Agent | Orchestrated | Stage 5 task execution |
| Archival Agent | Orchestrated | Stage 6 task execution |
| Provenance Agent | Observer | Workflow event logging |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| File System | Status persistence | In-memory tracking |
| All Agent APIs | Task execution | Workflow abort |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| Workflow Templates | `.aiwg/research/config/workflow-templates.yaml` | Optional |
| Previous Workflows | `.aiwg/research/workflows/` | Optional (for resume) |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/workflow-agent.yaml
workflow_agent:
  # Default Targets
  defaults:
    source_target: 25
    quality_threshold: 70
    deliverable: literature-review

  # Stage Configuration
  stages:
    discovery:
      timeout_minutes: 30
      retry_attempts: 3
    acquisition:
      timeout_minutes: 60
      parallel_limit: 10
      retry_attempts: 3
    documentation:
      timeout_minutes: 45
      parallel_limit: 15
      retry_attempts: 2
    quality:
      timeout_minutes: 30
      parallel_limit: 20
      retry_attempts: 1
    integration:
      timeout_minutes: 60
      retry_attempts: 2
    archival:
      timeout_minutes: 15
      retry_attempts: 3

  # Progress Tracking
  progress:
    update_interval_seconds: 10
    checkpoint_frequency: stage  # stage or item
    persist_interval_seconds: 30

  # Failure Handling
  failure:
    default_action: prompt  # prompt, retry, skip, abort
    max_stage_retries: 3
    max_workflow_retries: 1

  # Quality Gate
  quality_gate:
    enabled: true
    minimum_sources: 15
    supplementary_discovery: true  # Find more if below minimum
```

### Workflow Templates

```yaml
# .aiwg/research/config/workflow-templates.yaml
templates:
  literature-review:
    description: Comprehensive literature review with quality filtering
    stages: [discovery, acquisition, documentation, quality, integration, archival]
    default_sources: 25
    quality_threshold: 70

  quick-scan:
    description: Rapid topic overview without quality filtering
    stages: [discovery, acquisition, documentation]
    default_sources: 10
    quality_threshold: 0

  systematic-review:
    description: PRISMA-compliant systematic review
    stages: [discovery, acquisition, documentation, quality, integration, archival]
    default_sources: 50
    quality_threshold: 80
    preregistration: true
```

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| Stage Timeout | Warning | Prompt for extension or skip |
| Stage Failed | Error | Prompt for retry, skip, or abort |
| Dependency Violation | Error | Block stage, resolve dependency |
| Quality Gate Failed | Warning | Supplement sources or lower threshold |
| Workflow Abort | Info | Save checkpoint, cleanup |

### Error Response Template

```json
{
  "error_code": "WORKFLOW_STAGE_FAILED",
  "severity": "error",
  "workflow_id": "WF-2026-01-25-001",
  "stage": "Acquisition",
  "message": "Stage failed: 5/25 sources could not be acquired",
  "failed_items": ["REF-003", "REF-007", "REF-015", "REF-018", "REF-022"],
  "options": [
    {"action": "retry", "description": "Retry failed items only"},
    {"action": "skip", "description": "Continue with 20 successful sources"},
    {"action": "abort", "description": "Cancel workflow, save progress"}
  ],
  "checkpoint_saved": true
}
```

### Recovery Procedures

| Scenario | Procedure |
|----------|-----------|
| Stage timeout | Offer extension, skip, or abort |
| Partial stage failure | Offer retry-failed, continue-partial, or abort |
| Quality gate not met | Trigger supplementary discovery |
| Dependency violation | Wait for dependent stage, show blocking stage |
| User abort | Save checkpoint, allow resume later |

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Workflow completion time | <3 hours (25 sources) | Total elapsed time |
| Stage parallelism efficiency | >80% utilization | Concurrent tasks / limit |
| Recovery success rate | >90% | Resumed workflows completed |
| User interruption rate | <10% | User interventions / workflows |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Workflow start, stage transitions, completion |
| DEBUG | Task assignments, progress updates, checkpoints |
| WARNING | Timeout approaching, retry triggered, quality gate |
| ERROR | Stage failed, dependency violation, abort |

### Dashboard Data

```json
{
  "active_workflows": 1,
  "completed_today": 5,
  "average_completion_time_minutes": 135,
  "success_rate_percent": 92,
  "current_workflow": {
    "id": "WF-2026-01-25-001",
    "stage": "Quality",
    "progress": 67,
    "eta_minutes": 60
  }
}
```

## 10. Example Usage

### Full Workflow Execution

```bash
# Start comprehensive literature review
aiwg research workflow "Agentic AI frameworks" --deliverable comprehensive-literature-review

# Output:
# Workflow initiated: WF-2026-01-25-001
# Topic: "Agentic AI frameworks"
# Deliverable: Comprehensive literature review
# Target: 25 sources, Quality threshold: 70
# Estimated time: 2-3 hours
#
# Stage 1: Discovery (0% -> 16%)
#   Searching for sources...
#   [=====>                   ] 25/25 sources found (15 min)
#   Stage complete: 25 sources identified
#
# Stage 2: Acquisition (16% -> 33%)
#   Downloading sources (10 concurrent)...
#   [=====>                   ] 25/25 acquired (30 min)
#   Stage complete: 25 papers downloaded
#
# Stage 3: Documentation (33% -> 50%)
#   Documenting papers (15 concurrent)...
#   [=====>                   ] 25/25 documented (30 min)
#   Stage complete: 25 summaries generated
#
# Stage 4: Quality Assessment (50% -> 67%)
#   Assessing quality (20 concurrent)...
#   [=====>                   ] 25/25 assessed (15 min)
#   Quality gate: 18/25 sources approved (score >= 70)
#   Stage complete: 18 high-quality sources
#
# Stage 5: Integration (67% -> 83%)
#   Generating literature review...
#   [=====>                   ] Complete (30 min)
#   Stage complete: 8,500 word review generated
#
# Stage 6: Archival (83% -> 100%)
#   Packaging artifacts...
#   [=====>                   ] Complete (5 min)
#   Stage complete: AIP-2026-01-25-WF-001
#
# Workflow Complete: WF-2026-01-25-001
# Duration: 2 hours 15 minutes
# Sources: 25 discovered -> 18 quality-approved
# Deliverable: .aiwg/research/outputs/literature-review-agentic-ai.md
# Archive: AIP-2026-01-25-WF-001
```

### Workflow Recovery

```bash
# Resume failed workflow
aiwg research workflow --resume WF-2026-01-25-001

# Output:
# Loading workflow checkpoint...
# Workflow: WF-2026-01-25-001
# Status: FAILED at Stage 2 (Acquisition)
# Progress: 14/25 sources acquired
# Last checkpoint: 2026-01-25 10:45:00
#
# Recovery options:
# 1. Retry failed (REF-015 through REF-025)
# 2. Continue with partial data (14 sources)
# 3. Abort and start fresh
#
# Choice: 1
#
# Resuming acquisition from REF-015...
# [=====>                   ] 11/11 remaining acquired
#
# Stage 2 complete: 25/25 sources acquired
# Continuing to Stage 3: Documentation...
```

### Partial Workflow

```bash
# Execute only specific stages
aiwg research workflow "OAuth security" --stages "discovery,documentation"

# Output:
# Partial workflow initiated: WF-2026-01-25-002
# Stages: Discovery, Documentation (skipping Acquisition, Quality, Integration, Archival)
# Note: Acquisition will be auto-included (required for Documentation)
#
# Executing 3 stages...
# [1/3] Discovery: 25 sources found
# [2/3] Acquisition: 25 papers downloaded
# [3/3] Documentation: 25 summaries generated
#
# Partial workflow complete
# Skipped stages: Quality, Integration, Archival
# Artifacts: 25 documented sources (no integrated review)
```

### Workflow Status Check

```bash
# Check running workflow
aiwg research workflow --status WF-2026-01-25-001

# Output:
# Workflow Status: WF-2026-01-25-001
#
# Topic: Agentic AI frameworks
# Status: IN_PROGRESS
# Progress: 67% (4/6 stages)
# Elapsed: 1 hour 45 minutes
# ETA: 60 minutes remaining
#
# Stage Progress:
# [X] Discovery (25/25 sources)
# [X] Acquisition (25/25 papers)
# [X] Documentation (25/25 summaries)
# [>] Quality (15/25 assessed) <- Current
# [ ] Integration (pending)
# [ ] Archival (pending)
#
# Metrics:
# - High-quality sources so far: 12
# - Estimated final count: 18
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-008 | Primary | Execute Research Workflow |
| UC-RF-001-007 | Orchestrated | All research stages coordinated |
| UC-RF-009 | Triggered | Gap analysis may trigger supplementary workflow |

## 12. Implementation Notes

### Architecture Considerations

1. **Event-Driven Orchestration**: Subscribe to agent completion events
2. **Checkpoint Persistence**: Save state after every stage for recovery
3. **Idempotent Stages**: Re-running stage updates rather than duplicates
4. **Graceful Degradation**: Continue with partial results when possible

### Performance Optimizations

1. **Parallel Execution**: Run independent tasks concurrently
2. **Pipeline Parallelism**: Start next stage for completed items
3. **Lazy Evaluation**: Don't start stages until dependencies ready
4. **Resource Pooling**: Reuse agent instances across tasks

### Security Considerations

1. **Checkpoint Security**: Don't store sensitive data in checkpoints
2. **Abort Cleanup**: Remove temporary files on workflow abort
3. **Resource Limits**: Enforce concurrency limits to prevent overload

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | DAG construction, progress calculation |
| Integration Tests | 70% | Multi-agent coordination, recovery |
| E2E Tests | Key workflows | Full workflow execution |

### Known Limitations

1. **Single Active Workflow**: One workflow per project at a time
2. **Network Dependency**: Workflow progress depends on agent availability
3. **Timeout Precision**: Stage timeouts may have ~10s variance
4. **Resource Contention**: Parallel agents compete for LLM API limits

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-008-execute-research-workflow.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001 through UC-RF-007 (all stages)
- @.aiwg/flows/research-framework/inception/vision-document.md

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
