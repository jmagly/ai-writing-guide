# Cockpit Surfaces

The web UI has **eleven tabs**, plus two app-level modals. The active tab
persists in the URL hash (`#inventory`, `#sessions`, …) so views deep-link.
The header shows a Bridge health pill, the executor URL, live counts
(`N stacks · N running · N responses needed`), a runtime-coverage mini-matrix
(`host ✓ · docker ✓ · vm ✓`), and three global verbs: **＋ Launch instance**,
**▸ Start a session**, and **Copy CLI**.

Header data degrades independently: inventory and health are load-bearing,
while the running board, approvals, and cost each fall back to empty on error
without taking the header down.

## The tabs

### Home

The operator wall. A radial topology map of the eleven surfaces around the live
stack count, a running stack-board (up to six instance cards), a telemetry
strip, a guided-start planner (pick stack → runtime → task), and a cost-quota
donut. Two review layouts — **Topology** (default) and **Handoff** (mission
route emphasis) — switchable in the UI or deep-linked with `/?wall=handoff`.
First run shows a three-point tour. Disconnected state renders a "No stack
connected" card with bring-up guidance.

### Inventory

The fleet table: one row per instance with runtime posture (isolation badge +
warning), loadout (+ image ref), transport posture (trust badge, mode, stale
flag), host-daemon status (with the documented operator command when action is
needed — never auto-run), health state, and tenant. Per-row actions:

| Action | Behavior |
|---|---|
| **Session** | Start a session on the instance; disabled until a session backend reports `available`, with the reason as tooltip |
| **Reconnect** | Recover a stale agent — rendered for running docker/container **and vm/qemu/kvm** rows whose agent is unreachable ([Recovery](./recovery.md)) |
| **Stop / Start** | Lifecycle toggle by state |
| **Destroy** | Confirmed, irreversible; for stopped Docker rows this removes the container directly |

Health distinguishes a stopped runtime from a running runtime whose agent has
dropped: the latter renders **`agent unreachable`** and stays visible instead
of vanishing.

### Running

Read-only board of active work across all stacks — instance, runtime,
transport, task, state — with a cross-stack spend line and a per-task **Stop**
control (cancels the A2A task).

### Missions

A read-only projection of Mission Control state: totals
(active / awaiting / terminal), a session list, per-session mission tables
(status, source, loop, backing), and the audit tail. Data merges durable
`aiwg mc` on-disk sessions with the live executor task session.

### Sessions

The terminal workspace — see [Sessions](./sessions.md) for the full attach
model. Two panes: an instances→sessions navigator (badges for controller,
unread output, response-needed, and live attachment) and the xterm terminal
with backend mode select, control row (Observe · Drive/Take Control ·
Keyframe · Reattach+replay · Detach · Reconnect), a capability picker, and a
composer. The panel stays mounted across tab switches so live terminals
survive navigation.

### Approvals

The unified response-needed inbox. Two sections: **Response Needed** (merged
interactive prompts detected in pty sessions and the session registry, each
with an **Open Session** deep link) and the formal **approvals table**
(`hitl-prompt/v1` requests with risk badges and **Approve / Deny** decisions).
A decision is operator authorization — it posts through the Bridge to the
executor's A2A respond surface.

### Explore

Live artifact-index operations (status summary, per-graph cards, query,
**Rebuild all**) plus read-only AIWG capability search (the same
`aiwg discover` index) with a detail viewer for any skill, agent, command,
rule, or flow. `Ctrl/⌘-K` focuses capability search from anywhere.

### Library

Your own assets, stored under `~/.aiwg/cockpit/library` — cloned from the
AIWG catalog or imported. Actions: **Clone** from the catalog, **Use** (inject
a capability reference into the active session and jump to Sessions), and
**Remove**. AIWG install files are never overwritten; the library holds
operator-owned copies only.

### Telemetry

KPI tiles (Events, Active Missions, Approvals, Spend) over a unified,
filterable event table (mission / task / approval / session / inventory) built
from the Bridge's event-snapshot model.

### Memory

Operator notes plus auto-created Mission completion notes. Mission notes come
from durable `aiwg mc` state via the Bridge; **operator notes are
browser-local** (localStorage), scoped to the browser profile — they do not
sync across shells or machines.

### Actions

Contributed actions, first-party screens, and workflows from declarative
contribution manifests. An action **injects a command into an agentic
session** — the agent in that session runs it; Cockpit never executes CLI
commands itself. Actions that need arguments prompt for them; every injection
records an `action.inject.requested` intent in the audit log. First-party
contributions include issue-audit, address-issues, and doctor.

## App-level modals

- **Start a session** — pick instance (with runtime + posture context) and
  session backend, then create. Inline errors; a 15-second guard aborts hangs;
  offers "Start another session" when you're already attached.
- **Launch instance** — provision a new runtime target through the executor's
  v2 admin API: `host`, `docker` (image, mounts, agent-share), or `qemu`/VM
  (SSH public key required, agent-share optional). Generates
  collision-resistant instance names, can auto-start a session once the
  instance is ready (readiness polling with fast-fail on terminal states), and
  never replaces an attached session.

## UX details worth knowing

- Selection is sticky: Sessions keeps your instance/session/backend choice
  across refresh polls while it remains valid or attached.
- Badges: isolation, transport trust, daemon status, `ctrl` (you hold
  control), unread output, response-needed, live ●, high-risk approvals.
- Destroy, End session, and Library remove are confirm-gated.
- `Copy CLI` copies `aiwg cockpit` for sharing the launch command.

## See also

- [Sessions](./sessions.md) — the attach model behind the Sessions tab
- [Trust & Security](./trust-and-security.md) — what the badges mean
- [Bridge API](./bridge-api.md) — the endpoints each tab consumes
