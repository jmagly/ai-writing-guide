# Cockpit Session Management Audit — 2026-07-06

**Scope**: `apps/cockpit` (Bridge + web UI) session/instance management against the
agentic-sandbox executor (`~/dev/agentic-sandbox`, reviewed at `4dc2273`).
**Trigger symptoms** (operator-reported): crossed wires between instances/sessions,
failed connections, duplicate terminal sessions in the list with only one even
partially working, and session state lost when changing screens/streams in-app.
**State audited**: working tree as of this date (includes the uncommitted
`defaultSessionLaunch` cwd fix, the `replay_from` URL fix in `useSession.ts`, and
Inventory cosmetics — noted where relevant).
**Topology**: one central management server, N worker hosts whose agents register
back into it. Cockpit's single `AIWG_COCKPIT_EXECUTOR_URL` Bridge is topologically
correct for this model; no multi-executor gap is claimed.
**Target UX** (confirmed with operator): **one active driven terminal + background
monitoring** of all other sessions (response-needed detection, activity/liveness,
unread-output badges, server-side screen-snapshot previews).

Severity legend: CRITICAL = directly produces a reported symptom with data-flow
confirmation; HIGH = confirmed defect contributing to symptoms; MEDIUM = confirmed
defect with narrower blast radius; LOW = hygiene/robustness.

**Filed issues** — umbrella roctinam/aiwg#1737. Cockpit: F1 #1738 · F2 #1739 ·
F3 #1740 · F4 #1741 · F5 #1742 · F6 #1743 · F7 #1744 · F8 #1745 · F9 #1746 ·
F10 #1747. Upstream (roctinam/agentic-sandbox): U1 #602 · U2 #603 · U3 #604 ·
U4 #605.

---

## Part 1 — Cockpit findings (roctinam/aiwg)

### F1 · CRITICAL — Session create is non-idempotent and retried across fallback URLs → duplicate sessions

**Where**: `bridge/src/server.mjs:1681-1708` (create candidates), `:360-384`
(`fetchJsonFirst`), sandbox `management/src/http/sessions.rs:211-260` (create).

The Bridge's `POST /api/instances/:id/sessions` builds up to **four** candidate
POSTs (2 agent ids × 2 API shapes) and hands them to `fetchJsonFirst` with
`timeoutMs: 8000`. `fetchJsonFirst` **falls through to the next candidate** on any
fetch error — including its own client-side timeout abort — and on 404/405.

A timed-out POST is not a failed POST: the executor keeps processing and creates
the session (fresh containers/VMs where tmux setup exceeds 8s are exactly the slow
case). The executor's duplicate guard is **by `session_name` only**, and when the
client omits a name the server generates a unique `terminal-<uuid8>` per request —
so consecutive fallback POSTs never 409. One click can create up to four sessions;
the UI attaches to whichever POST returned in time, and the earlier ones linger as
broken-looking rows.

This mechanism reproduces the operator's exact observations: duplicates after both
UI create paths (Start modal and Launch-instance flow — fresh instances are the
slowest and most likely to hit the timeout), and **ending one duplicate leaves the
others** because they are genuinely distinct sessions. Frontend retry pressure
compounds it: `StartSessionModal` aborts at 15s and invites a retry while the
Bridge may still be walking its candidate list.

**Fix direction**:
- Pass an explicit, deterministic `session_name` (e.g. `cockpit-<instance>-<nonce>`)
  in **all** candidate bodies so the server's 409-by-name guard actually dedupes
  cross-candidate retries.
- Never fall through on a **timeout** for non-idempotent methods; only on
  connection-refused/404/405 (route-shape misses).
- After any create failure, list sessions and reuse a just-created match before
  re-POSTing.
- Upstream (U3): idempotency-key support on create.

### F2 · CRITICAL — Browsing another instance force-detaches the live session

**Where**: `web/src/components/Sessions.tsx:81-85`.

```ts
useEffect(() => {
  if (!session.state.url) return;
  const sessionStillListed = sessions.some((s) => s.attach_url === session.state.url);
  if (sessions.length && !sessionStillListed) session.detach();
}, [session.state.url, session.detach, sessions]);
```

`sessions` holds only the **currently selected instance's** sessions. Attach to a
session on instance A, click instance B in the nav → `loadSessions(B)` replaces the
list → the attached URL is "no longer listed" → `session.detach()` fires. The
operator cannot browse the fleet without killing their live attach. This is the
primary confirmed cause of "session state lost when changing screens/streams."
After the forced detach, the terminal retains instance A's dead content while the
nav shows instance B — the core "crossed wires" presentation.

**Fix direction**: record the *owning instance id* of the current attach; only
auto-detach when the owning instance's list definitively no longer contains the
session (and only after a confirmed fresh fetch, not a stale/raced one — see F3).

### F3 · HIGH — Unguarded async races in session/inventory polling

**Where**: `Sessions.tsx:26-72` (`refreshInventory`, `loadSessions`).

Both pollers run on 5s intervals with **no request-sequence or instance guard**. An
in-flight `loadSessions(A)` response can land after the operator switched to
instance B, displaying A's sessions under B's row and feeding F2's auto-detach
stale data. Auto-selection compounds it: `setInstId(sessionable[0]?.id)` and
`setAttachUrl(nextSessions[0]?.attach_url)` jump selection whenever the current one
briefly disappears (agent re-registration flaps `session_backends.available`),
which cascades into `loadSessions(newInst)` → F2 detach.

**Fix direction**: per-request token compared on resolve (drop stale responses);
never auto-jump selection while attached; treat transient unavailability as
"stale," not "gone" (grace window before deselect/detach).

### F4 · HIGH — `attach_url` string is used as session identity

**Where**: `Sessions.tsx` (selection, live badge, F2 membership check),
`server.mjs:1333-1431` (`normalizeSessionRows`), `:1710-1726` (create response).

Selection state, the "live" badge, dedupe survivorship, and the F2 check all
compare **URL strings** that the Bridge constructs via *different* paths: the
create path prefers executor-provided `attach_url`/`pty_ws_url` (with `{host}`
substitution), while the list path — because the sandbox v1 `SessionEntry` carries
neither field — always falls back to
`${wsBase}/agents/${instanceId}/sessions/${sessionId}/attach`. Any divergence
(explicit vs constructed, host/protocol normalization, agent-name vs instance-id —
the #1671 class) breaks equality: the UI loses track of what's attached, the live
dot vanishes, and F2 kills a valid connection.

**Fix direction**: identity is `(instance_id, session_id)` everywhere; `attach_url`
is a transport detail resolved at attach time.

### F5 · HIGH — Single global session/terminal architecture vs the target UX

**Where**: `web/src/useSession.ts` (whole module), `App.tsx:50` (single instance),
`Actions.tsx`/`Library.tsx` (inject into "the session").

`useSession()` is instantiated once and owns exactly one WebSocket, one xterm
`Terminal`, one `outputTail`, one role, one response-needed detector. Consequences:

- Every session switch is a destroy-and-reattach of shared mutable state; "Take
  Control" is a full reattach + `term.reset()` (see F7).
- Response-needed/HITL detection exists **only for the attached session**; all
  other sessions are invisible until visited.
- Actions/Library "inject into session" targets *whatever happens to be attached*,
  with no target-session assertion. (Operator reports no misdirected input to
  date — display confusion only — but the design provides no guarantee.)

Against the confirmed target UX (**one active + background monitoring**) the gaps
are: per-session background state (response-needed, last-activity, unread-output)
and snapshot previews. The sandbox already exposes server-side virtual-terminal
snapshots via REST (`screen_state.rs` / screen registry — `has_screen` in the v1
list), which supports previews and background prompt detection **without** holding
N WebSockets.

**Fix direction**: introduce a session-registry store in the web app keyed by
`(instance_id, session_id)`; one *driven* attach (current `useSession` semantics)
plus lightweight background polling of screen snapshots/last-output for the rest;
inject APIs take an explicit target session id and refuse if it isn't the attached
one.

### F6 · MEDIUM — Launch flow can bind to the wrong instance

**Where**: `App.tsx:240-244` (`waitForSessionReady`).

When the launch operation hasn't yet yielded an instance id, the poller selects
`candidates[0]` — literally the first running instance in inventory — and the
follow-on session create + attach targets it. On a busy fleet this opens a session
on an unrelated instance: a real crossed-wire, silent because the flow then
switches to the Sessions tab as if it succeeded.

**Fix direction**: never fall back to `candidates[0]`; block on the operation
result carrying `instance_id`, and surface "waiting for instance id" instead.

### F7 · MEDIUM — Fresh attach/Take Control shows a blank terminal when no keyframe exists

**Where**: `useSession.ts:192-282` (attach resets term, joins without
`replay_from`), sandbox `session/registry.rs:178-276` (replay floor = last
keyframe; none → no replay).

A fresh join (`replay_from` absent) replays only from the last keyframe; if the
backend never emitted one, **nothing** is replayed. Cockpit's own backend
normalization advertises `keyframe: false` for host sessions, observers can't
request keyframes on some backends (controller-gated), and "Take Control" is a
full reattach with `term.reset()`. Net effect: attaching to an idle session paints
an empty terminal until the next output byte — indistinguishable from a broken
session. This is the most likely explanation for duplicates "only one even
partially working": the F1 duplicates are idle, so every attach to them looks dead.
Related: the `[waiting for session…]` hint only prints on the close-retry path
(#1669); an **open but silent** socket shows nothing at all.

**Fix direction**: on fresh attach, request tail replay (`replay_from` = current
seq − window, or 0 with server-side clamping) or paint from the server-side screen
snapshot; show an explicit "attached — no output yet" status line; upstream (U4)
auto-keyframe on join.

### F8 · MEDIUM — Viewer/controller metadata renders from fields the executor never sends

**Where**: `Sessions.tsx:250-257` (`sessionMeta`, `sessionHoldsController`),
sandbox `http/sessions.rs` `SessionEntry`.

The UI reads `s.members` / `s.controllers` / `s.observers` / `s.has_controller`;
the v1 list response contains none of these. Every row shows "0 viewers" and the
`ctrl` badge can never appear from list data — so the operator can't see that a
controller (possibly a half-dead prior Cockpit socket) is holding a session.
Misleading data is worse than absent data during incident triage.

**Fix direction**: hide membership UI when the source doesn't provide it; upstream
(U2) add membership/lifecycle fields to the session list.

### F9 · LOW — Readiness retry only covers close-before-frame

**Where**: `useSession.ts:221-239`.

The #1669 retry window triggers only when the socket **closes** before the first
frame. A socket that opens and stays silently open (session exists, PTY wedged, or
wrong session id accepted by a permissive route) renders an empty terminal forever
with no hint and no timeout.

**Fix direction**: first-frame deadline on open sockets → surface "attached but no
output after Ns" with a keyframe/replay retry.

### F10 · LOW — Polling storm and per-poll agent resolution

**Where**: `Sessions.tsx` (2 × 5s pollers), `App.tsx` (15s chrome + SSE-tick
refetch), `server.mjs:1321-1331` (`getSessions` → `resolveSessionAgentId` refetches
`/api/v1/agents` on every list call, uncached).

Every Sessions-tab second triggers overlapping inventory/session/agent fetches;
besides load, more in-flight requests = more F3 race surface.

**Fix direction**: cache agent-id resolution with TTL; single scheduler with
backoff; pause polls while a mutation is in flight.

---

## Part 2 — Upstream findings (agentic-sandbox)

### U1 · HIGH — `attach` grants any requested role; no controller exclusivity or takeover semantics

`session/registry.rs` `attach()`: `let granted_role = requested_role;` — every
joiner asking for `controller` gets it. There is no takeover protocol, no
notification to a displaced controller, and membership includes half-dead sockets
until TCP reaps them. Cockpit's UX ("Take Control", `ctrl` badge) assumes
single-controller semantics the server does not provide.

### U2 · MEDIUM — v1 session list lacks attach/membership/lifecycle metadata

`SessionEntry` (http/sessions.rs) has no `attach_url`/`pty_ws_url`, no member/role
counts, no `last_output_at`, no lifecycle state. Clients must fabricate attach URLs
(the aiwg #1671 defect class) and cannot render occupancy (Cockpit F8). Related to
existing #500 (agent-scoped sessions not in the formal/global registry).

### U3 · MEDIUM — Session create is non-idempotent by design

Duplicate guard is name-only, and the server generates a fresh
`terminal-<uuid8>` name when the client omits one — retried/fallback POSTs always
create new sessions (root enabler of Cockpit F1). No idempotency-key support.

### U4 · MEDIUM — Fresh joins replay nothing when no keyframe exists; observer keyframe requests gated

Replay floor defaults to the last keyframe (`replay.last_keyframe_seq()`); a
session that never emitted one gives new joiners a blank screen (Cockpit F7), and
observers cannot request a keyframe on controller-gated backends. An auto-keyframe
(or tail replay) on join would make every fresh attach paint.

---

## Part 3 — Symptom → cause map

| Reported symptom | Primary causes | Contributing |
|---|---|---|
| Duplicate sessions, only one partially working | F1 (double-create), F7 (idle duplicates attach blank) | U3, F4 (dedupe keyed on constructed URLs) |
| Crossed wires between instances/sessions | F2 (forced detach leaves stale terminal), F3 (stale lists under wrong instance), F6 (wrong-instance launch) | F4 |
| Failed connections | F7/F9 (blank ≠ failed, but presents as failed), F1 leftovers, #500-class attach misses | F10 |
| State lost changing screens/streams | F2, F3 (selection jumps) | F5 (all state is one shared mutable slot) |
| Background sessions invisible (target-UX gap) | F5 | F8, U2 |

## Part 4 — Recommended sequencing

1. **Stop the bleeding** (small diffs, high yield): F1 (deterministic
   `session_name` + no fallback-on-timeout), F2 (scope auto-detach to owning
   instance), F6 (no `candidates[0]` fallback).
2. **Identity + races**: F4 (`(instance_id, session_id)` identity), F3 (request
   tokens, selection pinning), F10 (cache/scheduler).
3. **Attach fidelity**: F7 + F9 (tail replay / snapshot paint, first-frame
   deadline, honest "no output yet" status), F8 (hide dead fields).
4. **Target UX architecture**: F5 session-registry store + background monitoring
   (response-needed, liveness, unread badges, snapshot previews) — pairs with
   upstream U2/U4; U1 needed before "Take Control" can be truthful.

## Part 5 — Resolution log (2026-07-07)

All Cockpit findings were resolved during a UAT-driven stabilization pass;
executor-side causes were filed as agentic-sandbox issues. Commits are on
`roctinam/aiwg` `main` (delivery mode: direct).

| Finding | Resolution | Ref |
|---|---|---|
| F1 duplicate sessions | deterministic `session_name` + no fallback-on-timeout (#1738); then a per-request nonce so multiple concurrent sessions per instance are supported instead of silently reused | `be8a311dc` |
| F2 forced detach on browse | per-session persistent terminals — switching instances/sessions no longer detaches the live session | `15480b72a` |
| F3 stale list under wrong instance | clear `sessions` immediately on instance switch; request-token race guard | `be8a311dc` |
| F4 `attach_url` as identity | `(instance_id, session_id)` identity via the v2 SessionEntry schema | v2-schema pass |
| F5 single global terminal | **per-session persistent terminals + session registry — the target-UX architecture** (see ADR) | `15480b72a` (#1749) |
| F6 wrong-instance launch | no `candidates[0]` fallback; terminal-state fast-fail in the readiness wait | launch pass |
| F7 blank terminal / no keyframe | keyframe-on-deadline (#1746); persistent terminals keep the screen painted across switches (no "press enter") | `15480b72a` |
| F8 dead viewer/controller fields | v2 `membership`/`liveness` consumed directly (no translators) | v2-schema pass |
| F9 readiness retry breadth | readiness-retry lifecycle preserved per connection | `15480b72a` |
| F10 polling storm / 404 flood | stop polling a session's `/screen` after its first 404; `apiRaw` non-throwing | `be8a311dc` |

### Additional findings surfaced during live UAT (not in the original static audit)

| Area | Finding | Resolution | Ref |
|---|---|---|---|
| Host runtime | `agent-client` dialed the plaintext gRPC port for mTLS enrollment; the binary was also absent from PATH | route the host supervisor's management endpoint to the mTLS listener; set TLS server name to the cert's name; build+install `agent-client` | agentic-sandbox #609 (`38b4f9b`) |
| Container | bootstrap-enrollment HTTP bound the loopback IP, unreachable from Docker via `host.docker.internal` | `AGENTIC_HTTP_LISTEN_IP` widens the HTTP bind | agentic-sandbox #610 (`38b4f9b`) |
| Host sessions | host PTY sessions absent from the session-list API (regression vs closed #500) | Cockpit nav merges the attached session; executor fix filed | aiwg `5621c11ed` / agentic-sandbox #611 |
| VM | libvirtd hung by heavy `full-suite` VM provisions; static `.ip-registry` exhausted (201-254) because destroy never releases IPs | killed the stuck provisions + restarted libvirtd + cleared the stale registry; IP/CID leak folded into the destroy-cleanup issue | agentic-sandbox #607, #608 |
| Launch UX | launch modal blocked ~150s on the readiness wait (greyed "Working…") | switch to Sessions and run the wait+attach in the background | `f93f0eb07` |
| Start-session UX | `busy` flag was cleared only on failure, leaving the Start button permanently disabled until a page refresh | reset on modal open and on success | `be8a311dc` |
| Inventory | tab did not auto-refresh; instances launched after mount were invisible | poll + app-wide `refreshTick` | prior pass |

**Operational guidance captured:** the `full-suite` loadout (all 9 providers ×
6 frameworks) is unsuitable for a VM — its install hangs libvirtd. Use `basic`
or `claude-only` for VM targets.

**Net state:** host + Docker + VM (basic loadout) all provision, enroll, attach,
and stream; multiple concurrent sessions per instance; switching preserves each
session's scrollback and live prompt. Open executor items: agentic-sandbox #607,
#608, #611 (filed with root-cause analysis and fix plans).

## Provenance

- Derived from: `apps/cockpit/web/src/useSession.ts`, `web/src/components/Sessions.tsx`,
  `web/src/components/StartSessionModal.tsx`, `web/src/App.tsx`,
  `bridge/src/server.mjs` (working tree, 2026-07-06);
  agentic-sandbox `management/src/http/sessions.rs`,
  `management/src/session/registry.rs`, `management/src/ws/connection.rs`,
  `docs/SESSION_ARCHITECTURE.md`, `docs/task-run-lifecycle.md` (at `4dc2273`).
- Operator answers captured interactively 2026-07-06 (topology, symptom scoping,
  target UX, deliverable form).
- Related: aiwg epics #1633 / #1588; aiwg #1669, #1670, #1671; agentic-sandbox
  #499, #500, #501.
