# Bounded revision and author review

`src/writing/voice-revision.ts` keeps the original, received proposal payloads, located edits, validated candidates and best retained text separate from the operational receipt. Human editing and acceptance are supported workflows. There is no authenticity score, detector gate or claim that repeated model critique establishes personal voice quality.

## Human comparison without a judge

`createRevisionReview(original, edits, origin)` builds a comparison from exact UTF-16 spans. Each edit supplies `id`, `start`, `end`, `expected`, `replacement` and `reason`. It rejects stale expected text, overlapping edits, duplicate IDs and boundaries splitting Unicode surrogate pairs. `origin` is explicitly `human` or `generated`.

`acceptRevisionEdits(review, decision)` requires the original `sourceHash`, a human actor and a complete disjoint partition into `acceptedIds` and `rejectedIds`. It applies only accepted edits, retaining the complete proposed candidate and decisions for comparison. An incomplete decision or stale source/candidate fails; extra decision fields cannot change the correction origin. `undoRevisionReview(review)` returns the exact original after its source hash is verified.

These are data APIs. The caller supplies the human action and is responsible for presenting the actual edits before acceptance; an actor string is not independent authentication or biological authorship certification. Generated suggestions can be accepted as edits, but remain labeled generated and cannot automatically become learned profile preferences.

## Automatic assistance

`runVoiceRevision(original, options)` supports optional `critique`, `revise` and independent `reviewCandidate` callbacks. Each receives a source snapshot, current best text, editing strength, cancellation signal, token allowance and optional parsed writing brief. Revision returns a candidate plus exact located edits; the engine verifies that applying those edits reproduces the candidate. Received payloads remain in `receivedProposals` even when that verification fails. Malformed/unvalidated payloads are artifacts for review, never retained prose.

| Strength | Behavior |
|---|---|
| `preserve` | Return the exact original and invoke no automatic callbacks. |
| `light` | Changes must fit located critique spans and cannot insert/remove paragraph line breaks. |
| `substantive` | Permit broader proposed edits, subject to the same fidelity and review requirements. |

The original brief is parsed and copied before execution. Fidelity compares every candidate with the original and the brief, rather than only with the previous revision. A material failure from the conservative fidelity guards stops the run before an automatic reviewer can approve it. Other changed prose remains uncertain until an explicit independent reviewer returns `fidelity: pass`. The reviewer then judges task/author preference relative to the current best using `better`, `same` or `worse`; its required rationale explains the judgment. Detector scores are not an input. The callback implementer must actually provide independent review; the function cannot certify independence from a callback name.

A candidate is retained automatically only after fidelity passes and task/author preference is better. Same/worse judgments, fidelity failure/uncertainty and unchanged content stop the loop. Previously valid best text survives a worse later attempt. Only the final best candidate has `retained: true`; all attempted candidates remain available, with located fidelity assessments and the independent review rationale. Without a reviewer, the original remains best and the generated comparison is returned with `human-review`, ready for the human APIs above.

The default pass limit is two. `maxPasses` can be configured from zero through the operational ceiling of 100, always under explicit token/time limits. This ceiling and the default are runtime controls, not research-derived optimal iteration counts.

## Costs, deadlines and recovery

Required limits are `tokenBudget`, `timeBudgetMs` and `perCallTokenReservation`. Before each critique, revision or review call, the engine reserves the full per-call allowance. It refuses to start a call when that reservation cannot fit. Callbacks receive that allowance as `maxTokens` and must enforce it in their provider adapter, including whatever input/output token accounting that provider requires.

A callback returns `{ value, usage? }`. Reported usage includes actual provider-reported `tokens`, model and provider identifiers, and optional measured `costUsd`. Successful reported usage replaces the reservation in the receipt. Without usage, the full reservation remains charged as `reserved-upper-bound`; it is never represented as an exact measured token count. The receipt separately reports `reportedTokens`, `reservedTokens`, `chargedTokens`, known reported cost and whether cost reporting was complete. No pricing table or model cost is inferred.

A provider exceeding its allowance produces `provider-budget-overrun`; the engine records the observed usage honestly and stops. A local budget cannot undo already incurred remote charges, so a provider adapter must enforce the allowance. Cancellation/deadline aborts are passed to the active callback. An uncooperative remote operation might continue after the local result returns; its full reservation remains charged because usage is unknown. JavaScript cannot preempt synchronously blocking callback code, but an expired deadline is checked before retaining its response.

Cancellation, time/token exhaustion, callback errors and validation failures return the recoverable result. Original text, completed proposal payloads and candidates survive; the receipt identifies the stop reason and elapsed time. Persist this private result if recovery across process restarts is required—the core does not write files. Receipts contain phase/usage metadata rather than prose. Proposal and review artifacts contain author text and require the caller's normal privacy controls. Arbitrary callback exception messages are not copied into receipts.

## Explicit learning and undo

`proposeWriterLearning(profile, humanAcceptance, overrides)` accepts only a nonempty set of actual textual corrections with `origin: human` and an explicit human acceptance artifact. Generated suggestions, even accepted ones, do not enter this learning path. The caller supplies proposed expression overrides; the engine does not infer demographics, personality or signature phrases from a correction. No profile changes occur when a proposal is created.

The proposal binds the profile ID, revision and full profile hash, plus correction source/output hashes, accepted correction IDs and the correcting actor. `acceptWriterLearning(profile, proposal, { expectedRevision, actor })` is a separate explicit action. It rejects a stale profile, validates overrides against the writer-profile schema, then advances profile version, revision and cache epoch. It returns a new profile and an undo artifact; it does not save either. Stores must coordinate their own optimistic write using the original expected revision rather than silently overwriting a newer profile.

`undoWriterLearning(current, undo)` verifies the exact post-acceptance profile hash before restoring the prior overrides. Undo advances revision/version/cache epoch again to preserve auditability and invalidate dependent caches. Its provenance retains the correcting actor separately from the actor who accepted the profile change. An intervening profile modification causes an explicit stale-undo conflict.

## Validation and boundaries

Run:

```sh
npx vitest run --config config/vitest.config.js test/unit/writing/voice-revision.test.ts
```

The deterministic suite covers default two-pass bounds, preserve/light/substantive behavior, no-improvement and worse-second-pass stops, fidelity precedence, missing/uncertain judges, token exhaustion/overruns, reported versus reserved usage, cancellation, timeout, malformed proposal retention, Unicode edit boundaries, partial acceptance, exact undo, explicit learning, generated-origin rejection and stale profile conflicts. The callbacks are synthetic fixtures; any usage values supplied by those tests are fixture accounting inputs, not real provider measurements.

No human-rated quality experiment, independent model evaluation or production provider run is claimed. The source studies motivate bounded editing and author participation; they do not prove that this loop improves personal style or that two passes are optimal. Human post-editing is a supported outcome, even when automatic measures still detect model-associated patterns.
