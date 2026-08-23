# Flow Graph Profile Threat Model and Degraded Modes

**Status:** implemented security baseline for `graph.flow.aiwg.io/v1`  
**Scope:** optional GraphPlaybook validation, planning, execution projection, adapters, evidence, replay, HITL, Sandbox, and Cockpit  
**Traceability:** #2135; GRAPH-REQ-003 through GRAPH-REQ-007; fast conformance #2134; external Sandbox conformance `roctinam/agentic-sandbox-conformance#4`

This assessment treats model output, tool output, manifests, checkpoints, adapter results, and remote runtime observations as untrusted. Graph shape does not establish authority, reliability, or success. The conductor remains the authority and audit owner.

## Assets and trust boundaries

| Boundary | Untrusted input crossing it | Required control |
|---|---|---|
| Manifest → schema/validator | IDs, predicates, routes, ceilings, capabilities, fallback declarations | structural and semantic validation before planning or dispatch |
| Planner → runtime | normalized graph and route policy | immutable graph/version/run identity; deterministic plan; no execution in dry-run |
| Runtime → node adapter | prompt, typed inputs, node-local authority, invocation key | authority intersection; typed bindings; bounded resources; stable idempotency key |
| Adapter → Ralph/RLM/job/provider/durable code | projected node request | adapter may preserve or narrow authority, never add it |
| AIWG → A2A/Sandbox | dispatch and execution metadata | explicit extension contract, idempotency, unknown-state handling, terminal evidence validation |
| Runtime → checkpoint/replay | state, receipts, events, completion sets | graph/version/run binding and fail-closed compatibility check |
| Runtime → audit/telemetry/Cockpit/public output | graph identity, route summary, evidence | audience-specific allowlist and redaction; no private reasoning or task context |
| HITL responder → runtime | approve, deny, timeout | declared responder/deadline/routes; absence is denial of execution, not approval |

## STRIDE assessment

| ID | STRIDE | Threat and impact | Primary controls | Residual risk |
|---|---|---|---|---|
| FG-S01 | Spoofing | forged graph/run/node/edge identity joins unrelated evidence | schema validation; runtime-generated node-run IDs; checkpoint identity binding; metadata validation | remote attestation remains a Sandbox gate |
| FG-T01 | Tampering | route predicate or model/tool output changes control flow | restricted predicate language or explicit evaluator; boolean decision evidence; evaluator failure stops execution | custom evaluators require separate review |
| FG-R01 | Repudiation | missing node/edge evidence makes decisions deniable | append-only conductor ledger; stable IDs; graph events require metadata; checkpoint event history | external sink availability is deployment-specific |
| FG-I01 | Information disclosure | task context, private reasoning, identifiers, or evidence leaks via telemetry/Cockpit/docs | typed metadata allowlist; declared evidence only; `projectGraphMetadata` audience projections; public examples use synthetic data | operators control retention and access to internal logs |
| FG-D01 | Denial of service | cycles, fanout, retries, or reducers exhaust resources | bounded cycles, activation/concurrency/token/cost/time ceilings, retry limits, explicit joins | a permitted node may consume its full budget |
| FG-E01 | Elevation of privilege | downstream node or fallback gains tools/capabilities | effective authority is runtime allowlist ∩ graph declaration ∩ node declaration; adapter projection cannot widen; denial occurs before invocation | live adapters need qualification evidence |
| FG-T02 | Tampering | checkpoint alteration replays different graph/version/run state | fail-closed replay assessment; graph/version/run match; stable invocation receipts | checkpoint authenticity is external to this alpha profile |
| FG-T03 | Tampering | retry/replay duplicates external side effects | side-effecting nodes declare `idempotent` or `exactly-once` plus stable key; receipts suppress reinvocation | exactly-once behavior depends on remote idempotency support |
| FG-E02 | Elevation of privilege | fallback bypasses HITL or authority checks | fallback is declared and validated; fallback invocation repeats authority enforcement; no implicit fallback on validator/predicate/metadata failure | unsafe custom manifests can still choose broad declared authority |
| FG-S02 | Spoofing | ambiguous Sandbox disconnect is reported as success | unknown/disconnected state is a recorded terminal failure; success requires terminal evidence | full live evidence is external conformance work |

No new signing or attestation mechanism is introduced here. Cryptographic primitive selection and secret handling are outside this issue.

## Authority and side-effect invariants

1. Effective capability/tool scope is the intersection of the runtime allowlist, graph declarations, and node declarations. An empty runtime allowlist means no authority. Missing authority fails before adapter invocation.
2. Edges carry data and control only. They never carry, merge, or widen authority. Adapters may preserve or narrow the already-computed scope only.
3. HITL approval applies only to the named gate and run. Missing, denied, or timed-out approval never implies approval. Denial and timeout use separately declared routes.
4. Any operation with external side effects uses an idempotency declaration and stable invocation key. Retry uses the same key. Replay consumes a compatible receipt and does not invoke the node again.
5. `sideEffectMode: none` is required for parallel dispatch. An unsafe fallback is never synthesized after validation, predicate, reducer, metadata, or checkpoint failure.

## Metadata and redaction policy

Only fields in `GraphExecutionMetadata` may cross graph observability boundaries. Free-form prompts, user/task context, tool output, private reasoning, and raw predicate input are prohibited. Route evidence is a declared, minimized summary, never chain-of-thought.

| Audience | Allowed | Removed |
|---|---|---|
| Internal audit/adapter | validated contract fields needed for correlation | all undeclared fields |
| Cockpit | graph/run/node identity, runtime/state, declared route reason/evidence | replay lineage and all undeclared user/task context |
| Public docs/export | graph version, node/edge labels, runtime/state | graph/run/node-run/checkpoint/replay identity, route reason/evidence, user/task context |

Invalid metadata is rejected rather than partially displayed. Deployments should apply access control and retention to internal audit data; redaction is not a substitute for authorization.

## Degraded-mode matrix

| Trigger | Behavior | Evidence/operator signal | Recovery |
|---|---|---|---|
| Invalid graph | **Fail closed before planning/dispatch** | validation diagnostics | correct manifest and revalidate |
| Route predicate/evaluator failure | **Fail closed; no fallback inferred** | typed evaluator error; last completed checkpoint remains | repair/review evaluator, then explicit resume |
| Cycle guard or resource ceiling exhausted | **Terminal failure or declared typed partial result only** | exhausted route/ceiling event | revise bounded policy or start a new run |
| Reducer/typed output failure | **Fail closed under node failure policy; fallback only if predeclared** | node attempt/failure event | correct reducer/output or use reviewed declared fallback |
| HITL missing/timeout/denial | **Block or take the separately declared timeout/denial route** | decision and route event | authorized new decision; never convert denial to approval |
| Sandbox disconnect/unknown state | **Fail closed; do not retry a side effect without the same idempotency key** | unknown/disconnected terminal state | reconcile remote receipt/state, then replay compatibly |
| Checkpoint missing/corrupt/incompatible | **Reject restore** | graph/version/run mismatch reasons | restore a compatible checkpoint or start a new run |
| Graph metadata invalid | **Reject graph event/display projection** | metadata validation error | regenerate metadata from the authoritative run |
| Audit/telemetry sink unavailable | Continue only when deployment policy does not require durable audit; otherwise **fail closed** | local retained event plus degraded-health alert | restore sink and flush retained ordered events |
| Cockpit unavailable | Runtime may continue; Cockpit is read-only and not an authority source | service-health alert | restore view from audit/checkpoint state |

There is no one-step “continue anyway” override for integrity, authority, checkpoint, metadata, HITL, or unknown-Sandbox failures. A deployment that adds an override needs a separately reviewed, witnessed, time-bounded, externally logged ceremony.

## Control verification

| Control | Verification |
|---|---|
| schema, bounded cycles, joins/fallbacks | graph validator fixtures and `static-validation-failure` conformance |
| node-local authority intersection | composition runtime and graph runtime authority-denial tests |
| route failure is fail-closed | graph runtime predicate-failure test |
| retry/replay idempotency | `duplicate-idempotency-replay` conformance |
| checkpoint identity binding | graph replay assessment and incompatible-restore test |
| metadata validation/redaction | graph metadata security projection tests |
| HITL denial/timeout behavior | `hitl-blocked` and `hitl-denial` conformance |
| Sandbox unknown state | `sandbox-disconnect` conformance; live behavior remains `agentic-sandbox-conformance#4` |
| resource exhaustion | cycle and budget conformance cases |
| safe public patterns | packaged fixtures use bounded routes, explicit fallback policy, narrowed node authority, and synthetic evidence |

## Security conclusion

The optional profile is suitable for alpha use with these controls and stated external gates. It must not be represented as providing remote attestation, universally durable audit, or exactly-once external effects until Sandbox and adapter conformance supply that evidence.
