# Natural voice qualification and rollout

Status: opt-in implementation and evaluation preparation. This document does not mark #2304, its dependencies or the overall natural voice program complete. No preregistered human evaluation, author-rated quality improvement, calibrated acceptance threshold or broad default rollout is established by the checked-in deterministic fixtures. Do not describe a passing profile registry suite as qualification of the writing system.

## Evidence and implementation map

| Workstream | Implementation/evidence entry point | Qualification still required |
| --- | --- | --- |
| #2293 evidence and ownership | [Versioned ledger and ADR](../../agentic/code/addons/voice-framework/docs/natural-voice/ADR-001-evidence-and-ownership.md) | Reassess claims when source versions or applicability change; ledger confidence is not product acceptance |
| #2294 author profiles | [Sidecars, rights, exports and revocation](writer-profiles.md) | Actual consenting authors, representative approved samples and author-approved preferences |
| #2295 exemplar selection | [Strategies and deterministic budget comparison](exemplar-selection.md) | Equal-budget model-quality comparison, contamination review and justified selector choice |
| #2296 factual brief | [Grounded briefs and permissions](writing-briefs.md) | Representative author/reader tasks and review of source entailment beyond structural checks |
| #2297 diagnostics | [Labeled contextual fixture evaluation](../../agentic/code/addons/voice-framework/docs/contextual-diagnostics-evaluation.md) | Independent language/domain annotations and error analysis; fixture precision/recall are not population rates |
| #2298 fidelity | [Final-output fidelity guards](fidelity.md) | Independent review of semantic changes and failures across intended tasks |
| #2299 revision | [Bounded revision and human acceptance](revision.md) | Real editing time/interventions, independent preference judgments and provider cost/latency measurements |
| #2300 consumers | [Consumer execution boundaries](consumers.md) | Packaged CLI/MCP recipes and each intended provider/consumer path verified on its actual version |
| #2301 channels | [Five packs, pilot fixtures and coverage matrix](channels.md) | Author-reviewed article/social/email/engineering/conversation outputs; external publisher adapter compatibility |
| #2302 evaluation | [Study protocol](evaluation-protocol.md) | Real pilot, justified preregistration, model runs, blind author/reader ratings and author-cluster analysis |
| #2303 receipts/migration | [Receipts, provenance and managed rollback](receipts-and-migration.md) | Packaged migration/rollback smoke and real-run reproducibility checks under the destination policy |
| #2304 rollout | This document and [workflow recipes](../../agentic/code/addons/voice-framework/docs/writing-workflows.md) | Engineering evidence plus prespecified human evaluation and per-slice release decisions |

The OMP and Antigravity fixtures are pinned, developer-proposed excerpt edits awaiting author review. They are not full campaign qualification, new provider verification, republished announcements or evidence that a model generated appropriate output. The five-pack fixtures exercise deterministic callbacks and constraint checks, not a human-reviewed on-demand writing pilot.

## Gates

| Gate | Required evidence before advancing | Current boundary |
| --- | --- | --- |
| Local opt-in implementation | Relevant engineering tests, typecheck/build, packaged installation, CLI/MCP recipe smoke; source/brief integrity, exact proofreading, protected content, structured-output identity, exception and rollback tests | Record command, package/version, environment, exit status and artifacts in the release run. This document does not substitute for that run |
| Consent and evaluation preparation | Approved sample use/sharing rights, disjoint development/final authors, enrollment/heldout separation, duplicate exclusions, pilot data and sample-size justification | Synthetic data or a declared hash cannot establish consent, independent data collection or a completed pilot |
| Frozen evaluation | Pilot-justified thresholds and precision/power assumptions, outcomes, missingness/exclusion/stopping rules, author-cluster analysis, frozen prompts/models/tokenizers and independent judges | No numerical default acceptance threshold is supplied here. Decide and justify it before accessing final outcomes |
| Channel/model qualification | Actual generation from at least the planned model families; blind author authenticity and reader suitability ratings; fidelity, editing effort, diversity, metric disagreement, measured costs/latency and uncertainty by slice | A pooled mean cannot qualify a failing author/channel/language/model slice. Mark sparse or failed slices unresolved/limited |
| Controlled rollout | Passing named consumer slices, verified disable/rollback, documented unsupported paths and preserved publication approval | Keep use opt-in. No broad default activation until channel-specific evidence supports it |

Separate operational controls from scientific decisions. The revision pass limit, a test character budget, fixture author counts, duplicate threshold examples and token reservations are not research-derived quality cutoffs. Calibrate and preregister decisions using actual pilot evidence. Preserve adverse results, missing ratings, judge disagreement and author rejection rather than selecting only successful examples.

## Release evidence record

For each eligible slice, publish the package revision, consumer/provider, model family and exact available snapshot, language, channel, editing strength, prompt/profile/selector/template versions, tokenizer/accounting method and final validator configuration. Record observed latency and actual reported cost, identifying missing measurements and reserved bounds separately. Report human and metric outcomes separately with author-cluster uncertainty, cell sizes, exclusions and disagreements. Voluntary language/proficiency data belongs in private study records; suppress identifying small groups in public reporting.

Language-agnostic API strings do not establish language quality coverage. The diagnostic fixture includes English contexts and explicit French rules; unsupported defaults and synthetic success cases do not qualify general French prose or other languages. Channel availability means the named pack can be selected, not that its outputs have passed human evaluation. No human-authorship guarantee follows from these interfaces or any optional detector score.

The release maintainer should attach actual packaged smoke artifacts to this record, including a real callback transformation followed by final validation. `writing plan` and `writing proofread` are deterministic local commands and cannot demonstrate model-based voice quality. MCP resource reads demonstrate scoped shared export only; they do not prove provider interception. The [consumer matrix](channels.md#consumer-coverage) lists explicit instruction handoffs and the still-incompatible external two-record chat publisher.

## Rollback and reevaluation

Use the [workflow recipes](../../agentic/code/addons/voice-framework/docs/writing-workflows.md) to inspect invocation/session/project selection and disable unwanted settings. Verify the empty-stack path retains exact bytes. Review undo returns the original source; learned-preference undo and migration rollback require their matching revision/hash artifacts. Never overwrite intervening profile changes. Keep publication approval, destination policy, idempotency and external publisher controls in their existing owner.

Re-run affected engineering and evaluation slices after changes to profile evidence/preferences, sample revocation, selectors/duplicate configuration, model/provider snapshots, prompts/channel templates, tokenizer/budget accounting, validators, diagnostic rules or consumer adapters. A change in any of these can invalidate earlier qualification even when the API is unchanged.

Before each release, the writing maintainer reviews evidence-ledger applicability and diagnostic exceptions; the evaluation maintainer reviews new research and unresolved disagreement; the consumer owner verifies its current provider contract. Record the review date, changes, remaining gaps and next review milestone in the release evidence record. This is a proposed recurring release gate, not a claim that scheduled reviews or human studies have already occurred.
