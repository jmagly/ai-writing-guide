# Flow Graph Capability Test Strategy

The fast headless gate validates the profile, inherited Flow constraints,
deterministic dry-run, runtime projection, retry/idempotency, checkpoints,
replay assessment, graph identity propagation, terminal observation, and the
read-only Cockpit view. Security-focused unit cases additionally prove
node-local authority denial before dispatch, predicate failure behavior,
checkpoint graph/version/run binding, and audience-specific metadata
redaction. It must not contact providers or execute fixture side effects.

The full gate adds live adapter and Sandbox qualification: success/failure
terminal evidence, timeout/disconnect ambiguity, HITL approval/denial/timeout,
restart resume, checkpoint restoration, cost/budget enforcement, and route
evidence handling. Sandbox-specific behavior is proven by
`roctinam/agentic-sandbox-conformance#4`; AIWG records but does not counterfeit
that evidence.

Required fixture classes are success, validation failure, runtime failure,
HITL denial, guarded-cycle exhaustion, transient retry success, retry
exhaustion/fallback, duplicate idempotency, Sandbox disconnect/timeout, and
checkpoint replay. Every machine report carries graph/run/node/edge identity
where that dimension exists.

The control rationale and degraded behavior for every required failure class
are recorded in [the Flow graph threat model](../../security/flow-graph-threat-model.md).
These local cases are linked to the #2134 fast suite; live Sandbox evidence
remains owned by `roctinam/agentic-sandbox-conformance#4`.
