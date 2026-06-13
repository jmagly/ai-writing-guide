# ADR: Cockpit Overlay Integration Model — Observe/Relay, Never Fork

**Status**: Proposed
**Phase**: Elaboration
**Related**: @.aiwg/architecture/cockpit-sad.md, @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-01, NFR-02, NFR-07), @.aiwg/risks/cockpit-risk-register.md (D1, P1, P2)

## Reasoning

1. **Context analysis**: The product's whole differentiator is "sit on top, don't nerf." How Cockpit touches each provider stack and the AIWG CLI determines whether that promise holds.
2. **Force identification**: unify+control vs. don't-replace; drive-capability vs. overlay-isolation; coordination value vs. blast radius.
3. **Option evaluation**: see below.
4. **Decision justification**: a client-of-existing-surfaces overlay is the only option that satisfies both invariants.
5. **Consequence assessment**: bounded by what the substrate exposes; some stacks observe-only.

## Context

Cockpit must manage/observe/control AIWG and multiple provider stacks without replacing their interfaces or destabilizing running work (NFR-01/02). AIWG already exposes: the `serve` executor-registry (run state + adapters, #1546), the MCP server, the `aiwg` CLI (`status --probe`/`doctor`/`list`/`use`/`cost-report`), and the append-only activity-log.

## Decision

The **Cockpit Bridge is a client of AIWG's existing surfaces**. It:
- **Observes** run/inventory state via the executor-registry, MCP, and CLI probes.
- **Relays** mutating/authorizing actions (dispatch, lifecycle, approvals, deploy) to **AIWG core / the registry / the `aiwg use` path**, which validate and enforce them.
- **Never** forks, wraps-and-replaces, or seizes a provider's native session; **never** owns run persistence; **never** holds exclusive locks or provider credentials.
The **executor-registry is the single adapter seam** — new stacks are integrated there, not in the Bridge/UI.

## Options considered

| Option | Verdict |
|---|---|
| A. Cockpit re-implements provider control directly (forks sessions, drives PTYs it owns) | ✗ Breaks overlay isolation + parity; reimplements the substrate (risk P2) |
| B. Cockpit hand-edits config/deploys files directly | ✗ Bypasses registry/gates (cli-secondary); registry drift |
| C. **Cockpit Bridge as a thin client of registry+MCP+CLI, relaying to core** | ✓ **Chosen** — preserves isolation, parity, audit; single adapter seam |
| D. Observe-only (no control at all) | ✗ Loses the control/coordination value |

## Consequences

- **Positive**: NFR-01 (no lifecycle ownership → crash-safe), NFR-02 (native paths untouched → parity), NFR-07 (registry seam), NFR-08 (all relays audited). Avoids reimplementation scope-creep (P2).
- **Negative / accepted**: Cockpit capability is bounded by what the registry/MCP/CLI expose; stacks lacking a programmatic interface are observe-only (risk X1); coordination richness bounded by #1546 maturity (risk X2 — validate early).
