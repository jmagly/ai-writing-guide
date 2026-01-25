# ADR-RF-001: Agent Orchestration Pattern

## Metadata

- **ID**: ADR-RF-001
- **Title**: Agent Orchestration Pattern for Research Framework
- **Status**: Accepted
- **Created**: 2026-01-25
- **Updated**: 2026-01-25
- **Decision Makers**: Research Framework Architecture Team
- **Related ADRs**: ADR-RF-002 (Provenance Storage), ADR-RF-003 (Quality Assessment)

## Context

The AIWG Research Framework requires coordination of 8+ specialized agents (Discovery, Acquisition, Documentation, Citation, Quality, Provenance, Archival, Workflow) across a 5-stage lifecycle. Each agent has distinct responsibilities and operates on shared artifacts in `.aiwg/research/`. The orchestration pattern determines how agents communicate, resolve dependencies, handle failures, and maintain workflow state.

### Decision Drivers

1. **DAG-Based Workflows**: Research workflows have strict dependencies (Discovery -> Acquisition -> Documentation -> Quality -> Integration -> Archival)
2. **Parallel Execution**: Some stages support parallelism (e.g., acquiring 25 papers simultaneously)
3. **Failure Recovery**: Long-running workflows must be resumable from failure points
4. **Provenance Tracking**: All agent interactions must be logged for reproducibility (NFR-RF-CMP-011)
5. **AIWG Consistency**: Pattern should align with existing SDLC framework orchestration
6. **Solo Developer Context**: Must be maintainable by single developer, avoid excessive complexity

### Current AIWG Patterns

The SDLC framework uses a **lightweight orchestrator** pattern where:
- Phase transitions controlled by gate checks
- Agents invoked on-demand via slash commands or natural language
- State tracked via YAML/JSON files in `.aiwg/`
- No persistent message queue or complex middleware

## Decision

**Adopt a Centralized Orchestrator with DAG-Based Task Scheduling** for the Research Framework.

### Pattern Description

```
                          ┌─────────────────────┐
                          │  Workflow Agent     │
                          │  (Orchestrator)     │
                          └──────────┬──────────┘
                                     │
            ┌────────────┬───────────┼───────────┬────────────┐
            │            │           │           │            │
            ▼            ▼           ▼           ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
      │ Discovery│ │Acquisition│ │  Docs    │ │ Quality  │ │ Archival │
      │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │
      └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
           │            │           │           │            │
           └────────────┴───────────┼───────────┴────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  .aiwg/research/  │
                          │  (Shared State)   │
                          └───────────────────┘
```

### Key Characteristics

1. **Centralized Coordinator**: Workflow Agent orchestrates all research workflows
2. **File-Based State**: Workflow status tracked in `.aiwg/research/workflows/<id>-status.json`
3. **DAG Execution**: Tasks organized as directed acyclic graphs with explicit dependencies
4. **Parallel Tasks**: Independent tasks (e.g., 25 paper acquisitions) run concurrently
5. **Checkpoint/Resume**: Each stage completion creates a checkpoint for recovery
6. **Provenance Integration**: All orchestration events logged via Provenance Agent

### Orchestration Flow

```
1. User initiates: /research-workflow "topic" --deliverable "literature-review"
2. Workflow Agent parses specification
3. Workflow Agent creates DAG:
   [Discovery] -> [Acquisition(25)] -> [Documentation(25)] -> [Quality(25)] -> [Integration] -> [Archival]
                   └─ parallel ─┘      └─── parallel ───┘    └─ parallel ─┘
4. Workflow Agent executes stage-by-stage:
   - Check dependencies satisfied
   - Invoke stage agent(s)
   - Wait for completion / handle failures
   - Update status file
   - Log to Provenance Agent
   - Advance to next stage
5. Workflow Agent generates summary report
```

## Consequences

### Positive

1. **Alignment with AIWG**: Follows existing SDLC framework patterns (file-based state, on-demand invocation)
2. **Simplicity**: No external message queue, database, or complex middleware required
3. **Transparency**: Workflow state visible in `.aiwg/research/workflows/` as JSON files
4. **Resumability**: Checkpoints enable restart from any completed stage
5. **Provenance Native**: All orchestration events naturally flow to Provenance Agent
6. **Debuggability**: Stage-by-stage execution with clear status makes issues traceable

### Negative

1. **Single Point of Failure**: Workflow Agent coordinates everything (mitigated by checkpoints)
2. **Limited Scalability**: File-based state not suitable for thousands of concurrent workflows (acceptable for solo developer context)
3. **Manual Recovery**: Some failure scenarios require user intervention to resume
4. **No Real-Time Streaming**: Agents don't receive live updates from each other (acceptable for batch workflows)

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Workflow Agent crash mid-execution | Low | Medium | Checkpoint after each stage, status.json enables resume |
| File contention in parallel tasks | Medium | Low | Atomic writes, file locking for status updates |
| Dependency resolution errors | Low | Medium | Validate DAG before execution, comprehensive tests |
| State file corruption | Very Low | High | JSON schema validation, backup before writes |

## Alternatives Considered

### Option A: Peer-to-Peer Agent Communication

**Description**: Agents communicate directly with each other, passing artifacts and triggering downstream agents.

**Example**:
```
Discovery Agent -> (outputs) -> Acquisition Agent -> (triggers) -> Documentation Agent
```

**Pros**:
- No central bottleneck
- Agents can evolve independently
- Natural event-driven model

**Cons**:
- Complex dependency tracking
- Difficult to implement resume functionality
- Hard to visualize/debug workflow state
- Inconsistent with AIWG SDLC patterns
- Increased coupling between agents

**Decision**: Rejected. The complexity of tracking distributed state across 8+ agents outweighs benefits for our solo developer context.

### Option B: Message Queue-Based Orchestration

**Description**: External message queue (RabbitMQ, Redis Streams) manages agent communication.

**Example**:
```
User -> Queue -> Worker Pool -> Agents -> Queue -> ...
```

**Pros**:
- Robust failure handling
- Scales to high concurrency
- Industry-standard pattern

**Cons**:
- Requires external infrastructure (RabbitMQ, Redis)
- Increased operational complexity
- Overkill for solo developer use case
- Not aligned with AIWG's file-based approach
- Harder to inspect workflow state

**Decision**: Rejected. External dependencies violate NFR-RF-X-001 (offline operation support) and add unnecessary complexity.

### Option C: Hierarchical Multi-Agent Pattern

**Description**: Tier-1 orchestrator manages stage agents, which in turn coordinate sub-tasks.

**Example**:
```
Workflow Agent
  └── Acquisition Coordinator
        ├── Acquisition Worker 1
        ├── Acquisition Worker 2
        └── Acquisition Worker 3
```

**Pros**:
- Clean separation of coordination levels
- Sub-coordinators can optimize parallelism
- Follows multi-agent frameworks (AutoGen, CrewAI patterns)

**Cons**:
- Additional agent layer increases complexity
- Harder to trace end-to-end provenance
- May be over-engineered for research-papers scale (100-1,000 papers)
- Maintenance burden for solo developer

**Decision**: Rejected. Centralized orchestrator with parallel task execution provides sufficient capability without additional coordination layers. Can revisit if scaling requirements increase.

## Implementation Notes

### Workflow Status Schema

```json
{
  "workflow_id": "WF-2026-01-25-001",
  "topic": "Agentic AI frameworks",
  "deliverable": "comprehensive-literature-review",
  "status": "IN_PROGRESS",
  "progress": 50,
  "start_time": "2026-01-25T10:00:00Z",
  "current_stage": "documentation",
  "stages": {
    "discovery": { "status": "COMPLETE", "items": 25, "completed_at": "2026-01-25T10:15:00Z" },
    "acquisition": { "status": "COMPLETE", "items": 25, "completed_at": "2026-01-25T10:45:00Z" },
    "documentation": { "status": "IN_PROGRESS", "items_complete": 15, "items_total": 25 },
    "quality": { "status": "PENDING" },
    "integration": { "status": "PENDING" },
    "archival": { "status": "PENDING" }
  },
  "checkpoints": [
    { "stage": "discovery", "file": ".aiwg/research/workflows/WF-001/checkpoint-discovery.json" },
    { "stage": "acquisition", "file": ".aiwg/research/workflows/WF-001/checkpoint-acquisition.json" }
  ]
}
```

### Parallel Execution Limits

Per NFR-RF-P-003 and BR-WF-003:
- Acquisition: Max 10 concurrent downloads (API rate limits)
- Documentation: Max 15 concurrent extractions (LLM token limits)
- Quality: Max 20 concurrent assessments (no external bottleneck)

### Agent Invocation Pattern

```typescript
// Workflow Agent orchestrates via sequential stage execution
async function executeWorkflow(spec: WorkflowSpec): Promise<WorkflowResult> {
  const dag = createDAG(spec);

  for (const stage of dag.topologicalSort()) {
    // Check dependencies
    if (!stage.dependenciesSatisfied()) {
      throw new DependencyError(stage);
    }

    // Execute stage (with parallelism if applicable)
    const result = await executeStage(stage);

    // Update status and checkpoint
    await updateStatus(stage, result);
    await createCheckpoint(stage);

    // Log to provenance
    await provenanceAgent.logActivity({
      type: 'StageComplete',
      stage: stage.name,
      duration: result.duration,
      artifacts: result.outputs
    });
  }

  return generateSummary();
}
```

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-008-execute-research-workflow.md - Workflow execution use case
- @.aiwg/flows/research-framework/elaboration/nfr/NFR-RF-specifications.md - NFR-RF-P-003 (Concurrent Operations), BR-WF-003 (Parallel Limits)
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 4.1 (Agent Specializations)
- @agentic/code/frameworks/sdlc-complete/README.md - SDLC orchestration patterns
- @docs/references/REF-022-autogen-multi-agent-conversation.md - AutoGen multi-agent patterns (considered but simplified)
- @docs/references/REF-012-chatdev-multi-agent-software.md - ChatDev orchestration reference

---

**Document Status**: Accepted
**Review Date**: 2026-01-25
**Next Review**: End of Construction Phase
