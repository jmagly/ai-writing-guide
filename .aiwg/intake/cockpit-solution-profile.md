# Solution Profile — AIWG Cockpit

Select a profile to set defaults for gates, controls, and process rigor.

## Profile

- Profile: `MVP` (base) with **security tailored to Production**

Rationale: v1 is a local, single-operator, no-required-cloud product (favoring MVP velocity), but it can **start, attach to, and dispatch sessions/Missions across multiple agentic stacks** — a control surface with real blast radius. The security axis is therefore raised to Production rigor (threat model, authorization gates, no-secrets-in-UI), while reliability/process stay at a pragmatic MVP+ level for v1.

## Defaults (tailored)

- **Security — Production rigor (raised from MVP):**
  - Threat model required (overlay can drive many stacks → session-hijack, privilege-escalation, secret-exposure surfaces).
  - Inherits human-authorization, token-security, HITL-approval gates (#1565), and the unified audit trail (#1567).
  - No bearer tokens in UI state; session attach delegates to each stack's native auth; Cockpit never stores provider credentials in plaintext.
- **Reliability — MVP+ (overlay isolation is the hard requirement):**
  - p95 UI responsiveness targets + basic alerts.
  - **Hard invariant:** a Cockpit crash must never crash/corrupt an underlying running stack; attach/detach is non-destructive; audit persists across UI restarts.
- **Process — MVP:**
  - Briefs/cards, focused plans, this intake→elaboration artifact set.
  - Full traceability for the security-sensitive paths (session control, mission dispatch); lighter for cosmetic UI.

## Overrides / tailoring decisions

- Diagrams required (per diagram-generation rule): C4 context + container for the overlay/coordination architecture; sequence diagrams for session-attach and cross-stack handoff.
- "Non-nerf" capability-parity is a **gate criterion**, not a nice-to-have: every native provider capability must remain available + unaltered when Cockpit attaches (verified per-provider).
- Marketplace-sourced UX agents must pass an adoption check (license, quality, security) before integration — documented in elaboration.
- This track is bounded at the **ABM gate** (end of elaboration). Construction prep / iteration planning is explicitly out-of-track.
