# AIWG Cockpit — Vision

**Phase**: Inception
**Status**: Draft
**Track**: SDLC intake → elaboration (bounded at ABM gate)
**Date**: 2026-06-13
**Related**: @.aiwg/intake/cockpit-intake.md, @.aiwg/intake/cockpit-solution-profile.md, @.aiwg/intake/cockpit-option-matrix.md

## Reasoning

1. **Problem analysis**: AIWG's power is real but its operator surface is scattered — the terminal CLI (`aiwg status`, `aiwg mc`, `aiwg ralph`, `aiwg discover`), one bespoke session UI per provider stack, config files, and background daemons. To answer "what is AIWG, what's deployed, what's running, and how do I jump into a session," an operator must hold many disjoint mental models and recall many verbs. Newcomers stall at the CLI; multi-stack operators tab-switch between provider windows with no shared view.
2. **Constraint identification**: The non-negotiable is *overlay, not replacement*. The underlying provider stacks (Claude Code, Codex, Cursor, Factory, Warp, OpenCode, Windsurf, OpenClaw, Hermes, OpenHuman, Omnius) keep their full native capability and native feel. Cockpit must reuse AIWG's existing substrate (the `serve` executor-registry / #1546 cross-stack Missions, Mission Control, daemon/concierge, MCP server, `activity-log`, `resolveStorage`) — no new backend, no new agent runtime, no required cloud infra. v1 is local and single-operator.
3. **Alternative consideration**: (a) Do nothing — keep the fragmented CLI surface (fails the newcomer KPI and the multi-stack-concurrency KPI); (b) replace each provider UI with a unified front-end (violates the non-nerf invariant, doubles maintenance, alienates power users); (c) build a thin observe/drive overlay over existing programmatic surfaces (chosen — preserves native capability, reuses substrate, delivers the coordination differentiator).
4. **Decision rationale**: The overlay model is the only one that satisfies all five ranked priorities from the option matrix simultaneously — non-nerf/isolation, friendliness, multi-stack coordination, control-surface security, and maintainability through the executor-registry adapter seam.
5. **Risk assessment**: The standout risks are control-surface blast radius (mitigated by inheriting human-authorization + token-security + HITL gates), overlay isolation breach (a Cockpit crash must never crash a running stack — hard invariant), and capability regression (the non-nerf parity checklist is a gate criterion, not a nice-to-have). These flow into the risk register and NFR module.

## Problem Statement

AIWG is a deployment-and-orchestration utility spanning ten-plus agentic provider stacks and a deep utility layer (Ralph loops, Mission Control, daemon, serve executors, MCP). The capability exists; the *cockpit* does not. Today an operator who runs more than one stack — or who has just installed AIWG and wants to start — has no single, friendly place to see install/inventory health, see what is deployed and what is actively running, and start, attach to, or coordinate live sessions. The cost is borne three ways: newcomers never reach a first session, multi-stack operators lose context across windows, and cross-stack coordination that *should* be possible (hand a result from one stack to another, dispatch one Mission over heterogeneous workers, approve gates in one inbox) is impossible or painful because no surface spans the stacks.

## Vision Statement

**AIWG Cockpit is the single, friendly, local control plane for everything AIWG runs.** It sits *on top of* — never in place of — the provider stacks and the AIWG CLI, giving one operator one screen to see their install, watch and control every deployed and running agent, and start, re-enter, and coordinate live sessions across multiple stacks at once. It turns AIWG's scattered surface into a coherent cockpit while leaving every underlying tool exactly as powerful and as native as it was before Cockpit attached.

## Target Personas

Drawn directly from the intake:

| Persona | Context | What Cockpit gives them |
|---|---|---|
| **Solo power user (multi-stack)** | Runs Claude Code + Codex + a Ralph loop simultaneously | One dashboard to watch all three, hand a result from one to another, pause/resume/attach any |
| **Ops / fleet operator** | Manages a small swarm of agentic bots | Live status, cost/quota at a glance, a single approval inbox for HITL gates spanning stacks |
| **Newcomer ("just installed AIWG")** | Mixed technical sophistication, no CLI fluency | A friendly home screen showing what's installed, what each provider can do, and guided "start a session" / "deploy a framework" buttons — no verb memorization |
| **Researcher / long-running tasks** | Launches work and walks away | Launch a Mission, leave, re-attach to a running session from anywhere in the UI |

## Standout Differentiators

### 1. Overlay, not replacement (the non-nerf guarantee)

Cockpit observes and drives provider stacks through their *existing* programmatic surfaces — the `serve` executor-registry (#1546), MCP, the AIWG CLI probes, and the daemon — and never forks, wraps-over, or alters a provider's native session. Every action available in a provider's own UI or CLI remains available and unaltered while Cockpit is attached. This is enforced as a per-provider capability-parity checklist and treated as a release gate, not a feature.

### 2. Multi-stack concurrency on one screen

A single operator monitors and controls **≥3 concurrent agentic stacks** (designed for ~10) from one view, with per-stack pause/resume/attach. No provider UI does this; the CLI does it only as disjoint commands across windows.

### 3. New cross-stack coordination actions (first-class, impossible/painful today)

These are the heart of the differentiator. Each is impossible or painful with the provider UIs and CLI as they exist:

- **Cross-stack context/result handoff** — take the *result* of a Claude Code session (a diff, a finding, a generated artifact) and hand it as the *input/context* of a Codex session (or any other stack) in one operator gesture. Today this requires manual copy-paste between provider windows with no audit link. Cockpit records the handoff as a single linked `activity-log` entry connecting the two sessions.
- **Unified Mission dispatch over heterogeneous workers** — dispatch one AIWG Mission whose workers span *different* stacks (e.g., a Codex worker for one subtask, a Claude Code worker for another), conducted by AIWG's cross-stack Mission conductor (#1546, `serve/mission-conductor.ts` + `stack-adapters.ts`). Today Mission Control fans out but the operator cannot see or steer the heterogeneous fan-out from one surface.
- **Unified HITL approval inbox across stacks** — one inbox surfacing every pending human-in-the-loop approval gate from every running stack and Mission (#1565 / #1567), so the operator approves/rejects in one place instead of hunting per-provider prompts. Today an approval gate raised in a Codex session is invisible to someone watching the Claude Code window.

A fourth coordination capability that falls out naturally: a **single audit timeline** (`activity-log` on disk) that interleaves every Cockpit-initiated action across all stacks, surviving UI restarts.

## Strategic Posture: UX-First, CLI-Always (front with the experience)

Going forward, **the UX is the front door.** For our users, the experience is *easy-first*: the GUI is the default, guided path. The CLI is **always** supported — fully, never nerfed or deprecated — and is the path advanced users reach for when they want it. We lead with the Cockpit; we keep the terminal.

This sharpens, rather than contradicts, the overlay model:

- **Default front door = Cockpit UX.** A new user's first contact is the friendly UI, not a verb list. Every common action (start a session, deploy, attach, approve, coordinate) is reachable without touching a terminal.
- **CLI parity is permanent.** Everything doable in the UI remains doable from the CLI; the CLI is never reduced to make the UI look necessary. (This is the inward-facing twin of the non-nerf guarantee — we don't nerf *our own* CLI either.)
- **Advanced-by-terminal is a feature, not a fallback.** Power users drop to `aiwg …` deliberately; the UI surfaces the equivalent command where helpful so the two reinforce each other (cf. `cli-secondary` — the UI drives, the CLI executes underneath).
- **Minimal ramp is a first-class goal.** Time from "I want to try AIWG" to "I'm in the Cockpit watching a session" must be as short as the platform allows — which makes *distribution and install* a product concern, not an afterthought (see distribution KPI below and `adr-cockpit-distribution-packaging`).

## Success Criteria (KPIs)

Pulled from the intake's Success Metrics; each is measurable and is the parent of acceptance criteria in the use cases and NFR module.

| KPI | Target | Measured by |
|---|---|---|
| **Time-to-first-session (newcomer)** | "installed AIWG" → "watching a live agent session in Cockpit" in **< 3 minutes**, no CLI memorization | Timed cold-start walkthrough (UC-COCKPIT-003) |
| **Multi-stack concurrency** | Monitor + control **≥3 concurrent stacks** on one screen with per-stack pause/resume/attach (design for ~10) | Concurrency scenario test (UC-COCKPIT-006) |
| **Coordination value** | **≥3** cross-stack coordination actions are first-class: handoff, unified Mission dispatch, unified HITL inbox | Feature presence + walkthrough (UC-COCKPIT-007/008/009) |
| **Non-nerf guarantee** | **0** native-capability regressions per provider when Cockpit is attached | Per-provider capability-parity checklist (NFR-COCK-PARITY-001) |
| **Overlay isolation** | A Cockpit crash causes **0** crashes/corruptions of any underlying running stack; attach/detach is non-destructive | Fault-injection test (NFR-COCK-ISO-001) |
| **Minimal install ramp** | "decide to try AIWG" → "Cockpit open + first session live" in **≤ 5 minutes** on a clean machine, via a single guided installer on the user's platform (not just `npm i -g`) | Cold-machine install walkthrough per target (UC-COCKPIT-013) |
| **CLI parity** | **100%** of Cockpit user-actions have a documented CLI equivalent; **0** CLI capabilities removed to favor the UI | CLI-parity checklist (NFR-COCKPIT-09) |
| **Adoption signal** | ≥ target% of surveyed users prefer Cockpit as default entry point within one release post-GA | Post-GA user survey (target % set at GA in a later track) |

## Non-Goals (explicit)

- **Not** a replacement for any provider's native UI or the AIWG CLI. Cockpit augments; it is an anti-goal to fork or nerf them — **including our own CLI**, which stays at full capability and is never deprecated in favor of the UI.
- **Not** a hosted multi-tenant SaaS control plane. v1 is local and operator-owned; multi-tenant is deferred.
- **Not** a new agent runtime. Cockpit orchestrates existing stacks; it is not itself a coding agent and ships no new model-driving loop.
- **Not** a cost generator. Cockpit *surfaces* cost/quota (#1187); it never adds spend or introduces a billing backend.
- **Not** a new persistence layer. Cockpit reuses `resolveStorage` and `activity-log`; no new database.
- **Not** native mobile apps in v1. Responsive web is acceptable; native is deferred.
- **Not** construction. This track stops at the ABM (elaboration) gate — no implementation, iteration plan, or construction prep here.

## Solution Profile Anchor

Per @.aiwg/intake/cockpit-solution-profile.md: base profile **MVP** with **security tailored to Production** (threat model, authorization gates, no-secrets-in-UI, unified audit). Reliability sits at MVP+ with overlay isolation as a hard invariant. Process is MVP with full traceability on the security-sensitive paths (session control, Mission dispatch) and lighter rigor for cosmetic UI.
