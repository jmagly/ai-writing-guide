---
artifact_type: risk_screening
study: novice-user-adoption
phase: inception
status: baselined
created: 2026-05-14
voice: technical-authority
---

# Risk Screening: AIWG Novice-User Adoption Study

## Risk Register

Risks are scored on a 1–5 scale for likelihood (L) and impact (I); priority = L × I. Risks with priority ≥12 are critical; 6–11 are high; ≤5 are medium/low.

### R-001: Per-platform validation infeasible without provider accounts

| Field | Value |
|-------|-------|
| Category | Operational |
| Likelihood | 4 |
| Impact | 4 |
| Priority | 16 (CRITICAL) |
| Description | Workstream A requires running scripted tasks on all 10 provider platforms. Some platforms (Factory AI, Hermes, OpenClaw) may require accounts, licenses, or specific infrastructure access not available to study runners. |
| Mitigation | Default to Claude Code + Codex as validated, prioritize remaining 8 by user-reported volume; accept that some platforms may complete with field-feedback assessment only, not scripted validation. Document the validation evidence type per platform. |
| Owner | Study lead |

### R-002: Cross-pollution of AIWG branding into user content

| Field | Value |
|-------|-------|
| Category | UX / Trust |
| Likelihood | 3 |
| Impact | 5 |
| Priority | 15 (CRITICAL) |
| Description | The engagement-surface design (Workstream F) may inadvertently push "AIWG" identification into user code, commits, or generated content. This violates the existing `no-attribution` rule and erodes user trust by making AIWG feel intrusive. |
| Mitigation | Workstream F deliverable must include explicit anti-pattern guardrails. ADR required. Cognitive Walkthrough of any engagement surface must include a "does this leak AIWG identity into user output" check question. Reference research-papers #614 Lee & See for calibrated-trust framing. |
| Owner | Workstream F lead |

### R-003: Wizard adds friction that degrades power-user UX

| Field | Value |
|-------|-------|
| Category | UX |
| Likelihood | 3 |
| Impact | 4 |
| Priority | 12 (CRITICAL) |
| Description | A poorly-designed wizard could become mandatory or default, slowing experienced users who currently complete `aiwg use sdlc` in seconds. Even if opt-in, marketing or onboarding documentation may incorrectly direct power users to the wizard. |
| Mitigation | Wizard must be opt-in by flag or separate command (`aiwg wizard`), never default. Cognitive Walkthrough must include power-user path. Documentation must clearly distinguish wizard (for novices) from `aiwg use` (default). |
| Owner | Workstream C lead |

### R-004: Discovery-agent bolster has no measurable improvement to ship

| Field | Value |
|-------|-------|
| Category | Technical |
| Likelihood | 3 |
| Impact | 3 |
| Priority | 9 (HIGH) |
| Description | Workstream A includes bolstering the discovery-agent hook (user-flagged as needing more bolstering). If audit reveals the current implementation is adequate and the perceived weakness is elsewhere, the workstream may produce a null finding. |
| Mitigation | Null finding is a valid deliverable. ADR should document the audit result either way. If no improvement warranted, redirect effort to the next-highest-impact hook (likely AIWG.md priming or quickref placement). |
| Owner | Workstream A lead |

### R-005: Global install ADR produces decision the field disagrees with

| Field | Value |
|-------|-------|
| Category | Adoption |
| Likelihood | 3 |
| Impact | 3 |
| Priority | 9 (HIGH) |
| Description | Whichever decision Workstream D produces (first-class vs. escape-hatch) will conflict with a fraction of existing users who use global install in the other mode. Marketing the decision poorly could create friction. |
| Mitigation | ADR must include explicit migration / continued-support guidance for the non-chosen path. Discord/Telegram communication plan before merging the ADR. Treat global install as supported in both modes for at least one CalVer cycle after the decision. |
| Owner | Workstream D lead + comms |

### R-006: Static audit recurs despite memory rule against it

| Field | Value |
|-------|-------|
| Category | Methodology |
| Likelihood | 4 |
| Impact | 2 |
| Priority | 8 (HIGH) |
| Description | The previous audit attempt incorrectly concluded "8 of 10 platforms broken" from static analysis alone. The pattern may recur if study runners default to file inspection rather than field validation. |
| Mitigation | Workstream A explicitly requires field validation, not static analysis. Every per-platform conclusion must cite evidence type (field telemetry / user report / scripted test / static analysis). Static analysis is candidate-flagging only, never conclusion. Reference saved memory rule: `feedback_no_platform_generalization`. |
| Owner | Study lead |

### R-007: Empirical questions (Workstream G) produce ambiguous results

| Field | Value |
|-------|-------|
| Category | Research |
| Likelihood | 3 |
| Impact | 2 |
| Priority | 6 (HIGH) |
| Description | The three empirical questions (where users run first `aiwg use`, where they open sessions, do they recognize AIWG engagement) depend on Discord/Telegram poll quality or opt-in telemetry. Self-selection bias, low response volume, or ambiguous wording could produce data points that don't actually inform design. |
| Mitigation | Frame each question to require minimum useful response volume; accept "informal but directional" data points; document confidence level on each. Don't gate downstream workstreams on Workstream G — treat its outputs as inputs to refine, not block, design decisions. |
| Owner | Workstream G lead |

### R-008: Scope creep into framework redesign

| Field | Value |
|-------|-------|
| Category | Scope |
| Likelihood | 3 |
| Impact | 2 |
| Priority | 6 (HIGH) |
| Description | The hookup audit (Workstream A) may surface deeper architectural questions about discovery, kernel-vs-standard skill split, or AGENTS.md generation that tempt the study into framework-level redesign. |
| Mitigation | Out-of-scope items go straight to backlog with new issue references. Study output is decisions and designs, not framework refactors. ABM gate explicitly forbids construction-level work. |
| Owner | Study lead |

### R-009: Voice / authenticity drift in deliverables

| Field | Value |
|-------|-------|
| Category | Quality |
| Likelihood | 2 |
| Impact | 2 |
| Priority | 4 (MEDIUM) |
| Description | Study deliverables produced by multiple agents across multiple sessions may drift in voice, tone, and authenticity, producing the AI-pattern signals AIWG's voice-framework specifically guards against. |
| Mitigation | Use `technical-authority` voice profile for all deliverables. Run `/writing-validator` against each baselined artifact before declaring it baselined. Reference voice-framework rule in study working notes. |
| Owner | Documentation synthesizer per artifact |

### R-010: Citation drift in research-grounded sections

| Field | Value |
|-------|-------|
| Category | Quality |
| Likelihood | 2 |
| Impact | 3 |
| Priority | 6 (HIGH) |
| Description | The study leans heavily on research-papers REF-152 through REF-159 (some not yet finalized — currently filed as induction issues #607–#614). If any induction is rejected or the REF number changes during finalization, study deliverables will contain broken citations. |
| Mitigation | Cite both the induction issue number AND the proposed REF-NNN. When inductions finalize, run a citation-validate sweep across study artifacts and update REF-NNN references. Quality gate: no study artifact baselines until the citation-validation step completes. |
| Owner | Study lead |

## Critical Risks Summary (Priority ≥12)

| ID | Risk | Mitigation status |
|----|------|-------------------|
| R-001 | Per-platform validation infeasibility | Mitigated: prioritization + evidence-type documentation |
| R-002 | AIWG branding pollution into user content | Mitigated: ADR + anti-pattern guardrails + Cognitive Walkthrough check |
| R-003 | Wizard degrades power-user UX | Mitigated: opt-in only + documentation discipline + walkthrough |

No risks are unmitigable. No blocking constraints identified for LOM gate.

## References

- Intake form: `.aiwg/studies/novice-user-adoption/intake/intake-form.md`
- Solution profile: `.aiwg/studies/novice-user-adoption/intake/solution-profile.md`
- Memory: `feedback_no_platform_generalization`, `feedback_aiwg_branding_restraint`
