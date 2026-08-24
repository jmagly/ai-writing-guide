# ADR: Canonical AIWG Mission Protocol v1

Status: Accepted (2026-08-24)

## Decision

AIWG defines `mission.aiwg.io/v1` as the canonical, transport-neutral Mission record. Its source of truth is `schemas/mission-v1.schema.json`; TypeScript codecs and adapter contracts live under `src/mission-protocol/`.

The canonical record is an envelope containing stable metadata and lineage, an operator-authored specification, normalized observed status, provenance, artifacts, verification evidence, and namespaced extensions. Existing `MissionPlan`, `MissionLedger`, Mission Control, `executor.aiwg.io/v1`, `fleet-workload/v1`, A2A, UHP, graph, Cockpit, activity, and audit contracts retain their names and meanings. They cross the canonical boundary through explicit adapters; this decision does not rename or silently redefine them.

Canonical reads begin in dual-read mode. Legacy writes remain the default until the separately tracked migration and cutover gate authorizes canonical writes. Unsupported major versions fail closed.

## Lifecycle

| Canonical state | Terminal | Representative native states |
|---|---:|---|
| `pending` | no | queued, submitted, scheduled, runnable |
| `running` | no | assigned, started, working, in_progress |
| `blocked` | no | input-required, auth-required, blocked-hitl |
| `operator-review` | no | manual-review, operator-review-required |
| `completed` | yes | done, completed, succeeded |
| `failed` | yes | failed, error, rejected, timed-out |
| `incomplete` | yes | incomplete, budget-exhausted, max-iterations |
| `cancelled` | yes | cancelled, canceled, aborted |
| `unknown` | no | disconnected, unreachable, unknown or unrecognized additive state |

A disconnect is an observation failure, never evidence of terminality. Every adapter retains `nativeState` beside normalized `state`. Unknown additive events may be ignored by consumers but must remain available in a namespaced source extension when decoded.

## Surface mapping

| Surface | Identity | Native lifecycle | Canonical action | Write policy |
|---|---|---|---|---|
| `MissionPlan` | `missionId` | planned by structure | adapt plan/spec | legacy default |
| `MissionLedger` | `missionId` | checkpoint lists and cycle outcomes | adapt status/evidence | legacy default |
| Mission Control session/JSONL | session and event IDs | session status/events | dual-read adapter | legacy default |
| `executor.aiwg.io/v1` | mission/task IDs | executor task states | adapter; retain executor vocabulary | unchanged |
| `fleet-workload/v1` | mission/dispatch/child IDs | observed workload state | adapter; retain lineage/revisions | unchanged |
| A2A | task/context IDs | submitted/working/input-required/completed/failed/canceled/rejected/auth-required/unknown | adapter with native state | transport-native |
| UHP `2026-08-11` | response/session/container/file IDs | in_progress/completed/failed/incomplete/cancelled plus unknown additive | adapter with response evidence | transport-native |
| Graph Flow v1 | graph/run/node-run IDs | graph node state | projection adapter | unchanged |
| Cockpit/Web | mission/session/task IDs | display projection | explicitly lossy read projection | no canonical persistence |
| MCP/audit/activity | event and mission IDs | event-specific state | evidence projection | existing contracts retained |

## Compatibility policy

- Additive: a new optional canonical field or namespaced extension. Readers preserve or safely ignore it.
- Breaking: removal/rename, type change, enum removal, stricter constraint, new required field, or changed terminality. This requires a new major schema version.
- Deprecated: an existing field retained for at least one documented migration window with decode support and warnings.
- Internal: implementation changes that do not alter serialized contracts.
- Security closure: identity, lifecycle, provenance, artifact hashes, and loss-report structures reject undeclared fields. Extension values are open only beneath namespaced keys.
- Projection loss: encoders return a loss report. Required semantic loss fails unless the caller explicitly opts into a lossy projection, in which case the loss report travels with the projection.

## Consequences

Canonicalization is centralized and testable, while native contracts remain independently versioned. Adapters must preserve identifiers, completion criteria, budgets, partial output, artifacts, hashes, lineage, native state, and unknown extensions when the target supports them. A compatibility report is required for changes to the canonical schema or adapter baselines.
