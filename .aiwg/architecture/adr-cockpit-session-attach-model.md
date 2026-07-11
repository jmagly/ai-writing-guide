# ADR: Cockpit Session Attach Model — Observer-Default via PTY-Bridge/Screen-Reader, Non-Destructive

**Status**: Accepted (implemented + verified 2026-07-07)
**Phase**: Elaboration → Construction
**Related**: @.aiwg/architecture/cockpit-sad.md, @.aiwg/architecture/adr-cockpit-multi-session-terminal-model.md (client-side rendering model), UC-COCKPIT-005 (attach), UC-COCKPIT-004 (start), @.aiwg/requirements/nfr-modules/cockpit-nfrs.md (NFR-01, NFR-02), @.aiwg/risks/cockpit-risk-register.md (D1)

> **Implementation note (2026-07-07)**: the observer-default / opt-in
> capability-gated drive / non-destructive semantics below are implemented in
> `useSession`/`Sessions.tsx`. *How* the client renders and switches between
> attached sessions (one persistent terminal per session) is a separate decision
> documented in `adr-cockpit-multi-session-terminal-model.md`. Controller
> exclusivity / takeover truthfulness still depends on upstream agentic-sandbox
> #501 (audit U1).
>
> **Recovery note (2026-07-11)**: session attach now preserves stale
> Docker/container runtimes in the Sessions surface. If the runtime is running
> but no agent id resolves, the row shows `agent unreachable` and offers
> **Reconnect**. Reconnect routes through the Bridge recovery extension
> (`POST /api/instances/:id/reconnect`) and does not create or destroy a
> session; it restores agent registration so the normal observe/drive attach
> contract can resume.

## Reasoning

1. **Context analysis**: "Re-enter a running session" is a P0 use case, but a careless attach can hijack or perturb a live session — the opposite of overlay isolation.
2. **Force identification**: re-entry/drive value vs. non-destructive guarantee vs. provider heterogeneity (some stacks aren't attach-capable).
3. **Option evaluation**: below.
4. **Decision justification**: attach as a shared observer through existing serve bridge seams; drive only on explicit action where the stack permits.
5. **Consequence assessment**: some stacks observe-only; concurrent-driver contention must be surfaced.

## Context

Operators want to watch and (where possible) drive a running session from Cockpit without owning its lifecycle. AIWG's `serve` layer already has PTY-bridge and screen-reader seams (`serve/pty-bridge.ts`, `serve/screen-reader.ts`) suited to shared observation.

## Decision

- **Attach defaults to OBSERVER mode**: Cockpit streams live output through the PTY-bridge/screen-reader without claiming exclusive input. The session keeps full native behavior (NFR-02).
- **Drive is opt-in + capability-gated**: only where the stack exposes a drive-capable interface, and only on explicit operator action; observe-only stacks disable drive controls.
- **Non-destructive**: detach is a no-op on the session; a concurrent driver is detected and surfaced (offer observe-only). Verified by an isolation test (NFR-01).
- **Crash-safe re-entry** (D1): sessions are discovered from the executor-registry (which owns persistence); after a Cockpit restart, sessions are re-attachable and the audit timeline is intact.
- **Stale-agent re-entry**: if a Docker/container runtime survives but its agent
  registration is missing, Cockpit keeps the stale row visible and offers a
  recovery action instead of forcing reprovision. Once the agent re-registers,
  attach resumes through the same observer-default path.
- **No credentials**: attach uses opaque handles delegated to each stack's native auth; Cockpit stores no provider tokens (threat-model I1).

## Options considered

| Option | Verdict |
|---|---|
| A. Take over session stdio | ✗ Hijacks — violates non-destructive/parity |
| B. **Shared observer via PTY-bridge/screen-reader; opt-in capability-gated drive** | ✓ **Chosen** — non-destructive, registry-backed re-entry |
| C. Show last-known logs only | ✗ Not true re-entry; loses drive value |

## Consequences

- **Positive**: satisfies NFR-01/02 and UC-005's non-destructive criteria; crash-safe re-entry via registry; no credential surface.
- **Negative / accepted**: stacks without an attach seam are observe-only (risk X1 — populate the per-provider attach-capability tier matrix in Elaboration); concurrent-driver UX must clearly signal contention.
