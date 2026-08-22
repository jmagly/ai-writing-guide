# FlowGraph runtime operations

## Ownership boundary

The FlowGraph runtime is a deterministic planner/executor beneath the existing
mission layer. It decides the runnable set, freezes activation inputs, applies
reducers in manifest order, evaluates routes and joins, and enforces graph
authority and ceilings. MissionConductor remains the durable owner of the
activity ledger, provenance, aggregate cost, best-output decision, and crash
checkpoint. Integrations persist the runtime's event and checkpoint projections
through **onEvent** and **saveCheckpoint** callbacks.

Every event includes **graphId** and **runId**. Node events add **nodeId** and
**nodeRunId**; route and join events add stable edge identities. These fields
can be projected into A2A, Sandbox, Cockpit, or provider messages without
changing those protocols.

## Adapter contract

An adapter module exports an object with this minimum shape:

~~~javascript
export default {
  id: 'sandbox-v1',
  async invokeNode(request) {
    return {
      outputs: { result: 'typed value' },
      usage: { tokens: 120, costUsd: 0.003, timeMs: 420 },
      score: 0.91,
      citations: ['artifact://evidence/42'],
    };
  },
};
~~~

Requests contain the authorized node, immutable inputs and state snapshots,
activation and node-run identities, one stable invocation key, and requested
resource ceilings. Adapters must return every declared output and non-negative
realized usage. They must pass the invocation key unchanged to mutating tools.

Eligible side-effect-free nodes can be delegated through
**parallelDispatch(requests, invokeNode)**. The adapter returns results in
request order; the runtime commits reducers and trace events in stable manifest
order even when workers finish in another order.

## Retry and mutations

An idempotent or exactly-once node receives the same invocation key across
bounded retries. Successful receipts are checkpointed and replayed without a
second adapter call. Approval-required work cannot be retried automatically,
and a gate must appear in the approved gate set before execution.

Authority is intersected at runtime. **allowedCapabilities** and
**allowedPermissions** may narrow the graph declaration but never widen it.
Denial occurs before the adapter is called.

## Ceilings, joins, and failures

Activation, token, cost, and time ceilings are independent. Adapter usage that
would exceed a ceiling is rejected before its result is committed. LCM joins
advance a deterministic activation clock; periods four and five therefore meet
at activation 20. Converged and budget joins always stop at their declared
iteration or resource boundary even if a predicate never succeeds.

Failure policy selects fail-fast, continue, optional-skip, fallback, or typed
partial synthesis. A typed-terminal-failure output returns a stable error
object. Final-only mode emits no draft to the CLI; approved progress and
terminal errors remain available through the event callback.

## Checkpoint and replay

Use **--checkpoint** to atomically persist the latest projection and **--resume**
to continue it. Keep the same run ID and adapter contract. Completed nodes are
not called again. The checkpoint records only public execution metadata,
declared state/results, resource usage, and mutation receipts—not private
chain-of-thought.

## Trace safety

Metadata traces contain identities and digests. Binding traces add declared
binding names. Full-I/O traces include declared inputs and outputs after JSON
Pointer redaction. Configure redaction for every sensitive field and verify the
captured trace before enabling full-I/O in production.
