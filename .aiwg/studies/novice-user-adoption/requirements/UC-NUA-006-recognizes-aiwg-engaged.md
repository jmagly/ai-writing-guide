---
artifact_type: use_case
id: UC-NUA-006
study: novice-user-adoption
workstream: F
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-006: User recognizes AIWG is engaged in their session

## Reasoning

1. **Problem analysis** — Users notice AIWG-engaged behavior is distinctly better but often cannot articulate why. Recognition matters for trust calibration (Lee & See, REF-159): users who can identify when AIWG is helping develop appropriate reliance, neither over-trusting nor disregarding.
2. **Constraint identification** — Surfacing AIWG identity too aggressively becomes pollution (project owner-flagged risk). Must distinguish "user can tell" from "AIWG is branded everywhere."
3. **Alternative consideration** — Options: (a) explicit "AIWG engaged" status line per response — pollution risk; (b) once-per-session footer — acceptable; (c) on-demand status command (`aiwg status` or in-session probe) — explicit user-initiated; (d) no surface — relies on quality differential alone. Chose to defer between (b), (c), (d) in the design doc; lean toward (c) as default with (b) as opt-in.
4. **Decision rationale** — User-initiated surfacing matches the trust-calibration framework: information available when sought, not pushed. Quality differential remains the primary signal.
5. **Risk assessment** — R-002 (branding pollution) is the dominant risk. Mitigation: explicit anti-pattern guardrails, Cognitive Walkthrough check for any surface, baselined design doc citing trust-calibration framework.

## Primary Actor

End User (technical or non-technical; both audiences benefit from calibrated recognition)

## Goal

Recognize, with appropriate confidence, when AIWG is engaged in the current session — without AIWG identity polluting the user's content or experience.

## Preconditions

- AIWG is deployed and at least one discovery hook is firing
- User is engaged in a session where AIWG-relevant behavior has occurred

## Main Success Scenario

1. User completes a task with AIWG-quality output (better citations, scoped artifacts, framework-aware behavior)
2. User wonders, "is AIWG helping me?"
3. User runs an in-session probe: e.g., `aiwg status` or asks the agent "are you using AIWG?"
4. The probe returns a clear, factual statement: "Yes — AIWG SDLC framework is engaged. Skills invoked this session: [list]"
5. User calibrates trust appropriately for subsequent interactions

## Alternative Flows

**A1 — User opts into a minimal once-per-session footer** (configured via `aiwg config set ui.engagement_footer true`. Footer shows "[AIWG engaged]" once at session start.)

**A2 — User wants no engagement surface at all** (default behavior, or `aiwg config set ui.engagement_surface none`. AIWG behaves invisibly; quality differential is the only signal.)

**A3 — Anti-pattern attempted** (FAILURE — agent attempts to inject "AIWG" attribution into a commit message, code header, or generated content. Existing `no-attribution` rule fires and blocks. Design doc reinforces this rule for any new engagement surface.)

## Postconditions

- User has a way to recognize AIWG is engaged that does not pollute their content
- The design doc explicitly forbids AIWG branding in user-generated artifacts
- Trust calibration is supported by the appropriate-reliance framework (Lee & See)

## Acceptance Criteria

- [ ] Design doc baselined for Workstream F, citing research-papers #612 (Co-Audit), #614 (Lee & See)
- [ ] Design doc includes explicit anti-pattern list (commits, code comments, generated content)
- [ ] On-demand probe (`aiwg status` or equivalent) is the default surface
- [ ] Opt-in footer is configurable per project and per user
- [ ] Cognitive Walkthrough confirms users can distinguish "AIWG is engaged" from "AIWG is intrusive"
- [ ] No regression to existing `no-attribution` rule

## References

- Workstream F
- Parent: UC-NUA-001
- Saved memory: `feedback_aiwg_branding_restraint`
- Research: research-papers #612 (Co-Audit), #614 (Lee & See trust calibration)
- Existing AIWG rule: `.claude/rules/no-attribution.md`
