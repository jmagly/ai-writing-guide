# UHP client threat model

- Scope: experimental AIWG client for UHP `2026-08-11`
- Trust model: remote endpoint, harness output, events, errors, filenames, and
  artifact bytes are untrusted
- Out of scope: UHP server implementation and conformance
- Release posture: any failing UHP security/conformance test blocks the normal
  repository test gate

## Trust boundaries

```text
operator config ──secret reference──▶ request-time resolver
       │                                  │ bearer (memory only)
       ▼                                  ▼
AIWG routing ──pinned HTTPS request──▶ remote UHP server
       ▲                                  │
       └──untrusted JSON/SSE/artifacts─────┘
                     │
                     ▼
          approved artifact directory
```

Mission, Flow, Cockpit, activity, and audit receive normalized evidence plus
namespaced native identifiers. They do not receive bearer values. A2A, MCP,
provider deployment, and UHP remain separate routing domains.

## Threats and controls

| Boundary | Threat | Client control | Verification |
|---|---|---|---|
| Configuration | Inline bearer copied into source or receipts | Schema and runtime validation accept only `{source:"env",name}` references; no bearer CLI flag exists | `config-security.test.ts`, config schema |
| Credential resolution | Token leaks through messages, upstream detail, redirects, events, or logs | Resolve immediately before authenticated requests; structured redaction removes known values and bearer-like text; errors cap detail; discovery is unauthenticated | typed-error and redaction tests |
| Transport | Downgrade, plaintext interception, or lookalike endpoint | Pin `UHP-Version: 2026-08-11` on every request and verify every response; require TLS except explicitly trusted loopback; validate discovery identity and class/capability consistency | discovery/client tests |
| Endpoint | SSRF through profile, caller override, private literals, or redirect | No per-call endpoint override; reject URL credentials/fragments/non-HTTP schemes; private and loopback addresses require explicit policy; optional host allow-list; redirects default deny; authenticated cross-origin redirect always fails before forwarding | endpoint/redirect tests |
| Principal scope | Guessed response/session/file identifiers reveal another principal's objects | Validate opaque prefixed identifiers; preserve server `404` typed failures without changing them to `403` or inferring existence; every operation authenticates independently | error mapping and identifier tests; two-principal live qualification remains required |
| Task submission | Timeout retry duplicates remote edits | Canonical request digest binds `Idempotency-Key`; changed content cannot reuse a key; retryable ambiguous requests reuse the same key; unknown remote state remains explicit | idempotency/retry tests |
| Session concurrency | Blind retry of `session_busy` starts duplicate work | Classify as retryable but do not automatically resubmit; caller waits for authoritative terminal state | typed-error test |
| Streaming | Dropped/duplicated facts, malformed payload, multiple terminal results | Incremental SSE parser requires first event, gapless sequence from zero, exactly one terminal event; unknown additive events remain compatible | SSE deterministic fixtures |
| Disconnect | UI reports cancelled when remote work continues | Disconnect and inactivity timeout project `unknown`; stored-response read is authoritative; cancellation receipt alone is not terminal proof | Mission and reconciliation tests |
| Resource exhaustion | Unbounded tasks, inactivity waits, uploads, downloads, or artifact sets | Positive profile ceilings for task time, request/inactivity waits, uploads, artifact bytes/count, and retries | config/client/artifact tests |
| Artifacts | Traversal, encoded traversal, hostile filename, stored XSS, oversized bytes, symlink escape | Strict opaque ids, repeated percent-decoding and basename confinement, approved non-symlink destination, `nosniff`, byte/count caps, exclusive restrictive temporary files and atomic rename | hostile artifact fixtures |
| Retention | Client overstates deletion or local persistence policy | Client records remote identifiers and server result only; it does not claim server deletion, retention, or revocation guarantees | architecture review; live qualification |
| Error hygiene | Server exposes token, internal path, host, or stack | Preserve machine code but sanitize message/detail before surfacing; never serialize known bearer | redaction tests |

## UHP security chapter client obligations

### Credentials

The bearer is excluded from configuration, arguments, returned values, Mission
evidence, errors, and activity payloads. AIWG cannot prove a server's provider
credential isolation; server-side checks remain part of live qualification.

### Object scope

The client never treats `403` as evidence that a guessed object exists and
retains `404` object errors as terminal request failures. Full two-principal
scope verification requires a live qualified endpoint and is not replaced by
single-principal unit tests.

### Hostile artifacts

Downloads require the normative `nosniff` header and an approved filesystem
destination. Media type and transport ids remain in receipts/evidence; content
is never executed or previewed by this client.

### Prompt injection

The client exposes task budgets and preserves native event/tool facts. Harness
selection and tool restriction are endpoint configuration concerns; the client
does not claim that UHP makes untrusted content safe.

### Resource exhaustion

All local waits and transfers are bounded. A task budget stop maps to
`incomplete`, not success or failure. `session_busy` is never blindly retried.

### Data handling and retention

AIWG retains only evidence required by Mission policy. Remote transcript,
session, and artifact retention remain server policy and must be reported by
the endpoint; the client does not invent a retention guarantee.

### Transport and error hygiene

TLS and pinned version checks fail closed. Redirects are evaluated before any
credential forwarding. Sanitized errors retain code, retryability, and unknown
remote-state semantics without returning upstream secrets or raw bodies.

## Residual risks and qualification gates

- DNS rebinding and proxy behavior require deployment-level egress controls in
  addition to application URL policy.
- Two-principal object isolation and server retention need live endpoint tests.
- A malicious but schema-valid server can lie about capabilities; qualification
  must exercise behavior rather than trusting discovery alone.
- UHP remains experimental until #2174 qualification and #2175 documentation
  gates are complete. This client implementation is not a server conformance
  claim.

