# UC-COCKPIT-003: Newcomer Guided Start

**Phase**: Inception
**Priority**: P0
**Status**: Draft
**Persona**: Newcomer ("just installed AIWG")
**Related**: @.aiwg/management/cockpit-vision.md (KPI: time-to-first-session < 3 min), @.aiwg/intake/cockpit-intake.md §Target personas

## Reasoning

1. **Problem analysis**: A newcomer who just installed AIWG faces a wall of CLI verbs (`use`, `discover`, `ralph`, `mc`, status commands) with no obvious "press start." This is the single biggest adoption barrier and the headline KPI.
2. **Constraint identification**: The guided path must reach a *live, watchable* session in **< 3 minutes** with **no CLI memorization**, using only existing AIWG operations under the hood (deploy via `aiwg use`, start a session on a detected provider). No new runtime.
3. **Alternative consideration**: (a) link to docs (fails the 3-minute, no-memorization bar); (b) a one-screen guided flow: detect provider → optionally deploy a starter framework → start a session → land in the live session view (chosen); (c) auto-start with zero choices (too magical; violates human-authorization for the deploy step).
4. **Decision rationale**: A short, opinionated, fully-buttoned flow that asks only the minimum questions (which provider, optionally which framework) and confirms before any deploy satisfies friendliness, the 3-minute KPI, and human-authorization simultaneously.
5. **Risk assessment**: No provider configured (mitigated: detect via `aiwg runtime-info` and guide to configure one); deploy is a mutation (mitigated: explicit confirm step, surfaced as an authorization gate, with a dry-run preview); session fails to start (mitigated: clear reframed error + retry + fall back to a different provider).

## Primary Actor

Newcomer operator on first run of Cockpit.

## Goal

Go from "installed AIWG" to "watching a live agent session in Cockpit" in under three minutes, guided entirely by buttons and prompts — no CLI commands typed.

## Preconditions

- Cockpit launched.
- At least one provider configurable on the machine (detectable via `aiwg runtime-info`).

## Main Success Scenario

1. Cockpit detects first-run / not-engaged state and offers a "Get started" guided flow.
2. Step 1 — **Detect**: Cockpit runs `aiwg runtime-info` and shows the detected provider(s) and what each can do.
3. Step 2 — **Deploy (optional)**: Cockpit offers a starter framework/addon; if accepted, it shows a dry-run preview, gets explicit confirmation (authorization gate), then runs `aiwg use <starter>` and reports success.
4. Step 3 — **Start**: Cockpit offers a one-click "Start a session" on the chosen provider (delegates to UC-COCKPIT-004).
5. Step 4 — **Land**: Cockpit drops the operator into the live session view for the new session, streaming output.
6. The operator is watching a live agent session, having typed no CLI command.

## Alternative Flows

**A1 — No provider configured**: Cockpit explains and links a configure-provider step before continuing; does not dead-end.

**A2 — Skip deploy**: Operator declines the starter framework; flow proceeds directly to Start using an already-available provider.

**A3 — Returning user**: If already engaged, Cockpit skips the guided flow and lands on the home screen (UC-COCKPIT-001).

## Exception Flows

**E1 — Deploy fails**: Cockpit surfaces the reframed error + remediation, leaves the workspace unchanged where possible, and offers retry or skip-deploy.

**E2 — Session fails to start**: Cockpit reports the failure, offers retry, and offers a different provider, never leaving the operator on a blank screen.

## Postconditions

- A live session is running and visible in Cockpit (success), OR the operator is on a clear next-step screen (failure paths).
- If a starter framework was deployed, the registry reflects it (via `aiwg use`) and an `activity-log` entry was written.

## Acceptance Criteria

- [ ] A timed cold-start walkthrough from "installed AIWG, not engaged" to "watching a live session" completes in **< 3 minutes** with **zero CLI commands typed**.
- [ ] The flow is button/prompt-driven end to end; no step requires recalling a command verb.
- [ ] The deploy step shows a dry-run preview and requires explicit confirmation before mutating (authorization gate); declining skips deploy cleanly (A2).
- [ ] No-provider state (A1) and returning-user state (A3) are handled without dead-ends.
- [ ] Deploy failure (E1) and session-start failure (E2) leave the operator on a clear retry/alternative screen, never blank.
- [ ] All Cockpit interaction questions use the platform's native interaction surface where available, one decision at a time (native-ux-tools rule).
- [ ] The deploy step routes through the `use` skill/`aiwg use` path; it never hand-writes files into provider directories.
