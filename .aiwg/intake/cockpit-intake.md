# Project Intake Form

## Metadata

- Project name: `AIWG Cockpit` (working name — provisional; see option matrix §Naming)
- Requestor/owner: `Joseph Magly (AIWG maintainer)` — customer-demand driven
- Date: `2026-06-13`
- Track: SDLC intake → elaboration (sdlc-accelerate-driven; stops at ABM gate)
- Stakeholders: AIWG end users (developers/ops/researchers running one or more agentic stacks); AIWG maintainers; provider runtimes AIWG already integrates (Claude Code, Codex, Cursor, Factory, Warp, OpenCode, Windsurf, OpenClaw, Hermes, OpenHuman, Omnius); the existing AIWG orchestration substrate (Mission Control, daemon/concierge, ralph, serve executor-registry, MCP server)

## Problem and Outcomes

- **Problem statement:** AIWG is powerful but its surface is fragmented across the terminal CLI (`aiwg status`, `aiwg mc`, `aiwg ralph`, `aiwg discover`), per-provider session UIs (each agentic stack has its own), config files, and background daemons. To see "what is AIWG, what's deployed, what's running, and how do I jump into a session," a user must hold a mental model of many disjoint interfaces and remember many commands. Customers are asking for a **single, friendly, simple place** to manage their install, see and control deployed/running agents, and open or re-enter live sessions — *without* losing the power or native feel of the underlying tools they already use.
- **The differentiator (non-negotiable):** Cockpit does **not** replace or nerf existing interfaces. It is an **overlay / control plane** that sits *on top of* the provider stacks and the AIWG CLI, observing and coordinating them. A user can run **multiple agentic stacks concurrently** (e.g., a Claude Code session and a Codex session and a ralph loop) and Cockpit lets those stacks **coordinate in new ways** that none of them can do alone today (shared context handoff, cross-stack mission dispatch, unified audit, one operator driving many).
- **Target personas/scenarios:**
  - **Solo power user (multi-stack):** runs Claude Code + Codex + a ralph loop at once; wants one dashboard to watch all three, hand a result from one to another, and pause/resume any.
  - **Ops/fleet operator:** manages a small swarm of agentic bots; wants live status, cost/quota at a glance, and an approval inbox for HITL gates across stacks (ties to #1565).
  - **Newcomer / "just installed AIWG":** wants a friendly home screen that shows what's installed, what each provider can do, and a guided "start a session" / "deploy a framework" button instead of memorizing CLI verbs.
  - **Researcher / long-running tasks:** wants to launch a Mission, walk away, and re-attach to a running session from anywhere in the UI.
- **Success metrics (KPIs):**
  - Time-to-first-session for a new user: "installed AIWG" → "running and watching a live agent session in the Cockpit" under **3 minutes**, no CLI memorization.
  - Multi-stack concurrency: an operator can monitor and control **≥3 concurrent agentic stacks** from one screen with per-stack pause/resume/attach.
  - Coordination value: at least **3 cross-stack coordination actions** that are impossible/painful today are first-class (cross-stack handoff, unified mission dispatch, unified HITL approval inbox).
  - Non-nerf guarantee: **0** native-capability regressions — every action available in a provider's own UI/CLI remains available and unaltered when Cockpit is attached (measured by a capability-parity checklist per provider).
  - Adoption signal: ≥ X% of surveyed users prefer Cockpit as their default entry point within one release after GA (target set in inception).

## Scope and Constraints

- **In-scope:**
  - A unified UI ("Cockpit") that surfaces: (a) **install/inventory** (frameworks, addons, providers, versions, health — backed by `aiwg status --probe`, `aiwg doctor`, `aiwg list`); (b) **deployed/running agents** (what's deployed per provider + what is actively running: ralph loops, mc missions, daemon, serve executors); (c) **sessions** — start new, attach to, and re-enter running sessions across stacks.
  - **Overlay integration model**: read/observe/drive provider stacks through their existing programmatic surfaces (serve executor-registry / #1546 cross-stack Missions, MCP, CLI, daemon) — never fork or replace them.
  - **Cross-stack coordination layer**: context/result handoff between stacks, unified Mission dispatch over heterogeneous workers, a single audit timeline (activity-log), and a unified HITL approval inbox (#1565 / #1567).
  - **Marketplace UX-agent sourcing**: locate and integrate high-quality UX/design/frontend agents from the Claude agent marketplace + AIWG's own UX team (Product Designer, UX Lead, Frontend Specialist, Accessibility Specialist) to build the interface.
  - Artifact deliverables for THIS track: intake set, inception (vision, use cases, NFRs, risk register), elaboration (SAD + C4 diagrams, ADRs, test strategy, UX design notes). No code in this track.
- **Out-of-scope (for now / this track):**
  - Implementation/construction (this track stops at the ABM gate — elaboration only).
  - Replacing any provider's native UI or the AIWG CLI (explicitly anti-goal — Cockpit augments).
  - A hosted multi-tenant SaaS control plane (v1 is local/operator-owned; multi-tenant deferred).
  - Building new agent runtimes — Cockpit orchestrates existing stacks, it is not itself a coding agent.
  - Mobile-native apps (responsive web acceptable for v1; native deferred).
- **Timeframe:** Agent-oriented, not wall-clock (per no-time-estimates rule). Scope-unit + pass estimates land in the elaboration plan; this track produces the intake→elaboration artifact set.
- **Budget guardrails:** v1 runs locally on the operator's machine (no required cloud infra). Reuse AIWG's existing substrate (serve, mc, daemon, MCP, activity-log) rather than new backends. Honor per-key cost/quota surfacing (#1187) rather than adding spend.
- **Platforms and languages (preferences/constraints):**
  - UI: web-based (local server the operator launches), responsive; framework choice is an elaboration ADR (option matrix lists candidates).
  - Backend/bridge: extends AIWG's existing TypeScript core + `serve` executor contract + MCP; no new persistence layer beyond what `resolveStorage` already provides.
  - Must run cross-platform (Linux/macOS/Windows) consistent with AIWG.

## Non-Functional Preferences

- Security posture: `Strong` — Cockpit can start/attach sessions and dispatch missions across stacks; it inherits human-authorization, token-security, and the HITL-approval gates. No bearer tokens in UI state; session attach respects each stack's auth.
- Privacy & compliance: `Low` for AIWG itself (operator-owned, local); the UI must not exfiltrate session content or secrets to any external service.
- Reliability targets: a crashed Cockpit UI must **never** crash or corrupt an underlying running stack (overlay isolation); attach/detach is non-destructive; unified audit survives UI restarts (activity-log on disk).
- Scale expectations: single operator, one machine, **N concurrent stacks** (target ≥3, design for ~10). Not fleet-of-thousands in v1.
- Observability: `logs+metrics` — every Cockpit-initiated action writes an activity-log entry; live status via existing probes; cost/quota panel via #1187.
- Maintainability: `high` — the overlay must survive provider additions and AIWG CLI evolution via documented adapter points (the serve executor-registry is the seam).
- Portability: `portable` — Linux/macOS/Windows; ships through `aiwg use cockpit` (provisional).

## Open Questions (for inception/option-matrix)

- Final product name (working name "AIWG Cockpit").
- UI stack choice (web framework / desktop shell) — elaboration ADR.
- Relationship to the existing daemon/concierge and Mission Control CLI — is Cockpit a GUI front-end over them, a peer, or their superset? (Leaning: GUI over the existing substrate.)
- Which marketplace UX agents to adopt vs. AIWG's own UX team — sourcing criteria in elaboration.
