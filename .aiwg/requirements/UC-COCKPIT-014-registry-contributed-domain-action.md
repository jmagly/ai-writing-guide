# UC-COCKPIT-014: Invoke a Registry-Contributed Domain Action from the UI (SDLC Issue Management)

**Phase**: Inception
**Priority**: P1
**Status**: Draft
**Persona**: Dev team lead, Solo power user, Ops/fleet operator
**Related**: @.aiwg/architecture/adr-cockpit-ui-extensibility-contribution-model.md, @.aiwg/architecture/adr-cockpit-ui-cli-extension-binding.md, @.aiwg/management/cockpit-vision.md, skills: `issue-audit`, `address-issues`

## Reasoning

1. **Problem analysis**: Dev teams manage issues today via the CLI (`issue-audit`, `address-issues`) — friction for those who don't live in the terminal. The SDLC framework should contribute a UI surface so these are simple buttons/event hooks, not memorized commands.
2. **Constraint identification**: The contributed action must resolve through the registry/core (binding ADR) — a button is a rendering of the same skill the CLI runs; it inherits human-authorization + HITL gates and is audited. It must not be a privilege side-door.
3. **Alternative consideration**: (a) CLI-only (status quo friction); (b) bespoke hardcoded SDLC screen in Cockpit core (doesn't scale across frameworks); (c) the SDLC framework *contributes* an issue board + action buttons via the UI contribution model (chosen — scales to every framework).
4. **Decision rationale**: A contributed surface makes domain work easy-first while keeping CLI-parity and security structural.
5. **Risk assessment**: contributed-UI trust (mitigated: first-party SDLC pack trusted; third-party sandboxed + Adoption Gate — X10); action mis-fire (mitigated: confirm + blast-radius for mutating actions per human-authorization).

## Primary Actor

A dev team member managing issues through the Cockpit (without the CLI).

## Goal

Run SDLC issue operations (`issue-audit`, `address-issues`) as one-click actions / event hooks on a contributed issue board in the UI, with the same behavior, gates, and audit as the CLI.

## Preconditions

- Cockpit installed (opt-in package); the SDLC framework deployed (contributes the issue board + action contributions); an issue tracker configured (`remotes.issue_tracker`).

## Main Success Scenario

1. Operator opens the **Issues** screen (a screen *contributed* by the SDLC framework, not Cockpit core).
2. The board lists open issues (data-driven from the tracker via the registry capability).
3. Operator clicks **Audit** on the backlog → Cockpit invokes the `issue-audit` capability through the registry/core; the read-only audit renders in a panel.
4. Operator clicks **Address** on an issue → Cockpit invokes `address-issues` for that issue; because it mutates, a confirm shows the action + blast radius (human-authorization); on confirm it runs through core and streams progress.
5. Actions are recorded in `activity-log` with provenance (`operator` via the SDLC contribution).

## Alternative Flows

**A1 — Event hook**: instead of a button, a contributed hook fires `issue-audit` on a schedule/event and surfaces results as a Cockpit notification.
**A2 — CLI equivalent shown**: each action exposes its `aiwg`/skill CLI equivalent (easy-first, advanced-by-terminal).
**A3 — Third-party contribution**: a non-first-party domain board runs sandboxed (CSP/display-scope) and passed the Adoption Gate before appearing.

## Exception Flows

**E1 — SDLC pack not installed**: the Issues screen simply isn't present; core Cockpit is unaffected (additive contributions).
**E2 — Capability fails**: the failure surfaces truthfully (no false success); the underlying skill's recovery applies.

## Postconditions

- The contributed action ran via the same registry capability as the CLI; behavior/gates/audit identical to CLI invocation; no privilege escalation through the UI.

## Acceptance Criteria

- [ ] The Issues screen and its Audit/Address actions are *contributed by the SDLC framework* via the UI contribution model — not hardcoded in Cockpit core.
- [ ] Clicking an action invokes the same registry capability (`issue-audit` / `address-issues`) the CLI uses; mutating actions require a confirm with blast radius (human-authorization).
- [ ] Each action shows its CLI equivalent (A2); an event-hook form is supported (A1).
- [ ] With the SDLC pack absent (E1), core Cockpit is unaffected; contributions are additive.
- [ ] Third-party domain contributions (A3) run sandboxed and passed the Adoption Gate; actions cannot bypass core gates.
- [ ] Every contributed action is audited with provenance.
