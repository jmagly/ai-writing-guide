---
artifact_type: use_case
id: UC-NUA-007
study: novice-user-adoption
workstream: A, G
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-007: Study runner audits per-platform hookup with field validation

## Reasoning

1. **Problem analysis** — The study itself needs a use case: how does the study team validate hookup per platform without falling into the static-audit trap that produced the over-confident "8 of 10 broken" conclusion previously?
2. **Constraint identification** — Field validation is methodologically heavier than static audit but is the only acceptable evidence per saved memory rule.
3. **Alternative consideration** — (a) Manual exploration on each platform — fallback. (b) Scripted task per platform — preferred where feasible. (c) Opt-in telemetry on `aiwg discover` invocations — long-tail data but requires user opt-in and a privacy review.
4. **Decision rationale** — Combine all three. Scripted where possible, manual where not, telemetry as the long-tail signal. Document evidence type per platform.
5. **Risk assessment** — R-001 (validation infeasibility), R-006 (static audit recurrence), R-007 (empirical ambiguity). All mitigated through evidence-type documentation and acceptance of "directional but informal" data.

## Primary Actor

Study Runner (engineer or researcher executing Workstream A)

## Goal

Produce a per-platform hookup matrix that is field-validated, not static-audited, for at least 8 of 10 supported providers.

## Preconditions

- Study runner has access to (or can simulate sessions on) the target provider
- Test scripts are written for the scripted-validation path
- Study runner is aware of the saved memory rules and the requirement to document evidence type

## Main Success Scenario

1. Study runner selects a provider from the matrix
2. Study runner runs a standard probe task on that provider (e.g., "help me set up testing for my project")
3. Study runner observes whether the agent invokes `aiwg discover` (telemetry, agent transcript, or manual review)
4. Study runner identifies which of the four hooks (rule / AIWG.md / quickref / discovery-agent) fired
5. Study runner records the result in the per-platform matrix with evidence type: field/scripted/manual/telemetry
6. Study runner repeats for each provider
7. Study runner publishes the matrix with explicit evidence-type column

## Alternative Flows

**A1 — Provider unavailable** (study runner cannot access the platform. Records "validation-deferred — no access" with rationale. Targets provider in a follow-up sprint with access plan.)

**A2 — No hook fires in field test** (study runner files a follow-up issue identifying which hook should have fired. Includes evidence transcript. Workstream A delivers the audit; the fix is a follow-on epic.)

**A3 — Static audit reveals deeper issue** (study runner uses static analysis ONLY to identify candidate problems, then field-validates. Static-only findings are flagged as "needs field validation" and not closed.)

## Postconditions

- Per-platform matrix exists with at least 8 rows of field-validated evidence
- Each cell documents evidence type (scripted / manual / field-feedback / telemetry / static-flagged)
- Follow-up issues are filed for any "no hook fires" findings
- Discovery-agent hook is specifically audited (per project-owner instruction)

## Acceptance Criteria

- [ ] Matrix covers all 10 providers
- [ ] At least 8 providers have field-validated evidence (scripted / manual / field-feedback / telemetry)
- [ ] No cell uses "static analysis" as sole evidence
- [ ] Discovery-agent hook (`aiwg-finder`) has dedicated audit column
- [ ] Follow-up issues filed for each "no hook fires" finding
- [ ] Matrix is published to `.aiwg/studies/novice-user-adoption/reports/per-platform-matrix.md`

## References

- Workstream A, G
- Parent: UC-NUA-005
- Saved memory: `feedback_no_platform_generalization`, `feedback_code_over_docs`, `feedback_pull_before_audit`
- Research: existing corpus REF-877/878/879
