# Reproducibility Rules

**Enforcement Level**: MEDIUM
**Scope**: All workflow execution
**Research Basis**: REF-058 R-LAM (Reproducible LLM Agent Workflows)
**Issues**: #112, #113, #114, #115

## Overview

These rules enforce reproducibility practices for agentic workflows. Research shows 47% of agent workflows produce different outputs on re-run due to non-deterministic execution.

## Research Foundation

| Finding | Impact |
|---------|--------|
| 47% non-reproducible | Nearly half of workflows fail reproducibility |
| Configuration drift | Missing config capture prevents replay |
| No validation tooling | Cannot verify reproducibility |

## Mandatory Rules

### Rule 1: Critical Workflows MUST Use Strict Mode

For testing, validation, and compliance workflows:

```yaml
# In agent or flow configuration
execution:
  mode: strict
  config:
    temperature: 0
    seed: 42  # Fixed seed
```

**Critical workflow types**:
- Test generation
- Security audits
- Compliance checks
- CI/CD pipelines
- Regression testing

### Rule 2: Checkpoints at Phase Boundaries

Workflows MUST checkpoint at:

1. Phase start (Concept, Inception, Elaboration, Construction, Transition)
2. Artifact completion
3. Before external calls
4. On iteration boundaries (Ralph loops)

```yaml
checkpoint:
  auto_checkpoint: true
  checkpoint_on:
    - phase_start
    - artifact_complete
    - before_external_call
    - iteration_boundary
```

### Rule 3: Configuration Snapshots REQUIRED

Every workflow execution MUST capture:

| Field | Required | Description |
|-------|----------|-------------|
| model.id | Yes | Full model identifier |
| temperature | Yes | Temperature setting |
| seed | If set | Random seed |
| execution_mode | Yes | strict/seeded/logged/default |
| inputs | Yes | User prompt and context |
| outputs | Yes | Response and artifacts |

### Rule 4: Provenance Records Include Mode

All provenance records MUST include execution mode:

```yaml
# In PROV record
entity:
  id: "artifact-001"
  wasGeneratedBy: "activity-001"
  execution_context:
    mode: strict
    temperature: 0
    seed: 42
    model: "claude-3-opus-20240229"
```

### Rule 5: Validation Before Release

Before releasing artifacts from Construction:

1. Capture execution snapshot
2. Replay in strict mode
3. Verify outputs match (exact or semantic)
4. Document any non-deterministic components

## Execution Modes

| Mode | Temperature | Seed | Reproducibility | Use Case |
|------|-------------|------|-----------------|----------|
| `strict` | 0 | Fixed | Guaranteed | Testing, compliance |
| `seeded` | Normal | Fixed | High | Development, A/B testing |
| `logged` | Normal | Logged | Auditable | Regulatory compliance |
| `default` | Normal | None | None | Interactive, creative |

### Mode Selection Flow

```
Is this testing/validation?
├── Yes → strict
└── No
    └── Need audit trail?
        ├── Yes → logged
        └── No
            └── Need reproducibility?
                ├── Yes → seeded
                └── No → default
```

## Checkpoint Management

### Storage Location

```
.aiwg/checkpoints/
├── ralph-{id}/
│   ├── iteration-001.json.gz
│   ├── iteration-002.json.gz
│   └── ...
├── flow-{id}/
│   ├── phase-concept.json.gz
│   └── ...
└── manifest.json
```

### Retention Policy

| Condition | Retention |
|-----------|-----------|
| Default | 5 most recent |
| On failure | All from session |
| Tagged | Preserve indefinitely |
| Older than 30 days | Compress or delete |

### Recovery Process

1. List available checkpoints
2. Select checkpoint (latest or user-specified)
3. Validate checkpoint integrity
4. Restore artifacts
5. Restore workflow state
6. Resume execution

## Schema References

All reproducibility data MUST conform to:

- `agentic/code/addons/ralph/schemas/checkpoint.yaml` - Checkpoint format
- `agentic/code/frameworks/sdlc-complete/schemas/flows/execution-mode.yaml` - Mode configuration
- `agentic/code/frameworks/sdlc-complete/schemas/flows/execution-snapshot.yaml` - Snapshot format

## Agent Protocol

### Starting Workflows

```yaml
# Agent checks execution mode
1. Load configured mode (or default)
2. If strict/seeded: validate seed is set
3. Create initial checkpoint
4. Begin execution with mode context
```

### During Execution

```yaml
# Agent maintains reproducibility
1. Checkpoint at boundaries
2. Log all tool calls (in logged mode)
3. Track artifacts created/modified
4. Preserve execution config
```

### On Completion

```yaml
# Agent finalizes snapshot
1. Capture final outputs
2. Create completion snapshot
3. Update provenance record
4. Clean up old checkpoints
```

## Validation Checklist

Before workflow completion:

- [ ] Execution mode documented
- [ ] Checkpoint at each phase boundary
- [ ] Configuration snapshot captured
- [ ] Provenance record includes mode
- [ ] Critical workflows used strict mode
- [ ] Recovery tested (for production workflows)

## References

- @.aiwg/research/findings/REF-058-r-lam.md - R-LAM research
- @agentic/code/addons/ralph/schemas/checkpoint.yaml - Checkpoint schema
- @agentic/code/frameworks/sdlc-complete/schemas/flows/execution-mode.yaml - Mode schema
- @agentic/code/frameworks/sdlc-complete/schemas/flows/execution-snapshot.yaml - Snapshot schema
- @agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml - Error recovery
- #112, #113, #114, #115 - Implementation issues

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
