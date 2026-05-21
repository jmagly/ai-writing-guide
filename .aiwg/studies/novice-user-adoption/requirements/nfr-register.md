---
artifact_type: nfr_register
study: novice-user-adoption
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# Non-Functional Requirements: AIWG Novice-User Adoption Study

NFRs apply to the study's deliverables — primarily the project-isolation warning (Workstream B) which is implementation, and the design docs / decisions whose quality is measurable.

## Performance

### NFR-PERF-01 — `aiwg use` warning latency

The project-isolation detection check MUST complete in under 50ms on a typical user system.

- **Measurement:** Time from process start to "warning emitted or skipped" decision
- **Rationale:** The detection runs on every `aiwg use` invocation; latency above 50ms is user-perceptible.
- **Verification:** Performance test in CI; fails build if regression above threshold

### NFR-PERF-02 — Project-signal walk depth

Project-signal detection MUST walk up at most 3 parent directories before declaring "no project."

- **Rationale:** Bounded walk prevents pathological cases (e.g., user runs in `/`) from inflating detection time.
- **Verification:** Unit test confirms walk halts at depth 3 even when no signal present

## Reliability

### NFR-REL-01 — Warning does not block deployment

The project-isolation warning MUST NOT block `aiwg use` from completing. If the user does not Ctrl-C during the warning delay, deployment MUST proceed exactly as it would without the warning.

- **Rationale:** Backward compatibility for scripted users and CI pipelines.
- **Verification:** Test confirms `aiwg use sdlc` in `$HOME` with no input completes deployment within delay + standard duration

### NFR-REL-02 — Warning suppressible without code change

The warning MUST be suppressible via environment variable (`AIWG_GLOBAL_INSTALL=1`) without requiring config-file modifications or argument flags.

- **Rationale:** Scripted setups and CI environments need a single-variable opt-out.
- **Verification:** Test with env var set confirms no warning, no delay, full deployment

## Usability

### NFR-USE-01 — Warning text clarity

The warning text MUST be readable by a user with no prior AIWG exposure and identify (a) which directory AIWG would deploy to, (b) how to cancel, (c) how to recover (`cd <project>; aiwg use sdlc`).

- **Verification:** Cognitive Walkthrough on the warning text with at least one novice participant

### NFR-USE-02 — Wizard friction ceiling

The wizard design (Workstream C) MUST have at most 2 friction points per step, as measured by Cognitive Walkthrough method (REF-949).

- **Verification:** Walkthrough record published with friction-point count per step

### NFR-USE-03 — Engagement surface anti-pattern compliance

Any engagement-surface design (Workstream F) MUST NOT introduce AIWG attribution in:
- Git commit messages
- Code comments in generated files
- File headers in generated artifacts
- Generated documentation content (except study deliverables themselves)

- **Rationale:** Consistent with existing `no-attribution` rule; anti-pollution invariant
- **Verification:** Design doc review by AIWG core maintainers; any new surface verified against the existing rule

## Security

### NFR-SEC-01 — No new credentials or tokens introduced

The study's tactical implementation (Workstream B project-isolation warning) MUST NOT introduce any credential handling, token reading, or secret storage.

- **Rationale:** Scope discipline; warning is a path-check, nothing more
- **Verification:** Code review confirms no `cat`, `read`, or token-handling logic in the warning module

### NFR-SEC-02 — Wizard credential handling (deferred)

If the wizard (Workstream C) ever handles provider tokens during onboarding, it MUST follow the existing `token-security` rule (no hardcoding, heredoc pattern, file permissions 600).

- **Rationale:** Forward-looking constraint for the wizard implementation epic
- **Verification:** Implementation epic must include security review

## Maintainability

### NFR-MAINT-01 — Project-signal list extensibility

The list of project-signal files MUST be defined in a single location (not duplicated across detection paths) so new ecosystems can be added with one edit.

- **Verification:** Code review confirms single source of truth for the signal list

### NFR-MAINT-02 — Design docs reference research corpus

All Workstream design docs (C, D, F) MUST cite at least one research-papers REF (the inductions filed in REF-943-REF-950) where applicable. Anti-pattern: design decisions without grounding.

- **Verification:** Design doc review checks citation presence

## Compatibility

### NFR-COMPAT-01 — Multi-provider degradation

The wizard (Workstream C) and any new UX surface MUST work or degrade gracefully across all 10 providers. "Gracefully" means: clear message stating which provider feature is unavailable; no silent failure.

- **Verification:** Per-provider test of any new UX surface; degradation messages reviewed

### NFR-COMPAT-02 — No regression for power users

The default `aiwg use` behavior (no warning, no wizard) MUST remain unchanged for power users running `aiwg use sdlc` inside a project root.

- **Verification:** Existing `aiwg use` tests continue to pass; no new flags required for the default path

## Observability

### NFR-OBS-01 — Warning emission is logged

When the project-isolation warning fires, the event MUST be logged to `.aiwg/activity.log` per the `activity-log` rule.

- **Rationale:** Enables Workstream G empirical question (where do users first run `aiwg use`?) without separate telemetry
- **Verification:** Log entry appears with `warn:no-project-signal` event type

### NFR-OBS-02 — Opt-in telemetry for discover invocation

If Workstream G implements opt-in telemetry, the user MUST explicitly enable it via `aiwg config set telemetry.discover_invocations true`. Default: disabled.

- **Rationale:** Privacy by default; user must consent
- **Verification:** Default config has telemetry disabled; opt-in pattern follows existing AIWG conventions

## Accessibility

### NFR-ACCESS-01 — Warning text WCAG cognitive compliance

The warning text MUST comply with W3C Cognitive Accessibility guidance (REF-946):
- Clear-step instructions (one action per sentence)
- Predictable behavior (delay is announced)
- Error recovery without cognitive penalty (Ctrl-C is a known cancellation)

- **Verification:** Cognitive Walkthrough check against REF-946 patterns

## References

- All UCs and user stories
- Saved memory: `feedback_aiwg_branding_restraint`, `feedback_no_skill_copying`
- Research: REF-946 (W3C Cognitive), REF-949 (Cognitive Walkthrough)
- Existing rules: `.claude/rules/no-attribution.md`, `.claude/rules/token-security.md`, `.claude/rules/activity-log.md`
