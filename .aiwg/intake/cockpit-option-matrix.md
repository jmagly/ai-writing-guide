# Option Matrix (Project Context & Intent) — AIWG Cockpit

**Purpose**: Capture what AIWG Cockpit IS — its nature, audience, constraints, and intent — to right-size SDLC application and frame the key decisions for inception/elaboration.

---

## Step 1: Project Reality

**Project Description:**
> AIWG Cockpit is a helpful, friendly, single-screen control plane (web UI the operator launches locally) for AIWG. It shows what's installed, what's deployed and running, and lets the user start/attach to live agent sessions. It is for developers/ops/researchers who run one or more agentic stacks (Claude Code, Codex, Cursor, Factory, Warp, etc.). It runs on the operator's own machine, sitting on top of — not replacing — the existing provider UIs and the AIWG CLI, and lets multiple stacks run and coordinate at once.

### Audience & Scale
- Who uses this: **Just me / small team** (single operator per install in v1; small-team multi-stack operators).
- Technical sophistication: **Mixed** — power users AND newcomers (the friendly home screen is for the latter).
- Risk tolerance: **Expects stability** for the underlying stacks (Cockpit must not destabilize them).
- Support expectations: **Self-service** (OSS tool), best-effort community.
- Usage scale: 1 operator, **N concurrent agentic stacks** (target ≥3, design for ~10). Local, not multi-tenant.

## Step 2: Constraints
- Reuse AIWG's existing substrate (serve executor-registry / #1546, Mission Control, daemon/concierge, MCP server, activity-log, `resolveStorage`) — no new backend.
- Cross-platform (Linux/macOS/Windows).
- No required cloud infra in v1; no spend added (surface cost/quota via #1187, don't generate it).
- Must not regress any provider's native capabilities (capability-parity gate).

## Step 3: Priorities (ranked)
1. **Non-nerf / overlay isolation** — augment, never replace; never destabilize a running stack.
2. **Simplicity & friendliness** — newcomer can reach a live session in <3 min, no CLI memorization.
3. **Multi-stack concurrency + new coordination** — the standout differentiator.
4. **Security of the control surface** — session control + mission dispatch are high blast-radius.
5. Maintainability across provider/CLI evolution (adapter seam = serve executor-registry).

## Step 4: Intent / decisions to make

### Naming (open)
| Candidate | Note |
|---|---|
| **AIWG Cockpit** (working) | Friendly, evokes piloting multiple stacks |
| AIWG Console | Generic, clear |
| AIWG Bridge | "Coordination bridge" across stacks |
| AIWG Deck / Command Deck | Operator-deck framing |
| (Mission Control) | **Avoid** — already the `aiwg mc` background CLI; would collide |

### Architecture decisions deferred to elaboration (ADRs)
1. **Overlay vs. fork integration model** — how Cockpit observes/drives each stack without replacing it (leaning: serve executor-registry + MCP + CLI probes; never fork the provider session).
2. **Cross-stack coordination mechanism** — context/result handoff + unified Mission dispatch over heterogeneous workers (builds on #1546).
3. **Session attach/proxy model** — how a user "re-enters" a running session from the UI without hijacking it.
4. **UI stack** — web framework + local-server shell (candidates: React/Next + a thin local Node/serve bridge; Tauri for a desktop shell; SvelteKit). Decide in ADR.
5. **Relationship to daemon/concierge + Mission Control CLI** — GUI front-end over the existing substrate (leaning) vs. peer vs. superset.
6. **Marketplace UX-agent sourcing** — criteria + which agents to adopt (Claude marketplace + AIWG's Product Designer/UX Lead/Frontend Specialist/Accessibility Specialist).
7. **Unified HITL approval inbox** — surfacing cross-stack approval gates (#1565/#1567) in the UI.

### Uncertainty / to validate in inception
- Exact set of "new coordination" actions that are first-class (target ≥3 that are impossible/painful today).
- Which providers expose a programmatic session interface usable for attach vs. observe-only.
- Whether v1 ships responsive-web only (native deferred).

## Right-sizing verdict
Meets ≥2 formal-intake triggers (new deployable product, multi-component, cross-stakeholder, multi-phase, explicit operator request) → **full intake → inception → elaboration track is warranted.** Bounded at the ABM gate for this engagement.
