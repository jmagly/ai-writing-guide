---
artifact_type: architecture_decision_record
adr_id: ADR-NUA-002
study: novice-user-adoption
workstream: F
status: PROPOSED
title: "AIWG engagement-surface default — on-demand probe, opt-in footer, or no surface"
created: 2026-05-14
voice: technical-authority
---

# ADR-NUA-002: AIWG Engagement-Surface Default — On-Demand Probe

## Status

**PROPOSED** — pending Cognitive Walkthrough validation against `research-papers #613` / pending REF-158 and core-maintainer review.

## Context

UC-NUA-006 captures a real user pain: when AIWG is engaged, the agent's behavior is distinctly different (better citations, scoped artifacts, framework-aware reasoning), but users often cannot articulate why or even confirm that AIWG is the cause. The result is miscalibrated trust — users either over-rely (assume AIWG output is always correct) or disregard (don't know AIWG is helping and ignore the quality differential).

Lee & See (2004) — "Trust in Automation: Designing for Appropriate Reliance" (`research-papers #614` / pending REF-159) — frames this as a calibration problem. The design challenge is surfacing AIWG engagement enough that users develop appropriate reliance, without crossing into branding pollution.

The branding-pollution risk is concrete (risk R-002, priority 15). The existing `.claude/rules/no-attribution.md` rule already forbids AIWG attribution in user commits, code comments, file headers, and generated content. The engagement-surface design must operate strictly above this floor.

Three default surface options have been weighed:

1. **On-demand probe** — user explicitly invokes a status check (e.g., `aiwg status` or asks the agent "are you using AIWG?")
2. **Opt-in passive footer** — once-per-session footer or status line, off by default, configurable on
3. **No surface** — invisible by default; quality differential is the only signal

Co-Audit (Gordon et al. 2024; `research-papers #612` / pending REF-157) catalogs verification-UX patterns from Microsoft's production AI tools and supports the user-initiated-probe pattern as the strongest trust-calibration mechanism.

## Decision

**Adopt option 1: on-demand probe as the default engagement surface.** AIWG engagement is invisible by default. Users who want to verify engagement explicitly invoke `aiwg status` (or equivalent — exact wording to be determined in Workstream F design doc) which returns a clear, factual statement of AIWG's current state in the session: framework engaged, skills invoked, agents loaded.

Option 2 (opt-in footer) is a **configurable alternative** — available via `aiwg config set ui.engagement_footer true` per project or per user, but not the default.

Option 3 (no surface) is a **configurable opt-out** — available via `aiwg config set ui.engagement_surface none`, equivalent to no probe and no footer.

## Consequences

### Positive

- **Calibrated trust by design.** User-initiated probes match Lee & See's appropriate-reliance pattern: information available when sought.
- **Quality-differential primacy.** The default behavior makes AIWG's contribution visible through better output, not through self-identification.
- **Anti-pollution by default.** No AIWG identity reaches user content unless the user explicitly opts in.
- **Configurable spectrum.** Users who want more visibility (footer) or less (none) have controls without changing the default.
- **Co-Audit alignment.** Production-validated pattern from a major AI-tool vendor (Microsoft Research).

### Negative

- **Recognition gap remains.** Users who never invoke the probe never recognize AIWG engagement. This is acceptable per the design philosophy — invisible-by-default is the correct posture — but it means Workstream G's empirical question about user recognition (US-NUA-G-03) may produce "users don't recognize it" findings even when AIWG is working.
- **Discoverability question.** Users must learn the probe exists. Documentation surface required: `aiwg help status`, the wizard's success step, and the AIWG quickstart all reference the probe.

### Neutral / Required follow-up

- **Wizard integration.** The Workstream C wizard's final step (UC-NUA-003 step 9) is a probe invocation — the wizard teaches the user about the probe by using it.
- **Probe command naming.** Exact command (`aiwg status` vs. `aiwg engaged` vs. agent-side natural-language probe) decided in Workstream F design doc.
- **Anti-pattern checklist.** Workstream F design doc must include the explicit anti-pattern list per SAD §6.2: no commit messages, no code comments, no file headers, no generated content — verified against the existing `no-attribution` rule.

## Alternatives Considered

### Option 2 as default: Opt-in passive footer

**Rejected as default** because: a footer (even minimal "[AIWG engaged]") is a passive surface present in every interaction. Even when subtle, it accumulates as pollution over long sessions and may bias users toward over-reliance ("AIWG keeps reminding me it's there, so it must be authoritative"). Lee & See's miscalibration warning applies.

Footer remains a configurable alternative for users who genuinely want the persistent reminder — but it's an opt-in, not a default.

### Option 3 as default: No surface

**Rejected as default** because: pure invisibility leaves Workstream G's recognition question structurally unanswerable and forecloses the trust-calibration loop. Users who suspect AIWG is helping deserve a path to confirm it. No-surface remains a configurable opt-out for users who prefer the framework be entirely transparent.

## Implementation Guidance

This ADR is a default decision. Implementation actions inherited:

1. **Workstream F design doc** completes the implementation specification:
   - Exact probe command and output format
   - Configuration surface (`aiwg config set ui.engagement_*`)
   - Cognitive Walkthrough record for the probe and configurable alternatives
2. **No automatic engagement signals** are introduced into user-generated artifacts. The `no-attribution` rule remains the architectural floor.
3. **Wizard integration** (Workstream C): the wizard's verification step uses the probe to teach users about it.
4. **Activity-log integration** is OUT of scope for this ADR — the probe queries session state, not the historical activity log. The activity log's privacy posture (per `activity-log` rule) is unchanged.

## Anti-Pattern Checklist (Architectural Invariant)

This ADR explicitly preserves the following anti-patterns as forbidden:

- ❌ AIWG identification in commit messages
- ❌ AIWG identification in code comments of user-generated files
- ❌ AIWG identification in file headers of user-generated artifacts
- ❌ AIWG identification in generated documentation content (except study deliverables)
- ❌ AIWG-branded prefixes or suffixes in agent output by default
- ❌ Persistent UI elements that surface AIWG identity without user opt-in

Workstream F's design doc must include this checklist as a review gate.

## Cognitive Walkthrough Requirement

Before Workstream F's design doc baselines, a Cognitive Walkthrough record (per `research-papers #613` / pending REF-158) must be produced covering:

- The default invisible state (will users notice AIWG is engaged at all?)
- The probe invocation flow (will users find and try the probe?)
- The opt-in footer configuration (will users discover the alternative?)
- The opt-out (will users find this when they want it?)

Each walkthrough step records the four CW questions (will the user try the right action / see the control / recognize it as right / get correct feedback).

## References

- Commissioning epic: `roctinam/aiwg#1334`
- UC-NUA-006 (recognizes AIWG engaged)
- SAD §2.2 (Tension 1: Discoverability vs. Pollution), §6.1 (Trust calibration), §6.2 (Anti-pollution invariant)
- Risk R-002: Branding pollution — mitigated by this ADR + Workstream F design doc enforcement
- Research:
  - `research-papers #614` / pending REF-159 (Lee & See, Trust in Automation)
  - `research-papers #612` / pending REF-157 (Gordon et al., Co-Audit)
  - `research-papers #613` / pending REF-158 (Wharton et al., Cognitive Walkthrough Method)
- Existing rule: `.claude/rules/no-attribution.md` (architectural invariant)
- Saved memory: `feedback_aiwg_branding_restraint`
