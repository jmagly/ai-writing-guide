# Cockpit Sessions

The session surface is the heart of Cockpit: live pty terminals into agentic
sessions, with an **observe-first** trust model and non-destructive
reattachment.

## Observe-first attach

Attaching to a session never grabs the keyboard by default. You join as an
**observer** — stdin disabled, watching the live stream — and the server
assigns your role explicitly. Taking control is a deliberate act: the **Drive**
button becomes **Take Control** when you're observing, and clicking it
reconnects requesting the `controller` role. Role policy and the default role
come from the executor's session info; denial reasons stay visible in the
surface.

The terminal is real xterm.js: output arrives as raw bytes and is interpreted
as a genuine terminal (colors, cursor movement, full-screen TUIs), not a text
transcript.

## Per-session persistent terminals

Each `(instance, session)` pair keeps its **own terminal and its own
WebSocket**. Switching sessions or tabs hides a terminal, it does not destroy
it — scrollback and the live stream are preserved, and the Sessions panel
stays mounted across tab navigation. Badges in the session navigator track
what you're not looking at: unread output, response-needed, controller, and
live-attachment markers.

## Replay and keyframe

Reattachment is non-destructive. **Reattach + replay** rejoins the session
asking the executor to replay from the last sequence number the client saw, so
missed output backfills instead of vanishing. **Keyframe** requests a
full-screen snapshot — useful when a TUI's incremental updates leave a stale
picture. Under the hood the client sends `pty.join_session` with
`{role, replay_from}` and tracks sequence numbers from keyframe/output frames.

Attach readiness is defensive: if no first frame arrives promptly, controllers
request a keyframe and observers reconnect, with bounded retries — so a slow
executor shows a notice rather than a dead black terminal.

## Session backends

Session creation uses **sandbox-advertised backend pairs**: `direct` (native
pty) or `managed` (a multiplexer the sandbox reports, e.g. tmux). Each backend
advertises capability flags — observe, drive, replay, keyframe, available —
and when a backend is unavailable the UI disables it and shows the executor's
reason instead of failing silently. Managed backends are what make sessions
survivable across agent restarts and reconnects (the multiplexer holds the
session; see [Recovery](./recovery.md) for the survival rules).

## Target working directory

Provider processes start in the working directory reported by the selected
target. Host sessions use the host runtime's resolved workspace. Container and
VM sessions use the executor-reported target directory; with Agentic Sandbox
`v2026.7.18` that directory is `/home/agent`. Cockpit falls back to
`/home/agent` for older container or VM inventory that does not expose cwd
metadata.

This path belongs to the target, not the machine running Cockpit Bridge. It may
therefore be absent from the Bridge host filesystem. The protected daily
operator gate verifies the exact managed-PTY cwd for its candidate host and
container targets.

## Response detection

Cockpit watches for sessions that are **waiting on a human**. A screen monitor
polls snapshots of non-attached sessions, and a prompt detector recognizes
interactive asks (y/n confirmations, "press Enter to select", arrow-key menus,
trailing questions). Hits surface as a response-needed badge in the session
navigator, in the header count, and in the Approvals tab's Response-Needed
inbox with an **Open Session** deep link.

## Ending and losing sessions

- **End session** (confirm-gated) deletes the session through the Bridge.
- **Detach** drops your attachment without touching the session.
- If an attached session disappears from the executor's list for two
  consecutive polls, Cockpit auto-detaches rather than leaving a zombie
  terminal.
- A stale agent (running runtime, no agent registration) keeps its instance
  row visible with `agent unreachable` and a **Reconnect** affordance — see
  [Recovery](./recovery.md) for what survives a reconnect and what does not.

## Injecting work into a session

Three surfaces feed the active session: the composer (type + Enter), the
inline **＋ capability picker** (search the AIWG catalog and insert a
capability reference), and [Actions](./surfaces.md#actions) (contributed
buttons that inject a full command). In every case the **agent in the session
executes the command** — Cockpit is the control surface, not the runner.

## See also

- [Surfaces → Sessions tab](./surfaces.md#sessions)
- [Recovery](./recovery.md) — stale agents and session survival
- [Architecture](./architecture.md#control-plane-vs-data-plane) — how the PTY
  stream stays Bridge-mediated without exposing executor credentials
