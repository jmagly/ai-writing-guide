---
artifact_type: sad_review
review_dimension: security
study: novice-user-adoption
phase: elaboration
status: complete
reviewer: security-architect
created: 2026-05-14
voice: technical-authority
---

# SAD Security Review — Novice-User Adoption Study

## 1. `no-attribution` as Architectural Invariant — APPROVED

Treating `no-attribution` as an architectural invariant is defensible and correct. The rule is enforcement-level CRITICAL across all platforms and applies to commits, PRs, docs, and code — exactly the surface Workstream F threatens to leak into. Elevating it from a project rule to a study invariant means the engagement-surface design cannot be approved if it conflicts, regardless of UX benefit. This is the right move because R-002's impact score (5) reflects a trust-erosion harm that no UX gain offsets, and because the rule already carries CRITICAL enforcement weight. The SAD's framing in §6.2 is sound. The only refinement: the invariant should also explicitly cover **wizard output** (Workstream C), not just Workstream F. The wizard, if it ever writes config files, project scaffolding, or onboarding artifacts, has the same leak surface. Add a one-line scope note to §6.2 listing both F and C.

## 2. NFR-SEC-01 (Workstream B no-credentials) — APPROVED

The SAD's component view honors NFR-SEC-01 cleanly. §5.1.1's module layout (`detect.ts`, `signals.ts`, `warning.ts`) has no surface for credential handling — the operations are stat checks, env-var reads (`AIWG_GLOBAL_INSTALL`), and console output. §5.1.4 traces NFR-SEC-01 to "Module imports only `node:fs`, `node:path`; no token-related code," which is the right architectural constraint. The detection flow in §5.1.2 reads zero file contents — only path existence — so even a compromised signal file cannot leak secrets through the warning module. NFR-OBS-01's activity-log write (`warn:no-project-signal`) records event type plus context, not user data. No fix required.

## 3. NFR-SEC-02 (wizard credential handling deferred) — APPROVED-WITH-SUGGESTIONS

The SAD legitimately defers wizard security to the implementation epic — the study charter forbids construction-level work. However, the SAD leaves one architecturally-relevant decision unspecified: **whether the wizard touches tokens at all**. The wizard's design doc (Workstream C deliverable) should be required to answer that question architecturally, not punt it entirely. If the wizard's invocation pattern (`aiwg wizard` vs. `aiwg use --wizard`) determines whether it inherits the existing token-loading paths from `aiwg use`, that's an architectural decision with security implications that the study should record. Suggestion: amend §10's Workstream C row to require the wizard design doc to declare its credential surface (none / read-only env / interactive prompt / file-based) so the downstream implementation epic inherits a security envelope, not a blank slate.

## 4. R-002 Mitigation (branding pollution) — APPROVED

The architectural treatment in §6.2 plus the trust-calibration framing in §6.1 cover the failure surface adequately. The four named leak channels (commit messages, code comments, file headers, generated documentation) match the rule's enforcement scope. The "user-initiated probes over agent-pushed identification" default in §2.2 Tension 1 is the right architectural posture — it puts the burden of pollution on an active user choice rather than a passive system behavior. One residual wedge: the SAD does not explicitly forbid AIWG identity in **activity-log entries that get committed**. `.aiwg/activity.log` is project-local and may end up in git history depending on the project's `.gitignore`. The `warn:no-project-signal` event type is fine; future activity-log entries from other workstreams (especially Workstream G telemetry) should be reviewed against the invariant. Not a fix — a watch item for ABM.

## 5. Opt-In Telemetry (NFR-OBS-02) — APPROVED

NFR-OBS-02 is privacy-by-default in the correct direction: explicit `aiwg config set` action required, default disabled, no collection until consent. This matches the architectural minimum for opt-in telemetry. Two checks satisfied: (a) the opt-in surface is a user-typed command, not a flag the wizard could toggle silently; (b) the configuration lives in user config, not buried in an opaque default. No fix required.

## 6. Trust-Calibration (Lee & See / Co-Audit) — APPROVED

§6.1 names both Lee & See failure modes (over-trust / disuse) and binds the engagement-surface design to avoid both. The Co-Audit pairing for on-demand probes establishes the right defaults: explicit user inquiry primary, passive footer opt-in, pushy attribution anti-pattern. This precludes the over-trust failure (no constant identity push) and the disuse failure (probes exist when wanted). The framing is architecturally load-bearing — it gives Workstream F's design doc reviewable criteria, not aesthetic preferences.

## 7. Provider Read-Access to `$AIWG_ROOT` (Workstream E) — APPROVED-WITH-SUGGESTIONS

Granting read access to `$AIWG_ROOT` does not introduce sandbox-escape risk per se: `$AIWG_ROOT` contains framework source (skills, agents, rules, commands), all of which are designed for agent consumption. There is no credential material, no user data, no secrets — only the canonical artifact corpus. However, the SAD does not specify the **scope** of read access. Two suggestions: (a) §5.2 or a new §5.3 should state that read access is bounded to `$AIWG_ROOT/agentic/code/` and excludes anything outside (no `~/.config/`, no `~/.aiwg/credentials`, no shell history); (b) Workstream E's audit deliverable should explicitly check that providers granted read access cannot escalate to read of adjacent paths through path-traversal or symlink resolution. These are scope-clarifications, not architectural rewrites.

## Overall Verdict — APPROVED-WITH-SUGGESTIONS

The SAD's security posture is sound. The anti-pollution invariant is correctly elevated. NFR-SEC-01 is architecturally honored. Privacy-by-default for telemetry is in place. Trust-calibration framing avoids both Lee & See failure modes. No CONDITIONAL or REJECTED findings — every concern resolves to APPROVED or APPROVED-WITH-SUGGESTIONS, meaning no required changes block ABM baselining.

Suggested refinements (non-blocking):

1. §6.2 — extend anti-pollution invariant scope to explicitly cover Workstream C (wizard) output, not only Workstream F.
2. §10 / Workstream C row — require the wizard design doc to declare its credential surface as an architectural decision, even though implementation is deferred.
3. §5.2 or new §5.3 — bound Workstream E read-access scope to `$AIWG_ROOT/agentic/code/`; require E's audit to test path-traversal resistance.
4. Watch item for ABM — confirm activity-log entries written by Workstream G telemetry honor the anti-pollution invariant if logs ever land in git history.

## References

- @.aiwg/studies/novice-user-adoption/working/sad-draft.md
- @.aiwg/studies/novice-user-adoption/intake/risk-screening.md (R-002)
- @.aiwg/studies/novice-user-adoption/requirements/nfr-register.md (NFR-SEC-01, NFR-SEC-02, NFR-OBS-02, NFR-USE-03)
- @.claude/rules/no-attribution.md
- @.claude/rules/token-security.md
- @.claude/rules/activity-log.md
