---
enforcement: medium
---

# Reproducibility Rules

**Enforcement Level**: MEDIUM
**Scope**: All workflow execution
**Research Basis**: REF-058 R-LAM (Reproducible LLM Agent Workflows); REF-1398 through REF-1406 LFD control-pattern cluster
**Issues**: #112, #113, #114, #115, #1585

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
4. On iteration boundaries (agent loops)

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

### Rule 6: Eval-Driven Loops MUST Isolate Holdouts

Agent loops that optimize against an eval set, benchmark, fixture corpus, or
scored task suite MUST separate optimizer-readable development feedback from
acceptance feedback.

**REQUIRED for eval-driven or high-criticality loops**:

```yaml
eval_fixture_split:
  dev:
    readable_by_optimizer: true
    feedback: "specific failures and diagnostics allowed"
  holdout:
    readable_by_optimizer: false
    feedback: "aggregate score/status only"
  leakage_audit:
    required: true
    checks:
      - no_holdout_answers_in_prompts
      - no_holdout_case_ids_in_optimizer_logs
      - no_detailed_holdout_lint_findings_to_optimizer
```

Holdout answers, case labels, oracle traces, detailed lint findings, and
fixture membership MUST NOT appear in prompts, progress files, issue comments,
or logs that the optimizing agent can read. If a holdout-touching instrument
detects leakage risk, the optimizer-readable result is `VOID`; detailed
diagnostics go only to a human/private audit log.

**Aggregate-only examples**:

```text
Allowed: holdout_score=0.82, pass_count=41/50, status=failed_threshold
Forbidden: case H-017 expected "x"; edit src/foo.ts line 42 to pass H-017
```

When benchmark or fixture corpora are small, duplicated, public, or repeatedly
optimized against, add canaries or capacity caps and document the residual
contamination risk in the completion report.

### Rule 7: Eval Harness Instruments MUST Separate Feedback Channels

Eval-driven loops that declare `score`, `lint`, `probe`, or `status`
instruments MUST define which outputs are optimizer-readable and which outputs
are private-human diagnostics before execution starts.

**Required convention**:

| Instrument | Optimizer-readable output | Private-human output |
|---|---|---|
| `score` | aggregate score/status only | case-level failures, oracle traces, holdout details |
| `lint` | `VOID` or aggregate count only | detailed lint findings and matching evidence |
| `probe` | aggregate gap/status only | probe cases, canary matches, memorization indicators |
| `status` | budgets, score history, best iteration, harness version | sensitive leakage audit details |

If any instrument detects holdout leakage, fixture disclosure, harness
tampering, or forbidden diagnostic exposure, the optimizer-readable result MUST
be `VOID`. The detailed reason MUST be written only to a private diagnostics
path or human-only channel.

Harness manifests SHOULD be locked for comparable runs. If the harness changes,
record the harness version as an experimental factor rather than comparing the
new score directly with earlier locked-harness scores.

## Execution Modes

| Mode | Temperature | Seed | Reproducibility | Use Case |
|------|-------------|------|-----------------|----------|
| `strict` | 0 | Fixed | Guaranteed | Testing, compliance |
| `seeded` | Normal | Fixed | High | Development, A/B testing |
| `logged` | Normal | Logged | Auditable | Regulatory compliance |
| `default` | Normal | None | None | Interactive, creative |
| `holdout-isolated` | 0 or fixed | Fixed | Auditable acceptance | Eval-driven agent loops with hidden holdout feedback |

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
- [ ] Eval-driven loops documented dev/holdout split
- [ ] Holdout feedback exposed only aggregate status/score to the optimizer
- [ ] Leakage audit completed for prompts, logs, progress files, and issue comments
- [ ] Eval harness instruments, if used, declared optimizer-readable and private-human channels
- [ ] VOID semantics used for holdout leakage, fixture disclosure, or harness tampering
- [ ] Recovery tested (for production workflows)

## References

- @.aiwg/research/findings/REF-058-r-lam.md - R-LAM research
- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/checkpoint.yaml - Checkpoint schema
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/execution-mode.yaml - Mode schema
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/execution-snapshot.yaml - Snapshot schema
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml - Error recovery
- @.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md - LFD control-pattern synthesis
- @.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md - Tiered loop-control ADR
- #112, #113, #114, #115 - Implementation issues
- #1585 - LFD control patterns for agent loops

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
