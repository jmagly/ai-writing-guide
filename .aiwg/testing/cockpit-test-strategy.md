# Test Strategy — AIWG Cockpit

**Phase**: Elaboration
**Status**: Draft
**Related**: @.aiwg/architecture/cockpit-sad.md, @.aiwg/requirements/ (UC-COCKPIT-001..012), @.aiwg/requirements/nfr-modules/cockpit-nfrs.md, @.aiwg/security/cockpit-threat-model.md, @.aiwg/risks/cockpit-risk-register.md

## Reasoning

1. **Test scope**: validate the two architecture-defining invariants (overlay isolation NFR-01, non-nerf parity NFR-02), the security mitigations, and the 12 use-case flows — with the highest rigor on the control surface.
2. **Risk priority**: the risk register's top-4 retire-by items (D1, P1, E1+S3, X1/X2) are the must-cover tests; they are also the ABM gate evidence.
3. **Coverage strategy**: PoCs/spikes in Elaboration to retire risk; full suites in Construction. This document defines the strategy + the ABM evidence bar, not the construction test cases.
4. **Quality criteria**: measurable per NFR; capability-parity checklist is pass/fail per provider.

## Test levels

| Level | Focus | Examples |
|---|---|---|
| Unit | Bridge services in isolation | inventory parse, provenance tagging, CSRF token check, no-cred storage lint |
| Integration | Bridge ↔ registry/MCP/CLI/core | attach proxy round-trip, deploy via `aiwg use`, approval relay to core |
| End-to-end | UC flows through UI→Bridge→substrate | start/attach session, unified mission dispatch, approval inbox |
| Non-functional | NFR verification | isolation, parity, perf, a11y, portability, security |

## Critical NFR / risk tests (ABM evidence)

### T-ISO-01 — Overlay isolation kill-bridge (NFR-01 / risk D1) — CRITICAL
- For each supported stack: start a Mission, **kill the Cockpit Bridge mid-run**, assert (a) the run continues unaffected, (b) state persists in the executor-registry, (c) Cockpit reattaches idempotently on restart with intact audit.
- **Pass**: 100% of supported stacks show zero perturbation + successful reattach.

### T-PAR-01 — Non-nerf capability parity (NFR-02 / risk P1) — CRITICAL (ABM gate)
- Per provider: a capability-parity checklist comparing native UI/CLI capabilities with Cockpit attached vs. detached.
- **Pass**: 0 regressions per integrated stack. A stack that can't pass drops to observe-only (documented), never ships "drive" without parity.

### T-SEC — Security PoCs (threat model) — CRITICAL
- **T-SEC-E1/S3**: relayed-approval integrity — a forged/expired/Cockpit-minted approval token is rejected by core; only core-validated approvals enforce.
- **T-SEC-E2**: cross-stack dispatch with mismatched scope is refused by the Mission conductor.
- **T-SEC-I1**: storage audit + CI lint — no token-shaped value ever written to browser storage.
- **T-SEC-S1**: spoofed Origin / cross-site request to the local server is rejected (bind + Origin allow-list + CSRF).
- **T-SEC-E3/I5/T3**: a sandboxed marketplace UX agent cannot reach a dispatch endpoint; CSP blocks off-origin fetch; a content-hash change blocks load pending re-review.
- **T-SEC-T1**: activity-log has no delete/rewrite path; tamper attempt fails.
- **Pass**: 0 criticals open at ABM; each mitigation has a green test.

### T-A11Y-01 — Accessibility (NFR-05)
- Automated WCAG 2.1 AA scan (0 AA violations) + manual keyboard + screen-reader pass on Home, Running, Session View, Approval Inbox.

### T-PERF-01 — Responsiveness under concurrency (NFR-04)
- Simulate 10 concurrent stacks; assert UI interaction p95 < 200 ms (cached) and status refresh p95 < 2 s.

### T-PORT-01 — Portability (NFR-06)
- Launch + core-flow smoke on Linux/macOS/Windows in CI.

## Spikes to retire risk (Elaboration, pre-ABM)
- **S-1 (X1)**: enumerate per-provider attach-capability tiers (drive-capable / observe-only) → populates the parity matrix scope.
- **S-2 (X2)**: validate the serve executor-registry / #1546 seam is sufficient for unified dispatch; file upstream gaps; scope v1 to supported stacks.
- **S-3 (X3)**: define + PoC the cross-stack handoff contract (operator-mediated).

## Tooling / CI
- Unit/integration/e2e in the AIWG TypeScript test harness; a11y via automated scanner; security lints (no-cred-storage, CSP, dep-source pinning) wired into CI; cross-OS matrix in CI (mirrors NFR-06).
- Capability-parity checklist runs per integrated stack and is an explicit ABM gate artifact.

## Exit criteria (ABM gate evidence)
- T-ISO-01, T-PAR-01, and the T-SEC criticals are green for all in-scope stacks; a11y/perf/portability targets met or explicitly waived with rationale; spikes S-1..S-3 resolved or scoped.
