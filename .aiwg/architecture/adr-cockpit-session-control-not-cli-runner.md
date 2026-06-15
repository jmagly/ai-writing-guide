# ADR: The Cockpit is a session-control surface, not a CLI runner

**Status**: Accepted
**Date**: 2026-06-14
**Epic**: roctinam/aiwg#1588
**Supersedes**: the action-execution model in increment E (`run.aiwg` — Bridge spawns `aiwg`)

## Context

The first cut of the Cockpit's Actions/contribution model had buttons resolve to an
`aiwg` argv that the **Bridge** executed directly (`run.aiwg: ["show","skill","issue-audit"]`,
spawned via `child_process`). This inverts how AIWG works.

**AIWG's execution model**: humans do not run the CLI to do work — *agents* do. The CLI
is the agent's tool, invoked from inside an agentic session that already carries the
wiring (skills, rules, context, CLI access). A person clicking "Address Issues" is not
asking the control plane to run `aiwg`; they are asking an **agent** to address issues,
and the agent will use the CLI as it sees fit.

## Decision

**The Cockpit is a control surface over agentic sessions. It never runs `aiwg` to perform
work.** Its responsibilities are:

1. **Observe** sessions (the pty stream) and instance/running state.
2. **Drive** sessions — inject commands/prompts into a session's input.
3. **Manage** the substrate — instances (lifecycle), approvals routing, cost — by talking
   to the executor/agentic-sandbox, not the CLI.

**Action buttons inject a command into an agentic session**, they do not execute the CLI:

- A contributed action declares `inject: { command, target: "focused" | "new", needs_args? }`.
- Clicking it sends `command` into a session's input — the **focused/attached** session if
  there is one, otherwise it offers to start a **new** session and injects there.
- The agent in that session receives the command and does the work, using the CLI as needed.

So the **Actions surface targets the Sessions surface**. "Run an action" = "drop a command
into a session and watch the agent execute it."

### What the Bridge MAY source directly (not execution — display)

Read-only **catalog data** — "what skills/agents/commands exist," for browsing and the
capability picker — is display, not agent work. The Bridge may serve it (from the AIWG
registry/index, and from the user's own on-disk asset library). Browsing the catalog is
not "using the CLI to do work." **Anything that *does* work goes through a session.**

### Asset realms

- **AIWG catalog** — read-only. Browse/search; never edited by the Cockpit.
- **User library** — the user's copied/cloned/imported assets, in project-local bundle
  dirs on disk. The Cockpit manages these (never overwriting AIWG install files).
- **Using/deploying** an asset into a project is an **agent action** (inject a command),
  not a Bridge file-run.

## Consequences

- The contribution schema changes: `run.aiwg` → `inject`. The Bridge's
  `POST /api/actions/:id/run` (spawn-aiwg) is **removed**.
- The Bridge keeps no agent-work execution path. Its only `child_process`/CLI use is
  sourcing read-only catalog data for display, and even that is a display concern, not
  agent work.
- The parity story strengthens: the agent is the one and only thing that runs AIWG; the
  UI is a window onto agents. CLI-first is preserved because the *agent* is CLI-first.
- Updates the ABM gate's T-PAR-01 framing accordingly.

## References
- `.aiwg/reports/cockpit-abm-gate.md` (T-PAR-01 updated)
- `apps/cockpit/contrib/contribution.schema.json` (`inject` spec)
- Increment E (superseded action-execution model)
