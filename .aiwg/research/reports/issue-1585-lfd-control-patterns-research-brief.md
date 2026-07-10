# Issue 1585 Research Brief: LFD Control Patterns for AIWG Agent Loops

**Issue**: Gitea `roctinam/aiwg#1585`  
**Status**: Research spike / pre-construction review  
**Date**: 2026-06-17  
**Research repo**: `section9/research-papers` on Gitea

## Objective

Issue #1585 asks AIWG to absorb the useful control patterns from the external
Loss-Function-Development (LFD) skill into AIWG agent loops, rules, and flows.
This brief establishes the source set and converts the issue into a reviewable
plan before construction begins.

The core synthesis remains valid: LFD provides an external black-box loss
envelope around an optimizer, while AIWG provides internalized discipline,
workflow topology, memory, research grounding, and phase gates. The integration
target is not "copy LFD"; it is to make AIWG loops harder to game and easier to
stop by adding missing black-box controls where AIWG currently relies on
cooperative instruction-following.

## Source Inventory

### Primary external source

- `https://github.com/elvisun/loss-function-development`
  - Verified on 2026-06-17 via GitHub raw/API.
  - Relevant current files:
    - `README.md`
    - `skills/lfd-design/SKILL.md`
    - `skills/lfd-design/references/cheat-museum.md`
    - `skills/lfd-design/references/goal-template.md`
    - `skills/lfd-design/references/log-template.md`
  - Current live source still centers on:
    - dev/holdout split and holdout-only acceptance
    - mechanical scoring, lint, probe, and status instruments
    - capacity caps and VOID-on-violation semantics
    - hypothesis / expected failure / diagnostic logs
    - stall rule and exploration quota
    - wall-clock and spend stop conditions

### Existing research audit reports

Issue #1585 references two audit reports in the research corpus. The current
canonical paths in `section9/research-papers` are:

- `audits/LFD-2026-06-13/01-loss-function-development-report.md`
- `audits/LFD-2026-06-13/02-lfd-vs-aiwg-analysis.md`

Both files were verified through the Gitea contents API on 2026-06-17. The first
report establishes LFD's four-part control structure: target, constraints,
instruments, and forced entropy. It also maps the cheat museum to reward
hacking, specification gaming, Goodhart, digital evolution, and memorization
sources. The second report compares LFD to AIWG directly and supplies the five
construction recommendations reflected in this plan: dosed entropy,
hypothesis-before-change, holdout isolation, mechanical gates, and hard budget
stops.

### Inducted corpus anchors

The research repo confirms the following induction issues are closed:

- `section9/research-papers#66`: REF-1398 through REF-1402
  - REF-1398 Krakovna et al., specification gaming
  - REF-1399 Skalse et al., reward hacking
  - REF-1400 Pan et al., reward misspecification
  - REF-1401 Manheim and Garrabrant, Goodhart variants
  - REF-1402 Lehman et al., digital evolution creativity
- `section9/research-papers#67`: REF-1403 Carlini et al., memorization scaling
- `section9/research-papers#71`: citation-edge verification and REF-1404 through
  REF-1406
  - REF-1404 Christiano et al., Deep RL from Human Preferences
  - REF-1405 Hadfield-Menell et al., Inverse Reward Design
  - REF-1406 Carlini et al., Extracting Training Data from LLMs

Important update: issue #1585 predates #71, so its reference list is incomplete.
Construction should cite REF-1398 through REF-1406 as the LFD cluster, not only
REF-1398 through REF-1403.

### Local AIWG corpus anchors

The AIWG repo already contains local analysis or reference docs for several
supporting REFs:

- `.aiwg/research/findings/REF-089-recursive-language-models.md`
- `.aiwg/research/findings/REF-122-active-context-compression.md`
- `.aiwg/research/findings/REF-909-effective-harnesses-long-running-agents.md`
- `.aiwg/research/findings/REF-910-claude-compaction.md`
- `.aiwg/research/paper-analysis/REF-015-aiwg-analysis.md`
- `.aiwg/research/paper-analysis/REF-017-aiwg-analysis.md`
- `.aiwg/research/paper-analysis/REF-018-aiwg-analysis.md`
- `.aiwg/research/paper-analysis/REF-057-aiwg-analysis.md`
- `.aiwg/research/paper-analysis/REF-058-aiwg-analysis.md`

These are sufficient to ground AIWG-side claims about best-output selection,
research-before-decision, self-consistency, HITL/agent laboratory workflows,
reproducibility, compaction, and long-running agent harnesses.

## Findings by Track

### Track 1: Dosed Entropy for Agent Loops

LFD's cheat museum treats local maxima as the default state of a loop. It
requires a stall rule and an exploration quota. AIWG already has strong
anti-wandering discipline, but less explicit guidance for bounded exploration
after non-improving cycles.

Planning implication: add a loop-level directive for Ralph/agent-loop/Mission
Control that requires a structural change after a flat cycle and a forced
variant every K cycles. The K value should be configurable and observable, not
hard-coded as a universal constant.

### Track 2: Hypothesis-Before-Change Logs

LFD logs hypothesis, expected failure mode, and diagnostic before each change.
This is stronger than a simple score/result log because it makes every cycle a
falsifiable experiment and survives compaction.

Planning implication: extend AIWG iteration/progress records with:

- `hypothesis`
- `expected_failure_mode`
- `distinguishing_diagnostic`
- `result`
- `probe_or_generalization_signal`

The fields should be introduced in the durable progress-file path first, then
adopted by best-output-selection and thought-protocol guidance.

### Track 3: Holdout Isolation and Contamination Discipline

AIWG reproducibility rules emphasize deterministic reruns, but LFD separates
dev from holdout and measures acceptance on holdout only. REF-1403 strengthens
the case: memorization scales with model capacity, duplication, and context
length. The issue's "<200 cases" warning should be treated as a heuristic,
not a universal threshold.

Planning implication: extend reproducibility/eval-fixture rules with:

- hidden answers for held-out cases
- aggregate-only holdout feedback
- explicit leakage audit on score feedback
- capacity caps for lookup-shaped artifacts
- canary/contamination checks where benchmark data is optimized against

### Track 4: Mechanical Gates Under Adversarial Pressure

LFD assumes the optimizer may be deceptive or purely literal, so it relies on
mechanical gates. AIWG instructions assume a cooperative agent more often than
they assume a black-box adversary.

Planning implication: document a two-layer control model:

- mechanical / black-box controls: CI exit codes, tests, checksums, holdout
  scoring, lint VOID semantics, immutable harness/eval surfaces
- cooperative / white-box controls: role instructions, thought discipline,
  escalation norms, self-reporting

High-criticality loops must make the mechanical layer load-bearing and treat
self-report as secondary evidence.

### Track 5: Hard Budget Stop Conditions

AIWG already has context-budget and tool-quota concepts, but issue #1585
correctly identifies a missing hard stop. LFD's `status.sh` style instrument
tracks wall-clock, score history, spend, projected burn, and token consumption.

Planning implication: add a first-class loop budget object and stop condition
for agent-loop/Ralph/Mission Control. When exhausted, the loop stops and emits
a best-output report rather than continuing with lower-quality drift.

## Candidate New Research Sources

`section9/research-papers#71` lists lower-priority but uninducted candidates:

- Leike et al., AI Safety Gridworlds
- Lee et al., Deduplicating Training Data Makes Language Models Better
- The Pile
- GPT-Neo

For issue #1585, Lee et al. and AI Safety Gridworlds are useful enough to file
an induction follow-up before construction relies on them. That follow-up is
now `section9/research-papers#72`. The Pile and GPT-Neo can remain background
artifacts unless Track 3 implementation needs dataset or model-family detail
beyond REF-1403.

### 2026-07-10 update: budget-aware and harness-control sources

Current literature adds several sources that were not part of the June 2026
planning packet and should be inducted before runtime implementation relies on
them:

- Reward Hacking Benchmark: Measuring Exploits in LLM Agents with Tool Use
  (`REF-1500`; `https://arxiv.org/abs/2605.02964`)
- Inference-Time Budget Control for LLM Search Agents
  (`REF-1501`; `https://arxiv.org/abs/2605.05701`)
- Budget-Aware Tool-Use Enables Effective Agent Scaling
  (`REF-1502`; `https://arxiv.org/abs/2511.17006`)
- Spend Less, Reason Better: Budget-Aware Value Tree Search for LLM Agents
  (`REF-1503`; `https://arxiv.org/abs/2603.12634`)
- VeRO: An Evaluation Harness for Agents to Optimize Agents
  (`REF-1504`; `https://arxiv.org/abs/2602.22480`)
- Token-Budget-Aware LLM Reasoning
  (`REF-1505`; `https://arxiv.org/abs/2412.18547`)
- Harness Engineering for Self-Improvement
  (`REF-1506`; `https://lilianweng.github.io/posts/2026-07-04-harness/`)
- BAGEN: Are LLM Agents Budget-Aware?
  (`REF-1507`; `https://arxiv.org/abs/2606.00198`)
- ContextBudget: Budget-Aware Context Management for Long-Horizon Search
  Agents (`REF-1508`; `https://arxiv.org/abs/2604.01664`)
- Budget-Constrained Agentic Large Language Models: Intention-Based Planning
  for Costly Tool Use (`REF-1509`; `https://arxiv.org/abs/2602.11541`)
- Do Androids Dream of Breaking the Game? Systematically Auditing AI Agent
  Benchmarks with BenchJack (`REF-1510`; `https://arxiv.org/abs/2605.12673`)
- SpecBench: Measuring Reward Hacking in Long-Horizon Coding Agents
  (`REF-1511`; `https://arxiv.org/abs/2605.21384`)
- Hack-Verifiable Environments: Towards Evaluating Reward Hacking at Scale
  (`REF-1512`; `https://arxiv.org/abs/2605.20744`)
- RewardHackingAgents: Benchmarking Evaluation Integrity for LLM
  ML-Engineering Agents (`REF-1513`; `https://arxiv.org/abs/2603.11337`)
- Reason Less, Verify More: Deterministic Gates Recover a Silent
  Policy-Violation Failure Mode in Tool-Using LLM Agents (`REF-1514`;
  `https://arxiv.org/abs/2607.07405`)
- Code as Agent Harness (`REF-1059`; duplicate issue
  `section9/research-papers#195`; `https://arxiv.org/abs/2605.18747`)
- Stop Comparing LLM Agents Without Disclosing the Harness (`REF-1515`;
  `https://arxiv.org/abs/2605.23950`)
- Auditing Agent Harness Safety (`REF-1516`;
  `https://arxiv.org/abs/2605.14271`)
- From Prompts to Contracts: Harness Engineering for Auditable Enterprise LLM
  Agents (`REF-1517`; `https://arxiv.org/abs/2607.08028`)
- LLM Readiness Harness: Evaluation, Observability, and CI Gates for LLM/RAG
  Applications (`REF-1518`; `https://arxiv.org/abs/2603.27355`)
- Stop Hand-Holding Your Coding Agent: Engineering the Loops that Replace
  Step-by-Step Prompting (`REF-1519`; `https://arxiv.org/abs/2607.00038`)
- Reward Hacking in Language Model Agents: Revisiting AI Safety Gridworlds
  (`REF-1520`; `https://arxiv.org/abs/2606.15385`)
- Agentic Harness Engineering: Observability-Driven Automatic Evolution of
  Coding-Agent Harnesses (`REF-1521`; `https://arxiv.org/abs/2604.25850`)
- RigorBench: Benchmarking Engineering Process Discipline in Autonomous AI
  Coding Agents (`REF-1522`; `https://arxiv.org/abs/2606.22678`)
- Probe-and-Refine Tuning of Repository Guidance for Coding Agents
  (`REF-1523`; `https://arxiv.org/abs/2606.20512`)
- Meta-Engineering Harnesses for AI-Native Software Production
  (`REF-1524`; `https://arxiv.org/abs/2605.25665`)
- Quantifying the Accuracy and Cost Impact of Design Decisions in
  Budget-Constrained Agentic LLM Search (`REF-1525`;
  `https://arxiv.org/abs/2603.08877`)
- How Inference Compute Shapes Frontier LLM Evaluation (`REF-1526`;
  `https://arxiv.org/abs/2606.17930`)
- ZEBRA: Zero-shot Budgeted Resource Allocation for LLM Orchestration
  (`REF-1527`; `https://arxiv.org/abs/2605.20485`)
- Token Budgets: An Empirical Catalog of 63 LLM-Agent Budget-Overrun
  Incidents, with an Affine-Typed Rust Mitigation as a Case Study
  (`REF-1528`; `https://arxiv.org/abs/2606.04056`)
- How Many Tools Should an LLM Agent See? A Chance-Corrected Answer
  (`REF-1529`; `https://arxiv.org/abs/2605.24660`)
- ToolTree: Efficient LLM Agent Tool Planning via Dual-Feedback Monte Carlo
  Tree Search and Bidirectional Pruning
  (`REF-1530`; `https://arxiv.org/abs/2603.12740`)
- The Evolution of Tool Use in LLM Agents: From Single-Tool Call to Multi-Tool
  Orchestration (`REF-1531`; `https://arxiv.org/abs/2603.22862`)
- Reward Hacking in the Era of Large Models: Mechanisms, Emergent
  Misalignment, Challenges (`REF-1532`; `https://arxiv.org/abs/2604.13602`)
- SkillCraft: Can LLM Agents Learn to Use Tools Skillfully? (`REF-1533`;
  `https://arxiv.org/abs/2603.00718`)
- Parallelizing Tool Execution and LLM Generation for Low-Latency Agent
  Serving (`REF-1534`; `https://arxiv.org/abs/2603.18897`)
- Dual-Pool Token-Budget Routing for Cost-Efficient and Reliable LLM Serving
  (`REF-1535`; `https://arxiv.org/abs/2604.08075`; original queued duplicate
  `https://arxiv.org/abs/2604.09613`)
- Steering LLM Thinking with Budget Guidance (`REF-1536`;
  `https://aclanthology.org/2026.findings-acl.1866/`)
- BudgetThinker: Empowering Budget-Aware LLM Reasoning with Control Tokens
  (`REF-1537`; `https://arxiv.org/abs/2508.17196`; discovery source:
  `https://openreview.net/forum?id=ahatk5qrmB`)

Local induction handoff:
`.aiwg/research/queue/induct-lfd-current-agent-control-sources-2026-07-10.md`.
The handoff has been filed as `section9/research-papers#180` through
`section9/research-papers#189` for corpus induction, REF assignment, GRADE
assessment, and citation graph integration. `section9/research-papers#180` is
now complete as `REF-1500` with full PDF archive, GRADE A-, radar sidecar, and
citation graph backlinks. `section9/research-papers#181` is now complete as
`REF-1501` with full PDF archive, GRADE B+, radar sidecar, and citation graph
backlinks. `section9/research-papers#182` is now complete as `REF-1502` with
full PDF archive, GRADE B+, radar sidecar, and citation graph backlinks.
`section9/research-papers#183` is now complete as `REF-1503` with full PDF
archive, GRADE B+, radar sidecar, and citation graph backlinks.
`section9/research-papers#184` is now complete as `REF-1504` with full PDF
archive, GRADE A-, radar sidecar, and citation graph backlinks.
`section9/research-papers#185` is now complete as `REF-1505` with full PDF
archive, GRADE A-, radar sidecar, and citation graph backlinks.
`section9/research-papers#186` is now complete as `REF-1506` with HTML
archive, GRADE B+, radar sidecar, and citation graph backlinks.
`section9/research-papers#187` is now complete as `REF-1507` with full PDF
archive, GRADE A-, radar sidecar, and citation graph backlinks.
`section9/research-papers#188` is now complete as `REF-1508` with full PDF
archive, GRADE A-, radar sidecar, and citation graph backlinks.
`section9/research-papers#189` is now complete as `REF-1509` with full PDF
archive, GRADE B+, radar sidecar, and citation graph backlinks.
`section9/research-papers#190` is now complete as `REF-1510` with full PDF
archive, GRADE A-, radar sidecar, code repository confirmation, and citation
graph backlinks.
`section9/research-papers#191` is now complete as `REF-1511` with full PDF
archive, GRADE A-, radar sidecar, code repository confirmation, and citation
graph backlinks.
`section9/research-papers#192` is now complete as `REF-1512` with full PDF
archive, GRADE A-, radar sidecar, code repository/project-page confirmation,
and citation graph backlinks.
`section9/research-papers#193` is now complete as `REF-1513` with full PDF
archive, GRADE B+, radar sidecar, code repository confirmation, and citation
graph backlinks.
`section9/research-papers#194` is now complete as `REF-1514` with full PDF
archive, GRADE B+, radar sidecar, and citation graph backlinks.
`section9/research-papers#195` is now resolved as duplicate coverage under
existing `REF-1059`; the local PDF archive was repaired and the full-source
LFD claims were verified against the 102-page survey.
`section9/research-papers#196` is now complete as `REF-1515` with full PDF
archive, GRADE B+, radar sidecar, and citation graph backlinks. It adds the
locked-harness/factorial-evaluation rule: benchmark comparisons are incomplete
unless the harness is disclosed and either fixed across models or varied as a
controlled factor with harness-induced variance, model-induced variance,
interaction, and ranking reversals reported.
`section9/research-papers#197` is now complete as `REF-1516` with full PDF
archive, GRADE A-, radar sidecar, code/project confirmation, and citation graph
backlink. It adds the full-trajectory harness-safety rule: task completion must
be gated by tool, resource, and information-flow boundary compliance, plus
execution-fidelity and perturbation-stability evidence from hidden audit
artifacts.
`section9/research-papers#198` is now complete as `REF-1517` with full PDF
archive, GRADE B+, radar sidecar, code/artifact confirmation, and citation graph
backlinks. It adds the prompt-to-contract harness rule: source eligibility,
claim admission, entity routing, trace generation, output hygiene,
recommendation-language constraints, and latency budgets should live in
code-owned manifests, schemas, validators, and evidence records around a
replaceable LLM composition boundary.
`section9/research-papers#199` is now complete as `REF-1518` with full PDF
archive, GRADE B+, radar sidecar, public reproducibility-repo confirmation, and
citation graph backlinks. It adds the readiness-gate rule: deployment decisions
should combine task quality, policy hard gates, groundedness, retrieval hit
rate, cost, p95 latency, missing-metric reporting, run artifacts, and
Pareto-frontier trade-offs. Its cited companion self-testing quality-gate source
was filed for separate induction as issue `#1762`.
`section9/research-papers#200` is now complete as `REF-1519` with full PDF
archive, GRADE B, radar sidecar, sandeco-loop artifact confirmation, Loop
Library live-corpus caveat, and citation graph backlinks. It adds the
loop-specification rule: every reusable agent loop should declare trigger,
goal, verifier level, architecture, stop states, durable memory, budget/stall
stops, and cost per accepted verified change. Its cited spontaneous
reward-hacking source was filed for separate induction as issue `#224`.
`section9/research-papers#201` is now complete as `REF-1520` with full PDF
archive, GRADE A-, radar sidecar, public code confirmation, hidden/observed
reward evidence, mitigation-ablation evidence, and citation graph backlinks. It
adds the hidden-objective rule: visible reward gains are not sufficient evidence
of progress when hidden safety reward is flat or worse, and standard
exploration/credit-assignment fixes cannot be treated as primary anti-hacking
controls.
`section9/research-papers#202` is now complete as `REF-1521` with full PDF
archive, GRADE A-, radar sidecar, public repository confirmation,
component/experience/decision observability evidence, change-manifest and
prediction-verification controls, token-efficiency evidence, and citation graph
backlinks. It adds the observability-driven harness-evolution rule: each
editable harness surface should be represented explicitly, each edit should
declare expected fixes and regression risks before evaluation, and next-round
task deltas should verify or falsify the edit.
`section9/research-papers#203` is now complete as `REF-1522` with full PDF
archive, GRADE B+, radar sidecar, public repository confirmation,
process-discipline trajectory evidence, token-efficiency evidence, and citation
graph backlinks. It adds the process-before-outcome rule: coding-agent
evaluation should score planning fidelity, verification coverage, recovery
efficiency, abstention quality, atomic transition integrity, test assertion
density, and exploration efficiency separately from task success, with token
waste and random-walk recovery loops treated as first-class costs.
`section9/research-papers#204` is now complete as `REF-1523` with full PDF
archive, GRADE B+, radar sidecar, public repository confirmation,
guidance-activation-threshold evidence, coverage/precision separation,
cross-model guidance-harm evidence, and citation graph backlinks. It adds the
model-calibrated guidance rule: repository guidance should be tuned and tested
against the model/scaffold that will consume it, enabled only when the step
budget can reach the prescribed workflow's patching phase, and evaluated by
evaluable-patch coverage, fallback rate, late-step productivity, and precision.
`section9/research-papers#205` is now complete as `REF-1524` with full PDF
archive, GRADE B, radar sidecar, contract-driven harness architecture,
four-way failure arbiter, early deployment evidence, and citation graph
backlinks. It adds the contract-arbiter rule: every failed verification should
be classified as implementation bug, spec gap, verifier/CI noise, or contract
ambiguity before retry; spec gaps and ambiguities route to contract/template
refinement rather than random implementation attempts.
`section9/research-papers#206` is now complete as `REF-1525` with full PDF
archive, GRADE B+, radar sidecar, public repository confirmation,
budget-visible BCAS loop evidence, hard search-tool gating, token/search/cost
ledger evidence, and citation graph backlinks. It adds the
budget-constrained-search rule: make remaining search and token budgets visible,
enforce hard caps by removing exhausted tools, log realized token/search/cost
use, and require measured diminishing-return evidence before expanding search
depth beyond the small caps that already buy most accuracy in closed-corpus QA.

`section9/research-papers#207` is now complete as `REF-1526` with full PDF
archive, GRADE A-, radar sidecar, inference-compute curve evidence,
repeated-submission and repeated-answer guard evidence, serial-vs-parallel
matched-budget analysis, and citation graph backlinks. It adds the
inference-compute reporting rule: evaluate long AIWG loops as capability curves
over inference-time compute, make protocol choices explicit, compare runs at
matched budgets, and report `quality_per_1k_tokens`, `quality_per_minute`, and
plateau/rising status rather than treating extra attempts as free continuation.

`section9/research-papers#208` is now complete as `REF-1527` with full PDF
archive, GRADE B+, radar sidecar, phase-level continuous-knapsack /
water-filling allocation evidence, APPS and HotpotQA budget-retention evidence,
solver-vs-LLM allocation ablation evidence, and citation graph backlinks. It
adds the phase-allocation rule: for named-phase missions, estimate per-phase
utility curves, delegate the budget split to a deterministic allocator, record
the planned phase budgets and realized deviations, and report allocation
controller overhead alongside speed-of-accuracy metrics.

`section9/research-papers#209` is now complete as `REF-1528` with full PDF
archive, GRADE B+, radar sidecar, public artifact/catalog confirmation,
budget-overrun incident-taxonomy evidence, affine/non-bypassable budget
ownership evidence, delegation-fanout failure evidence, provider-usage
trust-boundary evidence, and citation graph backlinks. It adds the hard-stop
ownership rule: budget telemetry is not budget enforcement; delegated work must
carry parent/child budget ledgers, pre-call refusal where possible, receipt
reconciliation, and explicit provider-usage trust markers.

`section9/research-papers#210` is now complete as `REF-1529` with full PDF
archive, GRADE B+, radar sidecar, Bits-over-Random metric extraction,
BFCL/MetaTool/ToolBench adaptive-depth evidence, downstream Claude Sonnet 4.6
tool-choice validation, and citation graph backlinks. It adds the
chance-corrected tool-routing rule: tool shortlist depth is a budgeted control
variable, and high success@K should not count as efficient search unless it
beats the random baseline at the same `K`.

`section9/research-papers#211` is now complete as `REF-1530` with full PDF
archive, GRADE A-, radar sidecar, dual-feedback MCTS extraction,
GTA/m&m/ToolBench/RestBench evaluation evidence, token-cost ablations, public
implementation confirmation, and citation graph edges. It adds the
tool-trajectory pruning rule: expensive tool branches should pass a pre-call
admission signal, carry actual post-call value evidence, and expose
pre-pruned/post-pruned/duplicate/failed branch reasons in trace telemetry.

`section9/research-papers#212` is now complete as `REF-1531` with full PDF
archive, GRADE B+, radar sidecar, multi-tool orchestration taxonomy,
tool-loop topology extraction, safety/control staging, efficiency and
resource-constraint taxonomy, benchmark-design notes, and citation graph
edges. It adds the orchestration-topology rule: AIWG tool loops should record
dependency graph shape, side-effect class, transaction/commit state,
capability-boundary events, retrieval/catalog token cost, latency/API cost,
parallelism degree, and process-validity verdicts rather than judging only
endpoint success.

`section9/research-papers#213` is now complete as `REF-1532` with full PDF
archive, GRADE B+, radar sidecar, Proxy Compression Hypothesis extraction,
reward-hacking mechanism taxonomy, and citation graph edges. It adds the
proxy-compression rule: AIWG loop metrics such as score, lint, tests, probes,
status, budget, speed, and judges are compressed proxy channels. LFD controls
should separate proxy and true-objective claims, budget optimization pressure,
protect holdouts and evaluators, require proof-of-use where tools matter, and
VOID proxy-only success when process validity or evidence is missing.

`section9/research-papers#214` is now complete as `REF-1533` with full PDF
archive, GRADE A-, radar sidecar, citation graph edges, public code/project
verification, Skill Mode protocol extraction, hierarchy/generalization
analysis, and matched-success token/cost/turn/tool-call efficiency extraction.
It adds the verified-skill-promotion rule: repeated successful tool chains can
become reusable skills only after syntax, runtime, and output-quality
verification, with explicit creation cost, reuse factor, creator/executor
provenance, skill depth, token savings, rollback, and retirement telemetry.

A follow-on current-source sweep on 2026-07-10 also filed
`section9/research-papers#187` through `section9/research-papers#194` for
budget-aware agents, budget-aware context management, costly tool-use planning,
benchmark red-teaming, long-horizon reward hacking, scalable reward-hacking
evaluation, evaluator tampering/train-test leakage, and deterministic
policy gates. These sources are now stable through `REF-1514`; later harness
comparability, trajectory-audit, prompt-to-contract, readiness-gate, loop-spec,
hidden-objective, observability-driven harness-evolution, process-discipline
trajectory-scoring, probe-tuned repository-guidance, contract-driven
meta-engineering harness, budget-constrained agentic search,
inference-compute evaluation, phase-level budget-allocation, hard budget
ownership, chance-corrected tool-shortlist evidence, and speculative
tool-execution / LLM-tool co-scheduling evidence and token-budget serving
pool-routing evidence plus budget-guided thinking-token control is stable as
`REF-1515` through `REF-1536`.
Remaining filed sources should be treated as
pending induction evidence until the corpus assigns REF identifiers and grades.

A later 2026-07-10 sweep filed `section9/research-papers#207` through
`section9/research-papers#216` for inference-compute evaluation curves,
multi-agent budget allocation, budget-overrun incident taxonomy,
chance-corrected tool shortlist depth, tool-trajectory pruning, multi-tool
agent orchestration taxonomy, reward-hacking survey evidence, tool-skill reuse,
speculative tool execution, and token-budget-aware inference routing. These
sources are especially relevant to the requested token-utilization and
speed-of-accuracy dimensions. `#207` is now stable as `REF-1526`; `#208` is
now stable as `REF-1527`; `#209` is now stable as `REF-1528`; `#210` is now
stable as `REF-1529`; `#211` is now stable as `REF-1530`.
`#212` is now stable as `REF-1531`.
`#213` is now stable as `REF-1532`.
`#214` is now stable as `REF-1533`.
`#215` is now stable as `REF-1534`.
`#216` is now stable as `REF-1535`.
It should be cited narrowly for serving-infrastructure routing, provider/pool
dispatch, and token-envelope telemetry rather than as direct evidence of
agent-loop task quality.

A harness-specific sweep filed `section9/research-papers#195` through
`section9/research-papers#199` for executable/stateful agent harnesses,
locked-harness comparability, trajectory-level harness safety audits,
contracts/manifests/validation artifacts, and readiness harnesses with CI gates
and cost/latency tradeoffs. `#195` is stable via existing `REF-1059`; `#196`
is stable as `REF-1515`; `#197` is stable as `REF-1516`; `#198` is stable as
`REF-1517`; `#199` is stable as `REF-1518`; `#200` is stable as `REF-1519`.

A final 2026-07-10 mini-sweep filed `section9/research-papers#200` through
`section9/research-papers#201` for explicit coding-agent loop specifications
and hidden-objective reward-hacking controls. These reinforce the need for
declared triggers, goals, verification, stopping rules, memory boundaries,
terminal states, and proxy-reward gap checks. `#200` is stable as `REF-1519`;
`#201` is stable as `REF-1520`.

A follow-up 2026-07-10 primary-source sweep filed
`section9/research-papers#202` through `section9/research-papers#207` for
observability-driven harness evolution, measurable coding-agent process
discipline, probe-based repository guidance tuning, meta-engineering contracts,
budget-constrained agentic search, and inference-compute evaluation curves.
`#202` is stable as `REF-1521`; `#203`
is stable as `REF-1522`; `#204` is stable as `REF-1523`; `#205` is stable as
`REF-1524`; `#206` is stable as `REF-1525`; `#207` is stable as `REF-1526`;
`#208` is stable as `REF-1527`; `#209` is stable as `REF-1528`; `#210` is
stable as `REF-1529`; `#211` is stable as `REF-1530`; `#212` is stable as
`REF-1531`; `#213` is stable as `REF-1532`; `#214` is stable as `REF-1533`;
`#215` is stable as `REF-1534`; `#216` is stable as `REF-1535`; `#217` is
stable as `REF-1536`; `#218` is stable as `REF-1537`. The complete `#202`
through `#218`
mini-sweep now covers observable harness evolution, measurable process
discipline, guidance tuning, contract arbitration, and budget-constrained
search plus inference-compute reporting, phase-level allocation, and
non-bypassable budget ownership, chance-corrected tool shortlist depth, and
bidirectional tool-trajectory pruning plus multi-tool orchestration topology
and proxy-compression reward-hacking controls plus verified tool-skill reuse
and speculative tool-execution / LLM-tool co-scheduling controls plus
token-budget serving pool routing, budget-guided thinking-token control, and
control-token budget-aware reasoning.
The speed-of-accuracy side of the LFD port should therefore require
larger step/search budgets to be justified by measured accuracy/cost returns
rather than random-walk continuation. Treat later sources as pending induction
evidence until the corpus assigns REF identifiers and grades.

A continuation sweep on 2026-07-10 filed `section9/research-papers#217`
through `section9/research-papers#220` for ACL budget guidance, BudgetThinker
control tokens, AI Harness Engineering runtime-substrate responsibilities, and
an agent-harness survey taxonomy. These add primary-source coverage for
budget-guided thinking-token control and broader harness responsibility
vocabulary. `#217` is now stable as `REF-1536`; `#218` is now stable as
`REF-1537`; `#219` is now stable as `REF-1538`; `#220` is now stable as
`REF-1539`.

The Agent Harness survey induction filed `section9/research-papers#287`
through `section9/research-papers#293` for HAL, AgencyBench,
Natural-Language Agent Harnesses, Harness Engineering / HARNESSCARD,
AgentSpec, AutoHarness, and MASEval. SkillsBench was mapped to existing
`REF-1237` rather than refiled. These follow-ups should be treated as pending
induction evidence until the corpus assigns REF identifiers and grades.

The AI Harness Engineering induction filed `section9/research-papers#279`
through `section9/research-papers#282` for OpenHands, Agentless,
AutoCodeRover, and AIOS. These should be treated as pending induction evidence
until the corpus assigns REF identifiers and grades.

The BudgetThinker induction filed `section9/research-papers#275` through
`section9/research-papers#278` for strict output-length constraints,
SelfBudgeter, LAPO, and TokenSkip. These should be treated as pending
induction evidence until the corpus assigns REF identifiers and grades.

A cost-aware planning continuation sweep on 2026-07-10 filed
`section9/research-papers#221` through `section9/research-papers#223` for
CostBench, CATP-LLM/OpenCATP, and Calibrate-Then-Act. These sources add
direct benchmark and method coverage for cost-optimal tool planning,
performance-cost tradeoffs, dynamic replanning under changing costs, and
cost-aware exploration policies. CostBench is now stable as `REF-1540`, and
CATP-LLM/OpenCATP is now stable as `REF-1541`. Calibrate-Then-Act is now
stable as `REF-1542`.

The CostBench induction filed `section9/research-papers#294` through
`section9/research-papers#301` for TravelPlanner, ToolSandbox, tau-bench,
SMART, PlanBench, SayCanPay, UserBench, and MINT. These should be treated as
pending induction evidence until the corpus assigns REF identifiers and grades.

The CATP-LLM induction filed `section9/research-papers#302` through
`section9/research-papers#307` for OpenAGI, ToolkenGPT, TRICE, HYDRA,
ControlLLM, and Formal-LLM. These should be treated as pending induction
evidence until the corpus assigns REF identifiers and grades.

The Calibrate-Then-Act induction filed `section9/research-papers#308` through
`section9/research-papers#310` for Pay-Per-Search / MASH, AdaSearch, and
Credit-Budgeted ICPC coding agents. These should be treated as pending
induction evidence until the corpus assigns REF identifiers and grades.

A speculative-serving follow-up sweep on 2026-07-10 filed
`section9/research-papers#265` through `section9/research-papers#267` for
Speculative Actions, speculative tool-call inference optimizations, and
Agentix/Autellix program-level serving. These should be treated as pending
induction evidence until the corpus assigns REF identifiers and grades.

A token-budget serving follow-up sweep on 2026-07-10 filed
`section9/research-papers#268` through `section9/research-papers#269` for the
Workload-Router-Pool architecture and FleetOpt analytical fleet provisioning.
These should be treated as pending induction evidence until the corpus assigns
REF identifiers and grades.

A budget-guidance baseline follow-up sweep on 2026-07-10 filed
`section9/research-papers#270` through `section9/research-papers#274` for
Dynasor, SEAL, Chain-of-Draft, ThinkPrune, and NoThinking. These should be
treated as pending induction evidence until the corpus assigns REF identifiers
and grades.

## Research Sufficiency Gate

Research is sufficient to proceed to human review for architecture and backlog
planning if:

- REF-1398 through REF-1406 are accepted as the core LFD evidence cluster.
- The live LFD GitHub source is accepted as the primary external mechanism
  source.
- The verified research audit reports under `audits/LFD-2026-06-13/` are
  accepted as the synthesis basis.
- The follow-up induction issue for the lower-priority but now relevant
  candidates from #71 is filed as `section9/research-papers#72`.

Construction should not begin until the review resolves:

1. Which loop surfaces are in scope first: Ralph, generic agent-loop, Mission
   Control, or all three?
2. Whether VOID semantics should be a hard invariant for all eval harnesses or
   only high-criticality/adversarial loops.
3. Whether the first implementation should be docs/rules only or include a
   concrete status/budget instrument.
