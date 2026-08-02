# Fleet Workload Contract v1

Status: proposed compatibility contract
Issues: AIWG #1990; Agentic Sandbox #736
Schema identity: `urn:agentic-orchestration:fleet-workload:v1`

This contract is the neutral boundary between an orchestration management plane
and an execution substrate. AIWG/Cockpit is the first management-plane
implementation and Agentic Sandbox is the first execution-substrate
implementation. Neither product's internal mission or task model is normative.

## Documents

- `workload`: desired and observed state for one child execution.
- `inventory`: a revisioned snapshot of one or more workload records.
- `reconciliation`: before/after classifications after reconnect or restart.

## Workload kinds

`persistent-agent`, `daemon`, `scheduled-collector`, and `one-shot-command`
retain distinct semantics. Daemons require health. Scheduled collectors require
a schedule. Persistent agents may detach and retain identity. One-shots have
terminal exit classification, timeout, and cancellation semantics.

## Ownership

The orchestrator owns parent intent, policy, admission, placement, budgets,
aggregation, and operator decisions. The substrate owns runtime capability,
execution-local lifecycle, isolation, health, artifacts, and truthful observed
state. Parent fan-out is orchestrator-owned; explicitly delegated nested runtime
children still carry the same lineage.

## Safety invariants

- Desired and observed state are separate.
- State revisions are monotonic within one workload identity.
- Dispatch idempotency keys are stable across retry and restart.
- Unknown reconciliation cannot be represented as terminal success.
- Unsupported, degraded, and policy-blocked controls are data, not log text.
- Credential material is not part of the schema. Only policy references cross
  the boundary.
- Orchestrator-specific metadata is optional and namespaced within
  `orchestrator_metadata`.

## Compatibility

AIWG `executor.v1` remains a supported singleton mission profile. Adapters map
its mission identity to one fleet workload child. Fleet-aware adapters
negotiate `agentic-orchestration/v1`; old adapters continue to operate without
claiming daemon, schedule, typed backpressure, or fleet reconciliation support.

Breaking changes require a new API version. Additive optional fields may be
introduced in a compatible revision after both repositories carry matching
fixtures and validation.
