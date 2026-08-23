# Flow Graph Sandbox Node Contract v1

**Schema:** `schemas/flow/graph-sandbox-node-event.v1.schema.json`  
**Cross-repository traceability:** AIWG #2126; Sandbox #780–#784; bridge #2; Sandbox conformance #4

This is the testable boundary between AIWG, the AIWG–Sandbox bridge, and an
Agentic Sandbox runtime. Sandbox remains a node executor, not a graph planner.
The contract is opt-in and does not alter ordinary A2A or Sandbox calls.

## Ownership

| Owner | Responsibilities |
|---|---|
| AIWG | validate/plan the graph, narrow node authority, generate stable graph/run/node identity and idempotency key, interpret terminal outcomes |
| Bridge | translate AIWG camel-case internal metadata to the wire namespace, preserve bounds and identity, translate Sandbox records back without inventing success |
| Sandbox | durably own the task/session, execute once per idempotency contract, emit lifecycle/terminal/checkpoint facts and minimized evidence |
| Conformance harness | send opt-in fixtures and validate emitted records against the schema and scenario oracle |

## Namespace and translation

The A2A extension namespace is
`https://aiwg.io/extensions/flow-graph/v1`. Its wire payload uses snake-case
fields. AIWG's internal metadata key remains `aiwg.flow.graph`; the bridge maps
fields mechanically:

| AIWG internal | Wire |
|---|---|
| `graphId` | `graph_id` |
| `graphVersion` | `graph_version` |
| `runId` | `run_id` |
| `nodeId` | `node_id` |
| `nodeRunId` | `node_run_id` |
| `edgeId` | `edge_id` |

Unknown metadata outside the namespace follows the existing A2A policy. An
invalid AIWG namespace payload is rejected before dispatch. Metadata never
contains prompts, user/task content, private reasoning, credentials, raw tool
output, or undeclared route evidence.

## Dispatch and authority

Each graph-node dispatch carries one stable `idempotency_key`, the
`a2a-sandbox` runtime binding, graph identity, declared timeout/budget, and the
already-narrowed capability/tool scope. The bridge and Sandbox may narrow that
scope but cannot add authority. Repeated dispatch with the same key and same
canonical request returns the prior task/result; the same key with different
request bytes returns a deterministic conflict.

## State mapping

| Sandbox fact | AIWG node state | Retry guidance |
|---|---|---|
| queued | pending | no |
| running | running | no |
| blocked | blocked-hitl | no automatic approval |
| succeeded with exit code 0 | succeeded | no |
| failed/non-zero exit | failed | only under declared retry policy, same key |
| caller cancellation | canceled | no implicit retry |
| runtime deadline | failed (`timed_out` reason retained) | declared timeout retry only, same key |
| interrupted with resumable checkpoint | retrying | restore exact checkpoint before new execution |
| disconnect/lost/unknown outcome | unknown | reconcile receipt/evidence; never assume failure or success and never duplicate side effects |

`canceled`, `timed_out`, `interrupted`, `lost`, and `unknown` remain distinct
wire terminal states even where the current AIWG display projects more than
one of them to `failed` or `unknown`.

## Terminal and evidence invariants

- Every terminal event contains start/end timestamps, duration, and an `exit`
  object. Missing exit status is explicit as `not_applicable` or `unknown` with
  a reason; it is never silently omitted.
- Evidence entries declare availability and redaction status. Available
  evidence includes a URI and SHA-256 digest. Missing/withheld/unknown evidence
  is explicit and cannot prove success.
- Transport disconnect is an observation, not a terminal task fact. Without a
  durable terminal record the result is `unknown`.
- Sandbox success requires terminal state `succeeded`, exit code `0`, and all
  deployment-required evidence. The bridge cannot synthesize success.

## Checkpoint and replay invariants

- Created/restored checkpoints carry a stable ID and digest. Restore failure
  carries a reason and is distinguishable from node execution failure.
- Resumed dispatch supplies exact `flow_graph.resume` metadata containing only
  `replay_of_task_id` and `checkpoint_id`. Both values are copied into the new
  task identity. Graph/run/node identity remains unchanged; task/session
  identity may change.
- `non_resumable` and `unknown` never fall back to a fresh side-effecting run
  without an operator-visible reconciliation decision.

## Required conformance scenarios

The opt-in profile must cover success, non-zero exit, runtime timeout, caller
cancellation, disconnect with unknown outcome, duplicate dispatch, checkpoint
create/restore, restore failure, resumable completion, non-resumable state,
missing evidence, and redacted evidence. Each case emits machine-readable
`GraphSandboxNodeEvent` records validated by the schema.

Default conformance remains unchanged. Live qualification must test an actual
Sandbox implementation; AIWG's synthetic fast fixtures are not substitute
evidence.
