# Composition evaluation research matrix

This matrix records the decision and evidence status for every source named in
#2118. It is based on the local corpus under `research-papers`; no source is
silently treated as stronger or broader than its recorded quality assessment.
The inspected corpus revision is
`a5acbb9ca1c7428a2aff9f4e577b1a48c3d2ed5e`.

| REF | Evidence status | Decision | Harness consequence |
|---|---|---|---|
| REF-020, Tree of Thoughts | Peer-reviewed NeurIPS 2023; local GRADE HIGH | Resolve: adopt as a deliberate-search comparison rationale, not a universal graph claim | Compare multi-path search with single-pass; record evaluation error, pruning risk, task fit, and additional compute |
| REF-021, Reflexion | Peer-reviewed NeurIPS 2023; local GRADE HIGH | Resolve: adopt generate-evaluate-refine as a baseline with evaluator safeguards | Measure false-positive evaluation, premature stop, retry count, and last-accepted recovery |
| REF-024, LATS | Peer-reviewed ICML 2024; local GRADE HIGH | Resolve: adopt as reasoning/acting/planning prior art, not proof that Flow graphs improve quality | Include acting/tool tasks, search cost, value/evaluator identity, and recovery |
| REF-1275, Multiagent Debate | Peer-reviewed ICML 2024; local GRADE A- | Resolve: adopt parallel/debate evidence with explicit limits | Compare independent candidates, shared/independent models, evaluator disagreement, context/cost, and convergence-not-correctness |
| REF-1453, Evaluation Trap | arXiv v1 methodological preprint; local GRADE B | Resolve for methodology only | State the claim first, test proxy routes, use contrastive failure cases, and keep the empirical claim gate closed on conformance data |
| REF-1454, Self-Improvement Can Self-Regress | arXiv v1 empirical preprint; local GRADE B | Defer direct transfer: training-time RLVR collapse is not an inference-composition result | Retain trajectory, early-stop, peak-result, and multi-metric regression hypotheses for later provider studies |
| REF-1527, ZEBRA | Workshop/preprint; local GRADE B+ | Resolve as an engineering candidate, not a default allocator | Ablate budgets and phases; report controller overhead, transfer limits, requested/realized allocation, and task screening |
| REF-1528, Token Budgets | Single-author arXiv preprint with executable artifacts; local GRADE B+ | Resolve for budget-boundary engineering | Track non-bypassable ownership, delegated/retried spend, duplicate receipts, enforcement layer, and provider-accounting trust |
| REF-1537, BudgetThinker | arXiv/OpenReview preprint; local GRADE B+ | Defer direct adoption because it requires model training and inference-engine changes | Adopt telemetry distinctions: adherence versus utilization, natural completion versus forced cutoff, and quality-per-token/time curves |

## Further-investigation queue

| REF | Queue state | Evidence needed to advance |
|---|---|---|
| REF-020 | Resolved for harness design | Provider-era replication on the fixed task suite before performance claims |
| REF-021 | Resolved for baseline design | Independent evaluator and false-positive-stop measurements |
| REF-024 | Resolved for comparison design | Tool-task replication and cost/recovery comparison against plain DAG/loop controls |
| REF-1275 | Resolved for parallel-policy design | Newer-model replication, blinded preference, and convergence calibration |
| REF-1453 | Resolved for claim-gate methodology | Empirical validation of discriminative benchmark conditions remains open |
| REF-1454 | Deferred for direct composition inference | Evidence that its training-collapse mechanism transfers to inference-time refinement |
| REF-1527 | Resolved as experimental ablation | Independent reproduction, controller-overhead accounting, and broader task families |
| REF-1528 | Resolved for hard-budget telemetry | Provider billing reconciliation and non-Rust enforcement validation |
| REF-1537 | Deferred for direct runtime adoption | Closed-provider equivalent or a governed trained-model/inference-engine integration |

## Evidence boundary

Peer-reviewed results support the existence and task-contingent usefulness of
search, reflection, and debate patterns. They do not establish that AIWG's
specific Flow graph implementation improves quality. The preprints contribute
testable risks and engineering hypotheses with stronger hedging. The shipped
synthetic records resolve harness conformance only; provider performance,
human preference, and general product positioning remain `NOT RUN` or blocked.
