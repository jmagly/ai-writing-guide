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
