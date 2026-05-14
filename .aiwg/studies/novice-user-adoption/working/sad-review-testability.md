---
artifact_type: sad_review
review_dimension: testability
study: novice-user-adoption
reviewer: test-architect (authored inline by orchestrator due to subagent context-billing failure)
status: complete
overall_verdict: APPROVED-WITH-SUGGESTIONS
created: 2026-05-14
voice: technical-authority
---

# SAD Testability Review — Novice-User Adoption Study

**Overall verdict:** APPROVED-WITH-SUGGESTIONS. No CONDITIONAL or REJECTED findings. SAD is testable; suggestions below sharpen the test surface for downstream construction epics.

## Concerns Evaluated

### 1. Evidence-type taxonomy testability

**Verdict:** APPROVED-WITH-SUGGESTIONS

The five-level taxonomy (scripted / manual / field-feedback / telemetry / static-flagged) does produce testable per-platform conclusions, but the distinction between **manual** and **field-feedback** is presently fuzzy. A study runner "hand-walking" a task on the platform (manual) and "receiving a user report of the same task" (field-feedback) can produce identical content; what distinguishes them is who ran the session.

**Suggestion:** §5.2.2 should specify per-evidence-type artifact requirements:
- `scripted` — committed test script + CI run log
- `manual` — session transcript with study-runner identity + provider account used
- `field-feedback` — user report with reporter identity (Discord handle / GitHub username) + reproduction notes
- `telemetry` — anonymized event count with time range and platform tag
- `static-flagged` — path + line reference to the file inspected

With these required artifacts, a reviewer can audit any cell.

### 2. Workstream B testability

**Verdict:** APPROVED

NFR mappings (§5.1.4) are testable as stated. NFR-PERF-01 (<50ms) requires CI-enforced perf budget — straightforward with `bench` or equivalent. NFR-PERF-02 (depth ≤3) is unit-testable. NFR-REL-01 (non-blocking) tests via "no input → completes in delay+standard time." NFR-REL-02 (env-var) tests via env-var set/unset.

The test strategy at §5.1.5 enumerates the right tests. No gap.

### 3. Cognitive Walkthrough as test method

**Verdict:** APPROVED-WITH-SUGGESTIONS

Cognitive Walkthrough (REF-158) is appropriate as a pre-deployment design test. It is **not** a substitute for user testing — it predicts where users will struggle, not whether they actually struggle.

**Suggestion:** The SAD should distinguish:
- **Cognitive Walkthrough records** — pre-deployment test artifact (4 questions × N steps)
- **User-test records** — empirical validation (different artifact, post-implementation)

Workstream C should produce both during the study window: walkthrough now (testable acceptance for the design doc), user-test deferred to the implementation epic. Test artifact for ABM gate is the walkthrough record; user-test is downstream.

### 4. Acceptance-criteria coverage

**Verdict:** APPROVED

Sampled UC-NUA-002, UC-NUA-005, UC-NUA-007:

- **UC-NUA-002 acceptance criteria** — all testable. Signal detection, env-var suppression, 3-second delay, warning text content all map to unit/integration tests.
- **UC-NUA-005 acceptance criteria** — all testable but require Workstream A matrix as the test artifact. Matrix completeness is the test result.
- **UC-NUA-007 acceptance criteria** — all testable. "At least 8 of 10 with field-validated evidence" is a count; matrix audit verifies it.

No criterion required interpretation. No measurement gap.

### 5. "8 of 10 platforms field-validated" target

**Verdict:** APPROVED

Measurable. The matrix is the artifact; the test is: count cells where evidence type ≠ `static-flagged` and ≠ blank. The test can conclude FAIL (count <8) — the study would explicitly defer affected workstreams in that case.

**Note:** The success criterion "8 of 10" assumes Claude Code and Codex are pre-validated. If those two regress, the study target becomes harder. Recommend §5.2.1 add a "regression-check" requirement: re-validate Claude Code + Codex with the same scripted task before declaring matrix complete.

### 6. Multi-agent SAD review as test

**Verdict:** APPROVED-WITH-SUGGESTIONS

The synthesizer's decision rule is implied (merge all APPROVED-WITH-SUGGESTIONS items into final SAD; resolve CONDITIONAL items; document REJECTED items in deferred-questions). The SAD does not explicitly state this rule.

**Suggestion:** §7.2 (Baselining) should specify the synthesis decision rule so a future reader can verify the baselined SAD reflects review feedback.

### 7. Five ADRs identified; two mandatory

**Verdict:** APPROVED

The three optional ADRs (wizard invocation, discovery-agent bolster, telemetry) can legitimately collapse into design-doc notes. They don't lose testable acceptance criteria — each has its primary criterion in the corresponding UC or NFR.

The risk is **discoverability**: a design-doc note buried in a workstream output is less greppable than an ADR. Recommend the design-doc notes include `ADR-equivalent: <reason for not promoting to formal ADR>` so future readers can find the decision record.

## Required Changes

None. All concerns resolved at APPROVED or APPROVED-WITH-SUGGESTIONS level.

## Suggestions Summary (for synthesizer)

1. §5.2.2 — Add per-evidence-type artifact requirements
2. §7.2 — Specify synthesis decision rule
3. §5.2.1 — Add regression-check for Claude Code + Codex
4. §10 — Annotate non-promoted ADRs with `ADR-equivalent` markers in their design doc notes
5. Distinguish Cognitive Walkthrough records from user-test records as separate test-artifact classes

## References

- SAD draft: `.aiwg/studies/novice-user-adoption/working/sad-draft.md`
- UCs, user stories, NFR register
- Research: research-papers #613 (Cognitive Walkthrough method)
