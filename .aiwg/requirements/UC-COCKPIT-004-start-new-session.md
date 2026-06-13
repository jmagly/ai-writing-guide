# UC-COCKPIT-004: Start a New Session on a Chosen Stack

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Solo power user, Researcher, Newcomer
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/intake/cockpit-intake.md §In-scope (c)

## Reasoning

1. **Problem analysis**: To start a session today the operator opens the right provider's UI/CLI directly; there is no unified "start a session on stack X" affordance that lands the operator in a Cockpit-watchable view.
2. **Constraint identification**: Cockpit must start the session through the provider's own programmatic surface via the `serve` stack-adapter / executor-registry seam — it must produce a *native* session, not a forked or wrapped one (non-nerf invariant).
3. **Alternative consideration**: (a) spawn a raw provider process Cockpit owns (risks divergence from native behavior); (b) request a session through the serve stack-adapter so the executor is registered and the session retains full native capability (chosen); (c) only deep-link to the provider UI (loses the unified watch view).
4. **Decision rationale**: Routing through the stack-adapter/executor-registry yields a registered, observable, fully-native session — the only option that satisfies both "watchable in Cockpit" and "non-nerf."
5. **Risk assessment**: Starting a session has blast radius (mitigated: confirm + authorization gate for the start, audit entry); provider not attach-capable (mitigated: start anyway as observe-only and flag the limitation — see inception flag); auth handled per-stack (mitigated: Cockpit delegates to the stack's native auth, stores no provider credentials).

## Primary Actor

Operator choosing a stack and starting a fresh session.

## Goal

Start a new, fully-native agent session on a chosen provider stack from Cockpit, and land in a live view of it, without leaving the unified surface.

## Preconditions

- Cockpit launched; the chosen provider is configured/available (`aiwg runtime-info`).
- The serve executor-registry / stack-adapter is reachable.

## Main Success Scenario

1. Operator clicks "Start session" and chooses a target stack from the configured providers.
2. Cockpit optionally collects a starting prompt/task and any per-stack options the adapter exposes.
3. Cockpit shows a confirm step (authorization gate) summarizing what will start, on which stack.
4. On confirm, Cockpit requests a session through the stack-adapter; the executor registers in the executor-registry.
5. Cockpit writes a `start`/`create` `activity-log` entry and lands the operator in the live session view, streaming output.
6. The new session appears in the Running panel (UC-COCKPIT-002).

## Alternative Flows

**A1 — Multiple concurrent starts**: Operator starts a second/third session on different stacks; each registers independently and appears side-by-side (feeds UC-COCKPIT-006).

**A2 — Provider observe-only**: If the provider exposes no attach/drive interface, the session starts and is observable but flagged observe-only.

## Exception Flows

**E1 — Start rejected by adapter**: Cockpit surfaces the reframed reason + remediation; no executor is registered; workspace unchanged.

**E2 — Auth required by the stack**: Cockpit defers to the stack's native auth flow; Cockpit never captures or stores provider bearer tokens in UI state (token-security).

## Postconditions

- A new native session is running, registered in the executor-registry, visible in the Running panel and the live view.
- An `activity-log` entry records the start; no provider credentials were stored by Cockpit.

## Acceptance Criteria

- [ ] Operator can start a session on any configured provider from one affordance and land in a live, streaming view.
- [ ] The session is started through the serve stack-adapter / executor-registry and registers there; it is a native session with full provider capability retained (non-nerf).
- [ ] A confirm/authorization step precedes the start; the start is recorded as an `activity-log` entry.
- [ ] Concurrent starts on different stacks each register independently (A1).
- [ ] Observe-only providers start and are flagged (A2); attach-incapable providers do not block the start.
- [ ] No provider bearer token is held in Cockpit UI state at any point (E2 / token-security).
- [ ] A rejected start (E1) registers no executor and leaves the workspace unchanged.
