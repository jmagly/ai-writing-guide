# HITL Approval Workflow v1

Status: supported orchestration contract
Issue: AIWG #1565
Transport: `https://agentic-sandbox.aiwg.io/extensions/hitl-prompt/v1`

This contract defines AIWG's orchestration policy above the agentic-sandbox
transport extension. The sandbox carries prompt and response envelopes; AIWG
owns identity, authorization, channel routing, deadlines, escalation, audit,
and Mission/Flow transitions.

## Canonical transport boundary

AIWG opts in with the full extension URI. It accepts prompts only from an A2A
`input-required` task status whose message metadata contains a valid v1
envelope. `prompt_id` is an RFC 4122 UUID, `response_schema` is a draft-2020-12
object schema no larger than 64 KiB, and optional responder/deadline fields must
match the upstream schema. Additional envelope properties fail closed.

Responses use exactly:

```json
{
  "metadata": {
    "hitl_response_for": {
      "prompt_id": "<open prompt UUID>",
      "payload": {}
    }
  }
}
```

AIWG validates the payload before forwarding it. A 422 response is retryable
while the prompt remains open; an unknown/already-answered 409 is terminal for
that response attempt and requires state reconciliation.

## Identity and routing

Every delivery adapter supplies an authenticated principal identifier and a
channel name. Missing `allowed_responders` means `any`. `specific:<id>` is
enforced before collecting or forwarding a response. `consensus:N` must be
handled by an aggregate adapter that records N distinct authenticated
principals; a single-principal adapter fails closed. Unknown responder patterns
are ignored for forward compatibility, but they never grant access.

CLI, Cockpit web, and future chat adapters are delivery channels only. They do
not mint approval capability. The Mission/Flow controller remains the policy
decision point and the executor independently validates prompt correlation and
payload schema.

## State model

| Event | Mission/Flow step | Prompt record |
|---|---|---|
| valid prompt received | `awaiting-approval` | `pending` |
| authorized valid response accepted | `running` | `responded` |
| local or executor schema rejection | `awaiting-approval` | `invalid`, retryable |
| deadline elapsed | policy-selected `paused`, `failed`, or `cancelled` | `expired` |
| operator cancellation | `cancelled` | `cancelled` |
| delivery/transport failure | `paused` unless retry budget remains | `delivery-failed` |
| unknown/replayed correlation | `paused` for reconciliation | `conflict` |

The controller persists the transition before publishing the next externally
visible Mission revision. Retries retain the same `prompt_id`; a new prompt is
required after expiry or cancellation.

## Deadline, escalation, cancellation, and retry

- AIWG owns a deadline timer and does not assume the executor expires prompts.
- A configured escalation route receives the same prompt identity and policy,
  never a newly broadened responder policy.
- Cancellation aborts channel collection and prevents a later response from
  being forwarded.
- Local schema errors and executor 422 responses use a bounded retry budget.
- Transport failures use the Mission retry policy and idempotency key; they do
  not silently convert to approval or denial.
- Expiry, cancellation, exhausted retry, and correlation conflict are durable
  outcomes requiring an operator-visible reason.

## Audit and provenance

Every attempt records timestamp, authenticated principal, channel, prompt ID,
task/context IDs, outcome, duration, and a redacted error. The response payload
is subject to the decision-audit classification and redaction rules in #1567.
Mission, Flow, provider, sandbox, issue, and trace correlation identifiers are
attached by the orchestration audit sink rather than added to the upstream
transport envelope.

## Provider-native composition

If a provider owns the interactive loop, its adapter still maps the response to
this contract: authenticated principal, responder-policy check, schema check,
canonical correlation envelope, bounded retry, Mission transition, and audit.
Provider-native prompts that cannot supply these guarantees remain observable
but are not advertised as `hitl-prompt/v1` approvals.

## Evidence

- `src/a2a/hitl.ts` validates the canonical request and builds the canonical
  response envelope.
- `src/a2a/hitl-driver.ts` enforces responder policy, deadline, bounded retry,
  delivery, and decision audit outcomes.
- `test/fixtures/contracts/hitl-prompt-v1.json` mirrors the upstream sandbox
  prompt/response examples used by unit conformance tests.

The upstream cross-link is `roctinam/agentic-sandbox#234`; related AIWG work is
#1534, #1546, #1567, and #1657.
