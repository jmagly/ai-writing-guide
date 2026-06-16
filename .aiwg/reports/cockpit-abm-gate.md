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
| agentic-sandbox managed (vm/container) | ✅ | ✅ | `pty-ws/v1` + `pty-extensions/v1` controller/observer | mock conformant; real executor seam wired |
| agentic-sandbox direct/host session | ✅ | ✅ | same interface over the host target | landed upstream in agentic-sandbox#460/#461 |
| tmux / screen / zellij multiplexer | ✅ | ✅ | session-host backends normalize to pty frames | landed upstream in agentic-sandbox#461 |
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
| Admin REST (inventory, lifecycle) | ADR-022 Surface 1 | ✅ | host target landed (#460) |
| A2A core + extensions | A2A v1.0.0 | ✅ (idempotency req, multi-tenant, runtime) | exists |
| pty-ws + pty-extensions | pty-ws/v1 | ✅ (controller/observer, replay, keyframe) | direct/managed sessions landed (#461) |
| host/local execution target | runtime/v1 (`vm|container|host`) | declared | landed (#460) |

**Maturity verdict**: the contract is stable enough to build the Cockpit against either the
bundled mock fixture or a real agentic-sandbox executor. The upstream sandbox items
(#460/#461) are landed; the AIWG-side normalize (#1589) is the Bridge configuration seam
and verification path.

## 3. PoC evidence (runnable)

| PoC | Risk retired | Result | Artifact |
|---|---|---|---|
| **T-ISO-01** kill-bridge | Overlay coupling — does killing the Cockpit kill the stacks? | **PASS** — SIGKILL the Bridge; executor + running work + session transcript all survive | `apps/cockpit/poc/kill-bridge-isolation.mjs` |
| **T-SEC S1** surface auth | Is the control surface exposed? | **PASS** — `/api/*` gated by per-launch bearer token (constant-time), 401 on absent/wrong | `apps/cockpit/poc/security-checks.mjs` |
| **T-SEC E1/S3** approval integrity | Can approvals be spoofed/flipped? | **PASS** — decision requires the token; a resolved approval cannot be re-decided (409) | same |
| **T-SEC I1** no creds | Does the overlay hoard stack credentials? | **PASS** — runtime file holds only the overlay's own token (`{pid,port,started_at,token}`); tenant_id is routing, never auth | same |
| **T-PAR-01** CLI parity | Does the UI fork from the CLI? | **PASS (structural)** — the Cockpit never runs the CLI; a contributed action **injects a command into an agentic session** and the *agent* runs the CLI. Read-only catalog data (discover/show) is display, not work. Parity holds because the agent is CLI-first. See `adr-cockpit-session-control-not-cli-runner.md` | `apps/cockpit/contrib/` + the Sessions surface |

Run them: `node apps/cockpit/poc/kill-bridge-isolation.mjs && node apps/cockpit/poc/security-checks.mjs`
(or `npm --prefix apps/cockpit run poc`).

## 4. Gate decision

**ABM gate is CLOSED for construction against the mock.** All Iteration-1 risks are retired with
runnable evidence: overlay isolation holds, the control surface is authenticated, approval
integrity is enforced, no stack credentials are stored, and CLI-first parity is structural.

**Integration item status**: the mock remains the CI fixture, and the Bridge now accepts a real
agentic-sandbox executor through `AIWG_COCKPIT_EXECUTOR_URL` / `EXECUTOR_URL`. The upstream
host target and direct/managed session backends have landed; the substitution remains
contract-preserving and is validated through the same Bridge tests and conformance harness.

## References
- `.aiwg/planning/cockpit-construction-plan.md` — iteration roadmap
- `.aiwg/architecture/cockpit-sad.md` + `cockpit-instance-control-interface.md` — the seam
- `apps/cockpit/poc/` — runnable PoCs
- #1588 (epic), #1590 (this spike), #1589 / agentic-sandbox #460/#461 (real seam)
