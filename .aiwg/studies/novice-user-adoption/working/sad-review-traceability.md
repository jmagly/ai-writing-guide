---
artifact_type: sad_review
review_dimension: requirements_traceability
study: novice-user-adoption
reviewer: requirements-analyst (authored inline by orchestrator due to subagent context-billing failure)
status: complete
overall_verdict: APPROVED-WITH-SUGGESTIONS
created: 2026-05-14
voice: technical-authority
---

# SAD Requirements-Traceability Review — Novice-User Adoption Study

**Overall verdict:** APPROVED-WITH-SUGGESTIONS. No CONDITIONAL or REJECTED findings. Traceability is substantively complete; suggestions below tighten coverage and surface implicit requirements.

## Concerns Evaluated

### 1. Use-case traceability completeness

**Verdict:** APPROVED-WITH-SUGGESTIONS

All seven UC-NUA-* trace to a SAD section per §8. Spot-check verified:
- UC-NUA-002 → §5.1 (component view, warning) — substantive, multi-page coverage
- UC-NUA-005 → §5.2 (component view, hookup matrix) — substantive
- UC-NUA-001 → §4 (logical architecture) — appropriately covered as aggregating UC
- UC-NUA-003, 004, 006 → §4.1 deliverable taxonomy + §2.2 tensions — adequate for design-doc deliverables, but thin: each gets a one-line entry in the taxonomy table, no dedicated subsection.

**Suggestion:** Add a one-paragraph "Workstream rationale" for C, D, F under §4 — what the workstream deliverable will contain at minimum, so the design docs have an architectural anchor. This is not adding architecture, it's surfacing the architecture already implicit in the UCs.

### 2. User-story coverage

**Verdict:** APPROVED

Sampled US-NUA-B-01, B-02, B-03, A-01, F-01:

- B-01, B-02, B-03 → §5.1 component view; each story's implementation surface is named in §5.1.1 module placement and §5.1.4 NFR traceability
- A-01 → §5.2.1 matrix structure
- F-01 → §6.1 trust-calibration framing + §6.2 anti-pollution invariant

Implementation locus exists for each story.

### 3. NFR coverage

**Verdict:** APPROVED

Verified each NFR category in nfr-register.md has an architectural locus in the SAD:
- NFR-PERF (PERF-01, PERF-02) → §5.1.4
- NFR-REL (REL-01, REL-02) → §5.1.4
- NFR-USE (USE-01, USE-02, USE-03) → §5.1.4, §6.1, §6.2
- NFR-SEC (SEC-01, SEC-02) → §5.1.4, §6.2 (via no-attribution invariant), open question deferred to Workstream C
- NFR-MAINT (MAINT-01, MAINT-02) → §5.1.3, §6.4
- NFR-COMPAT (COMPAT-01, COMPAT-02) → §5.1.4, §5.2.3
- NFR-OBS (OBS-01, OBS-02) → §5.1.4, §6.4
- NFR-ACCESS (ACCESS-01) → §5.1.4 via NFR-USE-01

All categories have an architectural anchor.

### 4. Workstream B can ship before Workstream D baselines

**Verdict:** APPROVED-WITH-SUGGESTIONS

UC-NUA-002 acceptance criterion 4: "Warning text matches the wording in UC-NUA-002." The UC specifies wording: *"No project detected here. AIWG will deploy to the current directory. To associate AIWG with a specific project, run this from your project root. Continuing in 3 seconds — press Ctrl-C to cancel."*

This wording is **neutral** regarding global-install status — it describes what will happen and how to recover, without endorsing or discouraging global install. The SAD's §4.2 decision is consistent with the UC wording.

**Suggestion:** §4.2 should explicitly cite UC-NUA-002's wording as the "neutral phrasing" it refers to, so a future reader can see the trace.

### 5. Risk → architecture mapping

**Verdict:** APPROVED

§9 mapping reduces effective risk priority:

- **R-001** (L=4, I=4, P=16) — evidence-type taxonomy + 8-of-10 threshold + prioritization changes infeasibility likelihood from 4 to ~2 (residual: some platforms unvalidated, but acceptable). Effective P ≈ 8.
- **R-002** (L=3, I=5, P=15) — anti-pollution invariant + NFR-USE-03 + design-review enforcement reduces likelihood from 3 to ~1. Effective P ≈ 5.
- **R-003** (L=3, I=4, P=12) — opt-in invocation pattern as hard architectural constraint reduces likelihood from 3 to ~1. Effective P ≈ 4.

All three drop below critical (P<12).

### 6. Implicit requirements

**Verdict:** APPROVED-WITH-SUGGESTIONS

Implicit requirements not surfaced in the SAD:

- **Discord/Telegram comms execution** (UC-NUA-004 acceptance criterion) — the SAD §7.2 mentions "comms plan executed in Discord/Telegram before ADR merges" but doesn't architecturally accommodate it. Recommend §4.3 sequencing add a "Week 4: D ADR comms plan executed" step.
- **Activity log integration** (NFR-OBS-01) — the SAD §5.1.4 mentions it, but the `activity-log` rule is not listed as a referenced rule in §12. Add it.
- **Citation-validate sweep** (R-010 mitigation, §6.4) — the SAD describes the dual-citation discipline but does not name a specific step to run the sweep. Recommend §11 ABM gate criteria add: "All study artifact citations updated to finalized REF-NNN once research-papers inductions resolve."

### 7. Out-of-scope discipline

**Verdict:** APPROVED

The SAD does not introduce out-of-scope elements. Specifically verified:
- No major UI redesign elements
- No platform-wide mandates without per-platform evidence
- No forcing of project-scoped install (warning is non-blocking; global install remains supported)
- No construction work beyond Workstream B

§11 explicitly enumerates construction-level work the study does NOT perform. Disciplined boundary.

### 8. Citation consistency

**Verdict:** APPROVED-WITH-SUGGESTIONS

The SAD uses dual-citation pattern (issue number + provisional REF) in most places, e.g., `research-papers #614 / pending REF-159`. Two inconsistencies:

- §6.1 references "Co-Audit (research-papers #612 / pending REF-158)" — but REF-158 is the Cognitive Walkthrough Method, not Co-Audit. Co-Audit is induction #612 / pending REF-157. Cognitive Walkthrough is #613 / pending REF-158. Swap.
- §12 references list is not exhaustive — REF-156 (Zamfirescu-Pereira / #611), REF-152–155 (Krug, Nielsen, Norman, W3C) are aggregated as "research corpus" without individual citation. Acceptable, but the synthesizer should make sure the body text matches §12.

**Suggestion:** Synthesizer must fix the §6.1 REF-157/158 swap during merge.

## Traceability Gaps Table

| Gap | Severity | Recommended fix |
|-----|----------|-----------------|
| UC-NUA-003, 004, 006 lack dedicated subsection beyond taxonomy table entry | Low | Add Workstream-rationale paragraph per UC under §4 |
| Discord/Telegram comms not in §4.3 sequencing | Low | Add Week 4 step |
| `activity-log` rule not in §12 references | Low | Add to references list |
| Citation-validate sweep not in §11 ABM gate criteria | Low | Add as required item |
| §6.1 REF-157 / REF-158 swap | Low | Fix during synthesis |

## Required Changes

None at CONDITIONAL or REJECTED level. All gaps resolvable in synthesis.

## Suggestions Summary (for synthesizer)

1. Add one-paragraph "Workstream rationale" for C, D, F under §4
2. §4.2 cite UC-NUA-002's specific wording as the "neutral phrasing"
3. §4.3 sequencing: add Week 4 Discord/Telegram comms execution for Workstream D
4. §12 references: add `activity-log` rule
5. §11 ABM gate criteria: add citation-validate sweep requirement
6. §6.1: fix REF-157 (Co-Audit) / REF-158 (Cognitive Walkthrough) swap

## References

- SAD draft: `.aiwg/studies/novice-user-adoption/working/sad-draft.md`
- All UCs, user stories, NFR register
- Research-papers induction issues #607–#614
