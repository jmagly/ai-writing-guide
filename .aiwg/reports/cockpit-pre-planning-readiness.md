# AIWG Cockpit — Pre-Planning Readiness Assessment

**Date**: 2026-06-13
**Purpose**: Confirm the elaboration track has everything needed before construction **planning** begins. This is the readiness gate, not the plan itself.
**Epic**: roctinam/aiwg#1588

## 1. Artifact completeness

| Artifact | Status |
|---|---|
| Intake (intake / solution-profile / option-matrix / stakeholders) | ✅ complete |
| Vision (+ UX-first posture, KPIs) | ✅ complete |
| Use cases UC-COCKPIT-001..016 | ✅ 16 (incl. daemon mgmt UC-016 added this pass) |
| NFR module (10 NFRs incl. install/parity, live-refresh, security) | ✅ complete |
| Threat model (STRIDE + DFD) | ✅ complete |
| Risk register (12 security + 12 product/technical) | ✅ complete |
| SAD (C4 context/container + sequence) | ✅ complete |
| ADRs (adr-cockpit-*) | ✅ 12 |
| Test strategy (incl. isolation/parity/security PoCs) | ✅ complete |
| UX design (+ cited research foundations → #68/#69/#70) | ✅ complete |
| Elaboration brief | ✅ complete |

**Gaps found + filled this pass**: (a) daemon-management UC (UC-016); (b) UX research foundations formalized + traced to induction issues. **No remaining artifact gaps.**

## 2. Decisions — all locked

Name (AIWG Cockpit) · shells (Tauri desktop + VS Code ext, parallel; Tauri-alt open) · first-party packs (SDLC+Ops+Forensics+Marketing + all-inspectable + live-refresh) · security (per-launch token + OS-keychain) · daemon (decoupled, UI-managed) · instance control (normalized on agentic-sandbox; host/docker/VM tiers). No open product decisions block planning.

## 3. Traceability (UC → architecture/NFR → test → risk → dependency)

| UC | Primary ADR(s) | NFR | Test | Top risk | Dep |
|----|----------------|-----|------|----------|-----|
| 001 inventory/health | overlay; ui-cli-binding | 07 | T-PAR | P1 | — |
| 002 running agents | instance-control; overlay | 01 | T-ISO | D1 | #1589 |
| 003 newcomer start | ui-stack; distribution | 09 | a11y/perf | P3 | #1593 |
| 004 start session | session-attach; instance-control | 01/03 | T-ISO/SEC | X1/P8 | #1589/#460 |
| 005 attach (non-destructive) | session-attach | 01/02 | T-ISO/PAR | D1/P1 | #461 |
| 006 concurrent stacks | overlay; coordination | 04 | perf | X1 | #1590 |
| 007 cross-stack handoff | coordination-bus | 08 | e2e | X3 | #1546 |
| 008 unified mission dispatch | coordination-bus | 03 | T-SEC | E2 | #1546 |
| 009 HITL approval inbox | ui-extensibility; binding | 03/08 | T-SEC | E1/S3 | #1565 |
| 010 cost/quota | binding | 04 | e2e | — | #1187 |
| 011 deploy from UI | binding; package-topology | 07 | e2e | — | — |
| 012 pause/resume/stop | instance-control | 01 | T-ISO | D1 | #1589 |
| 013 minimal-ramp install | distribution; package-topology | 09 | install | X5/X6 | #1593 |
| 014 contributed domain action | ui-extensibility; binding | 02 | T-PAR | P7/X10 | #1591 |
| 015 inspect-all + live refresh | binding; ui-extensibility | 10 | live-refresh | — | #1592 |
| 016 manage daemon | instance-control | 01/08 | T-ISO | — | — |

NFR key: 01 isolation · 02 parity · 03 security · 04 perf · 05 a11y · 06 portability · 07 maintainability · 08 audit · 09 install/parity · 10 live-refresh.

**Coverage check**: every UC maps to ≥1 ADR, an NFR, a test class, and (where relevant) a tracked dependency. No orphan requirements; no ADR without a driving UC.

## 4. ABM gate — exit criteria (to ENTER construction)

The ABM is **CONDITIONAL**. To clear it (→ construction planning):
- [ ] **Spike #1590** done: per-stack drive-vs-observe matrix + agentic-sandbox/#1546 seam-maturity finding → sets v1 stack scope.
- [ ] **PoCs runnable/green**: T-ISO-01 (overlay isolation), T-PAR-01 (non-nerf parity), T-SEC criticals (E1/S3 approval integrity, I1 no-creds, S1 surface auth).
- [ ] **UI-contribution schema** v0 spec'd (#1591) — the platform contract construction builds against.
- [ ] **agentic-sandbox dependency** acknowledged: #460 (host target), #461 (sessions) on the agentic-sandbox roadmap (queued).

## 5. Dependencies / blockers before planning

| Item | Where | Blocking? |
|---|---|---|
| Drive-vs-observe + seam spike | roctinam/aiwg#1590 | **Yes — gates v1 scope** |
| agentic-sandbox host target | section9… roctinam/agentic-sandbox#460 | Yes (queued, other agent) |
| agentic-sandbox sessions/multiplexers | roctinam/agentic-sandbox#461 | Yes (queued) |
| UI-contribution schema v0 | roctinam/aiwg#1591 | Soft — needed early in construction |
| UX research induction | section9/research-papers #68/#69/#70 | No — design basis already cited |

## 6. Verdict

**Elaboration is complete and internally consistent; the track is ready to plan, with one empirical gate.** All artifacts present, all decisions locked, full traceability, dependencies filed and cross-linked. The **only thing standing between here and a construction plan is spike #1590** (it scopes which stacks ship drive vs observe in v1) plus confirmation that the agentic-sandbox dependencies (#460/#461) are sequenced. Recommend: run/scope #1590, then decompose v1 into scope-units (agent-oriented, per no-time-estimates) against the supported-stack scope it yields.
