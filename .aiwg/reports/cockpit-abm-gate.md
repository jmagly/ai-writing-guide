# AIWG Cockpit — Architecture Baseline Milestone (ABM) gate

**Date**: 2026-06-13
**Epic**: roctinam/aiwg#1588 · **Spike**: #1590 · **Sandbox seam**: #1589 / agentic-sandbox #460/#461 (#1546)
**Decision**: ABM gate **CLOSED for mock-grade construction**; one integration item (real-sandbox swap) tracked, not blocking.

This document records the Iteration-1 risk retirement: the attach-capability matrix,
the agentic-sandbox seam maturity, and the runnable PoCs that close the gate. Estimation
is agent-oriented (no wall-clock) per the no-time-estimates rule.

## 1. Per-stack drive-vs-observe attach matrix (#1590)

How each stack AIWG can drive maps onto the Cockpit's **observe** (read the stream) vs
**drive** (send input) model. The contract is the agentic-sandbox `pty-extensions/v1`
controller/observer roles; non-sandbox stacks are reached through a multiplexer or the
stack's own interface and normalized onto the same matrix (#1589).

| Stack / backend | Observe | Drive | Mechanism | Seam status |
|---|---|---|---|---|
| agentic-sandbox managed (vm/container) | ✅ | ✅ | `pty-ws/v1` + `pty-extensions/v1` controller/observer | **mock conformant** (33/0/17); real pending #460/#461 |
| agentic-sandbox direct/host session | ✅ | ✅ | same, once #1589 host target lands | **proposed** (#1589) |
| tmux / screen / zellij multiplexer | ✅ | ✅ | attach to the multiplexer pane; normalize to pty frames | **adapter required** (#1589) |
| Claude Code / Codex external loop (serve executor) | ✅ | ◐ | observe via task stream; drive = approval inbox + new dispatch | partial — drive is coarse-grained (per-turn), not keystroke |
| Mission conductor (cross-stack) | ✅ | ◐ | observe per-worker; drive via dispatch/cancel, not raw input | by design — Missions coordinate, sessions drive |

Legend: ✅ full · ◐ coarse-grained (dispatch/approve, not keystroke-level).

**Finding**: keystroke-level drive is a property of *pty-backed* sessions (sandbox managed/direct,
multiplexers). Loop/Mission stacks are observe-rich and drive-coarse by nature; the Cockpit
surfaces both honestly (Sessions tab = pty drive; Running/Approvals = dispatch-grade control).
No stack is observe-blind. This retires the "can we actually drive each stack" risk.

## 2. agentic-sandbox seam maturity

| Capability | Contract | Mock | Real (agentic-sandbox) |
|---|---|---|---|
| Discovery (AgentCard, 5 extensions) | A2A v2 | ✅ conformant | exists |
| Admin REST (inventory, lifecycle) | ADR-022 Surface 1 | ✅ | #460 (host target) extends |
| A2A core + extensions | A2A v1.0.0 | ✅ (idempotency req, multi-tenant, runtime) | exists |
| pty-ws + pty-extensions | pty-ws/v1 | ✅ (controller/observer, replay, keyframe) | #461 (sessions) |
| host/local execution target | runtime/v1 (vm\|container today) | declared | **#1589 adds host** |

**Maturity verdict**: the contract is stable enough to build the entire Cockpit against the mock
in parallel; the real swap is two tracked sandbox items (#460/#461) plus the AIWG-side normalize
(#1589). The seam is **mature for parallel construction**.

## 3. PoC evidence (runnable)

| PoC | Risk retired | Result | Artifact |
|---|---|---|---|
| **T-ISO-01** kill-bridge | Overlay coupling — does killing the Cockpit kill the stacks? | **PASS** — SIGKILL the Bridge; executor + running work + session transcript all survive | `apps/cockpit/poc/kill-bridge-isolation.mjs` |
| **T-SEC S1** surface auth | Is the control surface exposed? | **PASS** — `/api/*` gated by per-launch bearer token (constant-time), 401 on absent/wrong | `apps/cockpit/poc/security-checks.mjs` |
| **T-SEC E1/S3** approval integrity | Can approvals be spoofed/flipped? | **PASS** — decision requires the token; a resolved approval cannot be re-decided (409) | same |
| **T-SEC I1** no creds | Does the overlay hoard stack credentials? | **PASS** — runtime file holds only the overlay's own token (`{pid,port,started_at,token}`); tenant_id is routing, never auth | same |
| **T-PAR-01** CLI parity | Does the UI fork from the CLI? | **PASS (structural)** — every contributed action is an `aiwg` argv; the Bridge spawns nothing but `aiwg`; the data-driven core reads `aiwg discover`/`show`. UI action ⊆ registry capability by construction | `apps/cockpit/contrib/` + `/api/capabilities` |

Run them: `node apps/cockpit/poc/kill-bridge-isolation.mjs && node apps/cockpit/poc/security-checks.mjs`
(or `npm --prefix apps/cockpit run poc`).

## 4. Gate decision

**ABM gate is CLOSED for construction against the mock.** All Iteration-1 risks are retired with
runnable evidence: overlay isolation holds, the control surface is authenticated, approval
integrity is enforced, no stack credentials are stored, and CLI-first parity is structural.

**One open integration item** (not a gate blocker): swap mock → real agentic-sandbox once #460
(host target) and #461 (sessions) land; the AIWG-side normalize is #1589. Cockpit construction
proceeds on the mock; the swap is a contract-preserving substitution validated by the same
`agentic-sandbox-conformance` harness the mock already passes (33/0/17).

## References
- `.aiwg/planning/cockpit-construction-plan.md` — iteration roadmap
- `.aiwg/architecture/cockpit-sad.md` + `cockpit-instance-control-interface.md` — the seam
- `apps/cockpit/poc/` — runnable PoCs
- #1588 (epic), #1590 (this spike), #1589 / agentic-sandbox #460/#461 (real seam)
