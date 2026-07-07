# ADR: Cockpit Multi-Session Terminal Model — One Persistent Terminal Per Session

**Status**: Accepted
**Phase**: Construction
**Date**: 2026-07-07
**Related**: @.aiwg/architecture/adr-cockpit-session-attach-model.md (attach semantics), @.aiwg/architecture/adr-cockpit-merged-console-topology.md, @.aiwg/reports/cockpit-session-management-audit-2026-07-06.md (finding F5), roctinam/aiwg#1749, #1742 (session registry)
**Supersedes**: the implicit single-terminal design in `useSession` (pre-`15480b72a`)

## Context

Cockpit's target UX is "N instances, each with N sessions; switch between them
quickly, observe or drive." The original `useSession` implementation held a
**single** xterm `Terminal` and a **single** data-plane WebSocket. Selecting a
different session called `attach()`, which closed the socket, `reset()` the one
terminal, opened a new socket, and replayed. Consequences observed in UAT:

- **History was lost on every switch** — `term.reset()` wiped the scrollback of
  the session being left, and the incoming session repainted only from a
  keyframe.
- **The prompt was blank until a keystroke** — a fresh re-attach requested no
  immediate keyframe, so the terminal stayed empty until the user pressed enter
  and tmux redrew.
- **Cross-session bleed** — one shared mutable slot (`termRef`, `wsRef`,
  `lastSeq`, `outputTail`) meant a background session's socket events could
  perturb the foreground view; replay used the wrong session's `lastSeq`.

This is audit finding **F5** ("single global session/terminal architecture vs
the target UX"), the root cause behind F2 (forced detach on browse) and a
contributor to F3/F7.

The attach *semantics* (observer-default, opt-in capability-gated drive,
non-destructive — see `adr-cockpit-session-attach-model.md`) are unchanged. This
ADR governs only the **client-side rendering model**: how many terminals and
sockets exist and how switching behaves.

## Decision

**One persistent `PtyConnection` per `(instance_id, session_id)`.** Each holds
its own xterm `Terminal`, its own wrapper element, and its own WebSocket, plus
the full readiness-retry lifecycle (#1669/#1746) and per-connection sequence
state. Connections are **created once and kept alive** — hidden via
`display:none`, never disposed — when another session is shown.

- **Switching sessions is a show/hide**, not a re-attach. The socket stays
  connected and the terminal keeps its scrollback, so history is preserved and
  the current screen is already painted (no reset, no "press enter to repaint").
- **Re-selecting an already-attached session** just re-shows it. A reconnect
  happens only on an explicit **Reattach + replay** or an **observer→controller
  upgrade**; those re-join with the correct per-session `replay_from`.
- **The active connection drives UI state** (`state`, `responseNeeded`).
  A backgrounded session's socket events update its own terminal buffer but do
  not leak into the foreground `state` or the response-needed prompt.
- **`openTerminal(container)`** registers a single container; each connection's
  wrapper is appended to it and only the active one is visible. `detach()`
  disposes just the active connection and falls back to another live session.
- **Identity is `(instance_id, session_id)`**, never the `attach_url` string
  (audit F4), so the map key is stable across URL/token churn.

## Options considered

| Option | Verdict |
|---|---|
| A. Single terminal, reset + re-attach on every switch (status quo) | ✗ Loses history; blank-until-keystroke; cross-session bleed (F5/F2/F7) |
| B. Single terminal + serialize/restore each session's buffer on switch (`@xterm/addon-serialize`) | ✗ Still re-attaches (slow, lossy for live stream); extra dependency; replay-window edge cases |
| C. **One persistent Terminal + WebSocket per session, hidden not disposed; switch = show/hide** | ✓ **Chosen** — preserves scrollback and the live stream; instant switch; no reset |
| D. Persist sessions server-side and re-render from snapshots only | ✗ Not true live re-entry; depends on executor snapshot fidelity (U4) |

## Consequences

- **Positive**: history and the live prompt survive switches; switching is
  instant (no reconnect/replay); each session is isolated (no cross-bleed);
  directly realizes the target multi-session UX (F5) and removes the forced
  detach (F2) and blank-terminal (F7) symptoms. Pairs with the session registry
  (#1742) which already keys background state by `(instance, session)`.
- **Negative / accepted**:
  - **Concurrent open sockets** — one WebSocket per *attached* session, not per
    *listed* session. Bounded by how many sessions an operator opens; each is a
    lightweight pty-ws stream. If this grows, add an idle-eviction policy
    (dispose the least-recently-viewed connection, keeping the registry snapshot
    for re-hydration).
  - **Memory** — each Terminal keeps `scrollback: 5000`. Acceptable for a
    handful of sessions; revisit if operators routinely hold dozens open.
  - **DOM ownership** — connections created before the Sessions tab mounts are
    re-parented into the container on `openTerminal`; the tab must render exactly
    one container ref.

## Verification

- Unit: `useSession.test.tsx` — the readiness-retry, replay-from, keyframe, and
  injection-guard suites run per connection; two tests were rewritten to the
  persistent-connection contract ("keeps a backgrounded session alive on
  switch"; "switching back does not reconnect"). 76 cockpit tests green.
- Manual (2026-07-07): three Docker sessions driven with distinct markers;
  after switching away and back, session 1 still showed its earlier output and
  each hidden terminal retained its own independent scrollback.
