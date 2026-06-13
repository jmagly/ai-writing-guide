# AIWG Cockpit — Construction Plan (iteration roadmap)

**Date**: 2026-06-13
**Epic**: roctinam/aiwg#1588
**Estimation note**: agent-oriented per the no-time-estimates rule — scope-units + passes + parallelism, never wall-clock.

## Operator-set frame (2026-06-13)
- **v1 goal**: **Full** — observe + drive + coordinate, across multiple stacks, in a Tauri desktop app **and** a VS Code extension, over the registry-bound core, on the agentic-sandbox instance-control substrate.
- **Iteration 1**: **risk retirement first** (closes the ABM gate before scaling).
- **Dependency strategy**: **mock the instance-control interface**, build Cockpit in parallel, integrate real agentic-sandbox (#460/#461) when it lands.
- **Working mode**: **interactive co-design, one area at a time** (rich input at each step).

## Iteration roadmap (dependency-sequenced)

### Iteration 1 — Retire risk + define the seam ("make it safe to build")
- **SU-1.1** Define the **instance-control interface contract** (Cockpit-facing), aligned to the agentic-sandbox **v2 executor contract** — the two axes (host/docker/VM × multiplexer/native), direct+managed sessions, I/O, lifecycle. Ship a **typed contract + mock** so parallel build can start. ← *the parallel-build enabler*
- **SU-1.2** Spike roctinam/aiwg#1590 — per-stack drive-vs-observe matrix + seam maturity (informs scope; build proceeds on the mock).
- **SU-1.3** PoC **T-ISO-01** overlay isolation (kill-bridge) against mock + one real backend.
- **SU-1.4** PoCs **T-SEC** E1/S3 (approval integrity), S1 (surface auth), I1 (no creds); **T-PAR-01** parity approach.
- **Exit**: ABM gate closed.

### Iteration 2 — Walking skeleton (thin end-to-end slice)
- **SU-2.1** npm workspaces + `@aiwg/cockpit` scaffold + base-footprint CI guard (#1593).
- **SU-2.2** Cockpit Bridge skeleton — 127.0.0.1 + per-launch token + OS-keychain (#1595); client of registry/discover/index.
- **SU-2.3** Tauri desktop shell **+** VS Code extension shell, both rendering the same minimal UI (#1594).
- **SU-2.4** Registry-bound, data-driven UI core + **Explore** (inspect-all + live refresh, no restart; #1592) + install/inventory.
- **SU-2.5** Observe ≥1 stack end-to-end via the mock instance-control.
- **Exit**: shell → Bridge → registry → observe one stack, live.

### Iteration 3 — Thicken: multi-stack observe + management
- Running-agents board; concurrent stacks on one screen; pause/resume/stop (UC-012); manage decoupled daemon (UC-016); cost/quota (UC-010); unified approval inbox (UC-009).

### Iteration 4 — Drive + coordinate (integrate real sandbox)
- Drive sessions (mixed-initiative); cross-stack handoff (UC-007); unified Mission dispatch (UC-008). Swap mock → real agentic-sandbox (#460/#461); per-stack drive/observe per the #1590 matrix.

### Iteration 5 — Platform: contribution model + first-party packs
- UI contribution schema (#1591); SDLC + Ops + Forensics + Marketing surfaces (UC-014).

### Cross-cutting (every iteration)
- Distribution/installer (one SetupManifest → channels; #1593 + distribution ADR); security hardening (#1595); accessibility WCAG 2.1 AA (NFR-05); test suites (isolation/parity/security/a11y/perf/portability).

## Working agreement
- One area at a time, interactive. I bring a strawman + the citable/architectural rationale; you give rich input; we converge; I implement against the mock; we verify.
- CLI-first parity held structurally (every UI action = a registry capability).
- CI green before any area is "done"; nothing committed without your go.

## Now: Area 1 = the instance-control interface contract (SU-1.1)
Starting here because it retires architecture risk, is the agentic-sandbox integration seam, and unblocks the mock + all parallel build.
