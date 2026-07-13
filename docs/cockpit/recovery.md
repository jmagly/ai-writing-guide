# Cockpit Recovery

Runtimes and agents fail independently: a container or VM can be perfectly
healthy while its agent's registration with the executor has dropped (idle
transport drops, executor restarts, soft-locks). Cockpit's recovery surface is
built around that distinction.

## Stale agents: `agent unreachable`

When a runtime is **running** but its agent is not registered (or its session
backends report unavailable), Inventory and Sessions keep the row visible with
the health state **`agent unreachable`** instead of hiding it — and expose
**Reconnect**.

Reconnect is rendered for running rows of runtime kind
`docker`, `container`, `vm`, `qemu`, or `kvm` whose agent is missing. Host
targets are deliberately excluded from the button (see
[Host runtimes](#host-runtimes) below).

A Reconnect never creates a replacement instance and never destroys the
running runtime — it only attempts to restore the missing agent registration.

## What the Bridge tries, in order

`POST /api/instances/:id/reconnect` walks three paths:

1. **Executor-owned reconnect** — the sandbox's own reconnect endpoints
   (v2 admin first, then legacy candidates). If the executor handles it, done.
2. **Docker/container fallback** — `docker exec <container> agent-reconnect`,
   which SIGHUPs the in-container agent so it re-registers in place without
   restarting the container. Requires sandbox images that ship the
   `agent-reconnect` helper (agentic-sandbox v2026.7.5+); on failure the
   response says to repull/rebuild the image.
3. **VM fallback** (new in 2026.7, roctinam/aiwg#1778) — for `vm`/`qemu`/`kvm`
   instances the Bridge delivers the same SIGHUP **through the libvirt
   guest-agent channel**:

   ```text
   virsh qemu-agent-command <domain> guest-exec  →  pkill -HUP -x agent-client
   ```

   The sandbox VM images bake qemu-guest-agent for exactly this kind of
   in-guest exec, and the agent handles SIGHUP as reconnect-in-place on every
   runtime, so no VM image change is needed. The libvirt domain name is the
   instance's launch name. Requirements: the Bridge host needs `virsh` access
   to the domain, and the guest-agent channel must be up — a 502 names
   whichever is missing.

If none of the paths apply, the 409 response spells out the manual host-side
command (`pkill -HUP -x agent-client`).

## What survives a reconnect

**Session survival depends on the agent version inside the runtime, not on
Cockpit:**

- **agentic-sandbox 2026.7.8+ agents**: transport reconnect is
  state-preserving — the agent no longer kills tracked workloads on stream
  loss, all session types (managed multiplexer *and* direct pty / headless
  tasks) survive, and output produced while disconnected buffers and flushes
  after re-register. Server-side reconcile is the sole kill authority.
- **Older agents** (pre-2026.7.8): only sessions backed by a **detached
  multiplexer** (managed tmux) survive and are re-adopted; the agent
  SIGTERMs everything else as part of its reconnect cycle. This was the
  root cause chain fixed upstream in agentic-sandbox#633 (VM idle drop) and
  agentic-sandbox#634 (kill-on-reconnect).

A VM keeps its baked agent binary until the image is rebuilt or the VM is
reprovisioned — so a running fleet can mix both behaviors. If sessions
vanish after a reconnect, check the agent version in that runtime before
suspecting Cockpit. On older agents, prefer **managed** session backends for
long-running work.

After a successful reconnect: refresh Inventory, then attach from Sessions.

## Host runtimes

Host targets don't get a Reconnect button — the agent runs directly on the
Bridge host, so the recovery lever is the host-runtime daemon itself. Start
Cockpit with the daemon when working host targets:

```bash
AIWG_COCKPIT_START_HOST_DAEMON=1 npm run cockpit:up
```

The Inventory host-daemon column shows the daemon's status and the documented
operator command when action is needed; Cockpit never starts or installs the
daemon silently. Manual agent recovery on a host is
`pkill -HUP -x agent-client`.

## Destroy

`DELETE /api/instances/:id` is defensive about executor/runtime state skew:

- Tries the executor's v2 and legacy destroy surfaces.
- For Docker rows, reconciles with `docker rm -f <name>` even after admin
  success (current sandbox builds can list Docker rows the lifecycle verbs
  don't know), and falls back to it when the admin surface returns
  instance-not-found.
- An already-removed target reports success with an `already_gone` marker
  instead of failing the operator's intent.
- A stopped Docker row's Destroy removes the container directly — the UI
  tooltip says so before you click.

## Audit

Every recovery action lands in the local audit log:
`instance.reconnect.requested`, `instance.destroy.requested`, with targets
and results (secrets redacted). See
[Trust & Security → Audit log](./trust-and-security.md#audit-log).

## See also

- [Sessions](./sessions.md) — backends and what "managed" buys you
- upstream: roctinam/agentic-sandbox#633 (VM idle-drop root cause),
  roctinam/agentic-sandbox#634 (session survival across reconnect)
