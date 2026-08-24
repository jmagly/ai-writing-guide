# ADR: UHP as a remote harness transport

- Status: Accepted for experimental client implementation
- Date: 2026-08-24
- Decision owners: AIWG maintainers
- Related issues: #2168, #2169, #2170, #2171, #2172, #2173, #2176, #2177, #2179
- Protocol baseline: UHP `2026-08-11`

## Context

AIWG needs to execute work on remote Codex, Claude Code, Hermes, and future
harnesses without turning each remote harness into an AIWG provider. Unified
Harness Protocol (UHP) exposes one endpoint that may advertise several
harnesses and models, then provides response, session, streaming, file, and
artifact lifecycles.

That concern is adjacent to, but distinct from, three existing boundaries:

- AIWG providers describe how AIWG content is deployed to and represented in a
  local provider or harness.
- A2A delegates work between agents and retains A2A task and agent semantics.
- MCP supplies tools, resources, prompts, and interaction primitives to a
  client; it is not a remote harness task transport.

The canonical Mission Protocol is owned by #2176 and its architecture and
adapter issues. UHP must consume that adapter contract. UHP must not introduce
a second Mission record, state machine, ledger, or persistence format.

## Decision

AIWG will implement UHP `2026-08-11` as an experimental, client-only transport
adapter behind a transport-neutral remote harness execution port. The port is
an application boundary. UHP and A2A adapters implement it independently and
preserve their native wire semantics in namespaced evidence.

The initial UHP scope is:

- endpoint and harness discovery;
- response submission and observation, including streaming;
- stored-response reads and reconciliation;
- continuation and cancellation;
- input files and returned artifact retrieval; and
- projection through the canonical Mission adapter when that contract becomes
  available.

AIWG does not expose a UHP server in this scope and makes no UHP server
conformance claim. A future server initiative requires a separate ADR,
threat model, protocol qualification suite, and release gate.

## Remote harness execution port

The application-facing port uses opaque transport references and normalized
observations. It does not expose UHP paths or A2A JSON-RPC methods as its own
API.

```ts
interface RemoteHarnessExecutionPort {
  discover(target: RemoteEndpointRef): Promise<RemoteHarnessCatalogue>;
  submit(request: RemoteExecutionRequest): Promise<RemoteExecutionHandle>;
  observe(handle: RemoteExecutionHandle): AsyncIterable<RemoteObservation>;
  read(handle: RemoteExecutionHandle): Promise<RemoteExecutionSnapshot>;
  continue(
    handle: RemoteExecutionHandle,
    request: RemoteContinuationRequest,
  ): Promise<RemoteExecutionHandle>;
  cancel(handle: RemoteExecutionHandle): Promise<RemoteCancellationReceipt>;
  listArtifacts(handle: RemoteExecutionHandle): Promise<RemoteArtifactRef[]>;
  retrieveArtifact(
    artifact: RemoteArtifactRef,
    destination: ApprovedArtifactDestination,
  ): Promise<RemoteArtifactReceipt>;
}
```

Port invariants:

1. `transport` is explicit (`uhp`, `a2a`, or a future registered adapter) in
   every endpoint, handle, observation, and receipt.
2. Handles preserve native identifiers as opaque strings; callers never infer
   protocol identity from identifier shape.
3. `observe` reports observations, not commands. A disconnect produces an
   unknown observation state and never implies cancellation.
4. `cancel` records that cancellation was requested. Only an authoritative
   terminal observation proves that remote work was cancelled.
5. Unknown additive native events and output items are retained in namespaced
   extensions or safely ignored. They do not silently change normalized state.
6. Artifact retrieval accepts only an approved destination and returns a
   receipt; transport adapters do not choose arbitrary filesystem paths.

The interface is structural guidance until #2177 selects the canonical Mission
schema and #2179 provides its codecs. Concrete code may refine type names, but
must preserve these operations and invariants.

## Lifecycle mapping

The canonical state names in this table are requirements on the Mission
adapter, not a new schema definition. Native state and diagnostic detail remain
available beside every normalized projection.

| UHP observation | Normalized meaning | Terminal | Required handling |
|---|---|---:|---|
| `in_progress` | running | no | Continue observing or reconcile with a stored response. |
| `completed` | completed | yes | Preserve output, usage, artifacts, and native terminal event. |
| `failed` | failed | yes | Preserve typed error and partial output without sensitive detail. |
| `incomplete` | incomplete | yes | Preserve the incomplete reason; budget exhaustion is not failure. |
| `cancelled` | cancelled | yes | Record only after an authoritative UHP response or event reports it. |
| stream disconnect or client timeout | unknown | no | Retain last sequence and reconcile through stored-response reads. |
| unrecognized native state | unknown | no | Preserve the native value and emit an explicit diagnostic. |
| `session_busy` error | running/busy observation | no | Do not start duplicate work; retry or wait under bounded policy. |

A cancellation request, network timeout, or closed client process cannot
transition a mission to `cancelled`. Duplicate terminal events and sequence
gaps are protocol diagnostics, not alternative terminal states.

## Identity and evidence mapping

The Mission adapter owns mission and run identifiers. The transport adapter
adds a namespaced UHP identity block and never overloads canonical identifiers:

| Identity | Ownership | Evidence requirement |
|---|---|---|
| mission id | canonical Mission Protocol | Stable across continuation and reconciliation. |
| run id | canonical Mission Protocol | Identifies one execution lineage element. |
| endpoint profile | AIWG routing/configuration | Record profile name and policy digest, not credentials. |
| UHP version | UHP adapter | Always record `2026-08-11`; never infer or silently downgrade. |
| response id | UHP server | Preserve for reads, continuation, cancellation, and audit. |
| previous response id | UHP server | Preserve continuation lineage. |
| session id | UHP server | Preserve across continued work and busy-session handling. |
| requested/actual harness id | caller/server | Preserve both plus any substitution reason. |
| requested/actual model id | caller/server | Preserve both plus any substitution reason. |
| container id | UHP server | Preserve when supplied; do not treat as a local container id. |
| file/artifact id | UHP server | Preserve with media type, name, digest, and source metadata. |
| event sequence | UHP stream | Preserve last accepted sequence and terminal-event evidence. |

Vendor extensions required for audit or lossless round trips live under the UHP
adapter namespace selected by the Mission Protocol. They are never promoted to
canonical fields merely because one server emits them.

## Version negotiation and fallback

Every UHP request sends `UHP-Version: 2026-08-11`. Discovery may report other
versions, but this adapter neither negotiates downward nor retries with an
unpinned version. Unsupported versions fail locally when known before a
request, or map the server's `unsupported_protocol_version` error to a typed
terminal transport failure.

There is no automatic fallback between UHP and A2A. Routing selects one
transport and one endpoint profile before submission. A policy may describe an
ordered set of explicit attempts, but each transition must:

- occur before work begins, or prove the prior attempt did not create work;
- create an audit event naming the failed transport, the newly selected
  transport, and the policy that authorized the transition;
- use a new transport-native request identity; and
- preserve the earlier attempt and its unknown/terminal state in Mission
  evidence.

An ambiguous submit result or unknown remote state forbids cross-protocol
fallback because a second submission could duplicate work.

## Alternatives considered

### Model UHP harnesses as AIWG providers

Rejected. A provider is a local deployment and capability surface, while one
UHP endpoint can advertise multiple heterogeneous harnesses. Treating each as a
provider would flatten endpoint discovery, duplicate routing, and conflate
remote execution with content deployment.

### Extend the A2A implementation

Rejected. A2A agent delegation and UHP harness execution have different wire
identities, discovery models, lifecycle errors, streaming events, and artifact
semantics. They can share the application port and canonical Mission adapter
without pretending either protocol is the other.

### Add a standalone transport adapter

Accepted. This preserves protocol fidelity while giving Mission, Flow,
Cockpit, activity, and audit consumers one transport-neutral application
boundary.

### Integrate HarnessRouter directly

Rejected as the architectural contract. HarnessRouter may be one UHP server or
test target, but coupling to its implementation would replace a versioned open
protocol boundary with product-specific behavior and weaken conformance tests.

## Consequences

- UHP availability is reported as transport capability, never provider-native
  capability or server conformance.
- Cockpit and activity views identify UHP-backed work explicitly rather than
  rendering it as A2A.
- Client implementation can begin behind the port, but canonical Mission writes
  remain blocked until #2177 and #2179 define and implement the adapter.
- Qualification must cover version pinning, lifecycle/state loss, identity
  preservation, stream reconciliation, artifact safety, and explicit routing.
- The UHP feature remains experimental until the qualification and
  documentation issues tracked by #2168 are complete.

## Future server boundary

A UHP server would invert the trust boundary: authenticate remote principals,
authorize harness/session/file access, isolate execution, enforce retention,
emit conformant streams, and protect AIWG-local state. None of those server
responsibilities are implied by this client ADR. Server work must be separately
scoped and cannot reuse client qualification as evidence of conformance.
