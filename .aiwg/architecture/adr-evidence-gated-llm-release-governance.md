# ADR: Evidence-Gated Release Governance for LLM-Facing Surfaces

## Status

Proposed (2026-07-18) — drafted from the REF-1592/REF-1518 induction requested
in issue #1762; awaiting operator review. No rules, schemas, or flows are
modified by this ADR; §"Proposed follow-on updates" lists the changes it would
authorize if accepted.

## Context

Issue #1762 inducted the LLM release-governance companion pair into the
research corpus (`section9/research-papers`):

- **REF-1592** — *Automated Self-Testing as a Quality Gate: Evidence-Driven
  Release Management for LLM Applications* (Maiorano 2026, arXiv:2603.15676,
  GRADE B). A deterministic five-dimensional **PROMOTE / HOLD / ROLLBACK**
  gate fired on every merge: Task Success (≥80%), Context Preservation (≥90%),
  P95 Latency (<15,000 ms), Safety Pass (≥95%), **Evidence Coverage (≥80%)**;
  ROLLBACK when any dimension falls below 70% of its target, HOLD on a narrow
  miss. In its 38-run study, both severe regressions were **evidence-coverage
  collapses** invisible to every other dimension — ablation-confirmed.
- **REF-1518** — *LLM Readiness Harness* (Maiorano 2026, arXiv:2603.27355,
  GRADE B+). The broader readiness layer: observability spans, scenario-
  weighted readiness scores, promptfoo CI gates, cost/latency/quality Pareto
  frontiers.

AIWG already has adjacent machinery, but none of it encodes this pattern:

- `flow-release` + `.aiwg/release.config` gate on **build/test/UAT/CI-green**
  — engineering health, not behavioral quality of LLM-facing output.
- `hitl-gates` defines approval semantics (`ALWAYS`/`CONDITIONAL`, block vs
  proceed) but no LLM-behavioral dimensions to gate on.
- The LFD control-pattern ADR (`adr-lfd-control-patterns-for-agent-loops.md`,
  #1585) supplies mechanical loop controls (budget stops, holdout isolation,
  VOID fencing) for *agent loops*, not a release-decision schema for
  *shipping* LLM-facing artifacts.
- `citation-policy` (CRITICAL) mandates evidence-backed claims but has no
  quantitative regression signal — nothing detects a *drop* in grounding
  coverage between releases.

The 2026-07-18 expansion survey
(`section9/research-papers` `documentation/reports/REF-1592-neighborhood-expansion-2026-07-18.md`)
deliberately collected the opposing literature; its constraints are folded
into the Decision below rather than appended as caveats.

## Decision (proposed)

Adopt **evidence-gated release governance** as an opt-in pattern for AIWG
surfaces whose release artifact is LLM-generated or LLM-mediated (generated
research/docs corpora, deployed agent fleets, Missions with shippable output,
eval-driven LFD loops):

1. **Five-dimension gate schema, locally calibrated.** A release plan MAY
   declare a `behavioral_gate` with dimensions drawn from {task success,
   context preservation, latency percentile, safety pass rate, evidence
   coverage}, each with a target and a rollback line at a declared fraction of
   target (default 0.70). Decision semantics: all-pass → PROMOTE; narrow miss
   → HOLD (maps to `hitl-gates` `CONDITIONAL`/manual triage); below rollback
   line → ROLLBACK (maps to `ALWAYS`/`block`). Thresholds MUST be calibrated
   from observed baselines per project, never copied from REF-1592's numbers
   (single-system evidence).
2. **Evidence coverage is a first-class non-regression signal.** For any
   citation-grounded output surface (research corpus synthesis, generated
   docs under `citation-policy`), track the fraction of retrieval-required
   outputs carrying resolvable citations, and gate on its *regression*, not
   just its absolute level. This is the single most transferable finding
   (REF-1592's ablation) and composes directly with the existing
   `citation-policy` verification checklist.
3. **Structural-first, judge-second.** Structural checks (latency, routing,
   schema, citation resolvability) and content judgment (LLM-as-judge, human
   review) capture disjoint failure classes (REF-1592 κ=0.13 reframed as
   complementary coverage). The structural gate is the *blocking* leg; an
   LLM-judge leg MAY inform HOLD triage but MUST NOT be the sole promote/block
   authority — this inherits the judge-bias literature (positional bias,
   self-preference, reliability-without-validity; induction queue
   section9/research-papers#373–#376) and is consistent with
   `lfd-control-tiers` Rule 1 (analyzer-scored signals are not mechanical).
4. **Replicates at the HOLD boundary.** Because the system under gate is
   nondeterministic even at T=0 (queue #377), a HOLD verdict within a declared
   margin of a threshold requires N≥3 replicate runs (or explicit error-bar
   treatment per *Adding Error Bars to Evals*, queue #374) before escalating
   to a human gate. Single-run threshold-adjacent verdicts are not evidence.
5. **Trend-vs-moving-suite discipline.** When the regression bank grows over
   time (which it should — REF-1592's living question bank), longitudinal
   dashboards MUST annotate metric trends with suite-size/composition changes;
   a declining metric over a growing bank is not decay evidence
   (Mann-Kendall on the raw metric is insufficient). Composes with
   `reproducibility-validation`.
6. **Anti-Goodhart posture for the bank.** The regression bank is fed by
   HOLD/ROLLBACK post-mortems and adversarial generation (STELLAR-style
   search, queue #372), never by scenarios authored to pass. Diagnostic:
   if bank growth correlates with *rising* pass rates, suspect overfitting
   (REF-1592's inverted signal; Goodhart mechanics per queue #378).

## Consequences

- **Positive**: gives `flow-release` a concrete, evidence-backed schema for
  LLM-behavioral gates; turns `citation-policy` from an authoring rule into a
  measurable release control; keeps gating affordable (REF-1592: near-linear
  cost, r=0.92, ~+6 s/test on existing observability).
- **Negative / cost**: per-project threshold calibration is real work; a
  regression bank must be curated to stay adversarial; replicate runs at HOLD
  boundaries add latency to exactly the releases that are already marginal.
- **Risk accepted**: the pattern's strongest empirical claim rests on N=2
  rollback events in one system (GRADE B). We adopt the *framework* (multi-
  dimensional structural gate, HOLD/ROLLBACK split, post-mortem-fed bank) and
  treat the *specific numbers* as placeholders pending local calibration and
  the opposing-flank inductions (#372–#378).

## Alternatives considered

- **Single-score gating** (one aggregate quality metric): rejected — the
  ablation evidence is precisely that severe regressions hide inside
  aggregate scores.
- **LLM-judge-only gating**: rejected — judge pathologies (order bias,
  self-preference, reliability-without-validity) make an unaccompanied judge
  an unsafe blocking authority; and a content judge is structurally blind to
  latency/routing regressions.
- **Committee-vote release decisions** (MA-Committees, queue candidate):
  deferred — richer but non-deterministic and unauditable relative to
  threshold gates; revisit after induction.
- **Do nothing** (keep engineering-only release gates): rejected — AIWG ships
  increasing LLM-generated surface area (corpus synthesis, fleet bots,
  Missions) with no behavioral non-regression control at all.

## Proposed follow-on updates (each requires separate approval)

1. `agentic/code/frameworks/sdlc-complete/schemas/release.config.schema.yaml`:
   optional `behavioral_gate` block (dimensions, targets, rollback_fraction,
   hold_margin, replicates_at_boundary).
2. `flow-release`: honor `behavioral_gate` when declared; HOLD routes to the
   existing HITL gate surface.
3. `lfd-control-tiers` rule: add a row classifying the five-dimension gate —
   structural dimensions computed by harness instruments are **Mechanical**;
   any LLM-judge dimension is **Hybrid** at best.
4. `citation-policy` companion skill: an evidence-coverage lint that computes
   citation-coverage over generated artifacts and reports the delta vs the
   previous release (the minimal, highest-value slice of this ADR).
5. Revisit after section9/research-papers#372–#378 inductions land; promote or
   revise the ADR with the opposing-flank evidence wired in.

## References

- REF-1592 — Maiorano 2026, arXiv:2603.15676 (GRADE B, rising) — external
  corpus: `section9/research-papers` `documentation/references/REF-1592-maiorano-2026-self-testing-quality-gate.md`
- REF-1518 — Maiorano 2026, arXiv:2603.27355 (GRADE B+) — external corpus:
  `documentation/references/REF-1518-maiorano-2026-llm-readiness-harness.md`
- Expansion survey (supporting + opposing flanks): external corpus
  `documentation/reports/REF-1592-neighborhood-expansion-2026-07-18.md`;
  induction queue section9/research-papers#372–#378
- `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md` — the
  loop-control layer this composes with (#1585)
- `.claude/rules/lfd-control-tiers.md`, `hitl-gates`, `citation-policy`,
  `reproducibility-validation`, `executable-feedback` — rules this pattern
  touches
- Origin: roctinam/aiwg#1762 (induction + expansion directive)
