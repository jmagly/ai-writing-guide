# Stakeholder Register — AIWG Cockpit

| Stakeholder | Role in this product | Primary interest | Influence |
|---|---|---|---|
| AIWG maintainer (requestor) | Sponsor / product owner | Standout UX that drives adoption without fragmenting the ecosystem | High |
| Solo power user (multi-stack) | Primary user | Watch + control several stacks at once; cross-stack handoff | High |
| Ops / fleet operator | Primary user | Live status, cost/quota, unified HITL approval inbox | High |
| Newcomer ("just installed") | Primary user | Friendly home screen; reach a live session with no CLI memorization | High |
| Researcher / long-running tasks | User | Launch Missions, walk away, re-attach to running sessions | Medium |
| Provider runtimes (Claude Code, Codex, Cursor, Factory, Warp, OpenCode, Windsurf, OpenClaw, Hermes, OpenHuman, Omnius) | Integrated systems | Native capabilities preserved (non-nerf); stable programmatic surface | High (constraint) |
| AIWG substrate (serve executor-registry, Mission Control, daemon/concierge, MCP, activity-log) | Integration seam | Cockpit builds on these; must not bypass their gates/audit | High (constraint) |
| AIWG SDLC team agents (Requirements Analyst, Architecture Designer, Test Architect, Product Designer, UX Lead, Frontend Specialist, Accessibility Specialist, Security Architect) | Builders (this track + construction) | Clear, complete artifacts to design/build against | Medium |
| Claude agent marketplace UX agents | Sourced collaborators | License/quality/security fit for adoption | Medium |

## RACI (this track: intake → elaboration)
- **Responsible:** SDLC orchestrator (this session) + dispatched SDLC team agents.
- **Accountable:** AIWG maintainer (sponsor).
- **Consulted:** UX team, Security Architect, provider-integration knowledge (serve/#1546, #1565, #1567, #1187).
- **Informed:** downstream construction team (via the elaboration brief).
