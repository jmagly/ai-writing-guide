# Project Intake Form

## Metadata

- Project name: `browser-control addon`
- Requestor/owner: `Joseph Magly (AIWG maintainer)`
- Date: `2026-05-22`
- Stakeholders: `AIWG maintainers; downstream AIWG users wanting to drive logged-in browser sessions from an LLM agent`

## Problem and Outcomes

- Problem statement: Setting up `@playwright/mcp` to drive a real, logged-in Chromium-derived browser from an AIWG-managed agent currently requires ~10 session restarts, deep knowledge of which browser variants are supported, manual token capture from a browser extension, and shell-init-aware env-var plumbing. Normal AIWG users (without internal `claude-role`-style wrappers) face a worse version of this same path because AIWG's MCP injection silently no-ops when overridden by claude-role.
- Target personas/scenarios:
  - **Developer driving authenticated test scenarios**: wants the agent to interact with internal admin UIs, dashboards, or staging environments where they're already logged in
  - **Research user analyzing protected corpora**: wants the agent to read paywalled or auth-gated content from their browser session
  - **Ops engineer triaging production**: wants the agent to walk through a logged-in monitoring or incident-tracking dashboard
  - **AIWG self-driver**: agents within AIWG workflows that need to verify a deployed feature in a real browser (e.g., `verify` skill)
- Success metrics (KPIs):
  - Time-to-working-setup: from "agent doesn't know about browser-control" to "agent successfully drives one logged-in tab" should be under 10 minutes for a non-expert user
  - Setup failure rate: <10% of new installations fail `browser-doctor` after running `browser-setup`
  - Token-leak incidents: zero — token never appears in commits, registry plaintext, or activity log
  - User-reported friction: at least 5 of the 10 lessons-learned items from the PoC eliminated for normal users

## Scope and Constraints

- In-scope:
  - AIWG addon at `agentic/code/addons/browser-control/`
  - Skills: `browser-setup`, `browser-doctor`, `browser-reset`, optionally `browser-drive`
  - Agent: `browser-driver`
  - Rule: `browser-control-safety.md`
  - Per-workspace allow-list template
  - Documentation: `docs/integrations/playwright-mcp.md`
  - ADR: `adr-remote-browser-control.md`
  - Cross-platform browser detection (Linux + macOS + Windows)
  - Integration with `aiwg mcp` CLI surface (`add`, `inject`, `profile`)
  - Tests at unit + integration level (CI-gated)
- Out-of-scope (for now):
  - Driving non-Chromium-derived browsers (Safari, Firefox via WebDriver BiDi) — deferred to a future addon
  - Headless mode orchestration (the addon assumes a local GUI)
  - Recording/replay of browser sessions
  - Multi-tab orchestration UI
  - Computer-use-style (screen+keyboard) automation — different layer entirely
  - Mobile browser support
- Timeframe: MVP scoping pending Inception gate; provisional target ~6 weeks of agent-oriented work (~27 scope units, see plan doc)
- Budget guardrails: No infra cost (runs locally); minimal dependency footprint (playwright-mcp already npx-installable)
- Platforms and languages (preferences/constraints):
  - Skills: markdown + bash/node script frontmatter where executable
  - Detection module: TypeScript in `src/util/browser-detect.ts` (consistent with AIWG core)
  - MCP integration: extends existing `~/.aiwg/mcp-servers.json` schema (no new persistence layer)

## Non-Functional Preferences

- Security posture: `Strong` — token handling, allow-list enforcement, activity-log audit trail are core to the design
- Privacy & compliance: `None` (no PII processed by AIWG itself; users' browser sessions are theirs)
- Reliability targets: Setup success on first attempt ≥ 90% per supported browser; doctor false-positive rate ≤ 5%
- Scale expectations: Single-user, single-machine. No multi-tenant. No fleet-of-browsers orchestration in v1.
- Observability: `logs+metrics` — activity-log entry per MCP tool invocation, doctor produces structured JSON output for CI/MCP consumption
- Maintainability: `high` — addon must survive playwright-mcp version bumps, browser variant additions, provider additions; documented adapter points
- Portability: `portable` — Linux/macOS/Windows; bundles with `aiwg use browser-control`

## Testing Strategy (REQUIRED)

### Test Coverage Requirements

- **Minimum coverage threshold**: `80%` (production-quality addon)
- **Coverage measurement**: `Both` (line + branch)
- **Critical path coverage**: `100%` for token-handling and allow-list enforcement code paths

### Test Levels Required

| Level | Required | Target Coverage | Automation |
|-------|----------|-----------------|------------|
| Unit tests | Yes | 85% | CI-gated |
| Integration tests | Yes | 70% (browser detection across mock OSes) | CI-gated |
| E2E/System tests | Yes | manual + scripted setup walkthrough on Linux+macOS | Manual + recorded automation |
| Performance tests | No | n/a | n/a |
| Security tests | Yes | token never appears in registry/logs/output, allow-list bypass blocked | CI-gated |
| Accessibility tests | No | n/a (no UI surface produced) | n/a |

### Test Automation Strategy

- **CI/CD integration**: `Tests block merge` (standard AIWG addon discipline)
- **Test environment**: `Local only` for E2E (requires real browser); mocked browser detection for unit + integration
- **Test data strategy**: `Factories` for browser-detection inputs; `Fixtures` for MCP registry states; mocked extension probe handshake

### Test Maturity Profile

- [x] **Production**: Full automation (all levels automated, 80%+ coverage, CI-gated)
- [ ] **Enterprise**: Comprehensive (90%+ coverage, security/perf gates, audit trail)

### Existing Test Assessment

Greenfield addon. No existing tests to integrate with. PoC artifacts in `.aiwg/working/playwright-mcp-poc.md` serve as manual smoke-test reference but do not count as automated coverage.

## Constraints, Dependencies, Risks

### Dependencies

- `@playwright/mcp` (npm, currently 0.0.75) — external; pinned at addon scope
- "Playwright MCP Bridge" Chrome Web Store extension (`mmlmfjhmonkocbjadbfplnigmagldckm`) — external; AIWG cannot directly install for the user
- AIWG MCP registry (`aiwg mcp add/profile/inject`) — internal, stable
- `aiwg discover` / `aiwg show` for skill lookup — internal, stable
- `AskUserQuestion` (Claude Code) and equivalents on other providers — for interactive token capture; documented fallback to markdown prompts

### Key risks (cross-reference `.aiwg/working/browser-control-feature-plan.md` for full table)

- Playwright MCP extension protocol drift
- Web Store extension removal
- Token leakage via registry plaintext (mitigated by env-var substitution feature — see "Bonus AIWG plumbing")
- User installs extension in unsupported browser variant (Chromium-on-Flatpak was the PoC failure mode)
- DevTools sandbox-escape CVE class (CVE-2026-8018 noted as precedent)

### Out-of-band coordination

- One core feature this addon depends on but doesn't own: **env-var substitution in MCP registry** (`${file:...}` and `${env:...}` resolution at MCP-server-spawn time). Without it, the token sits as plaintext in `~/.aiwg/mcp-servers.json`. Could ship as a separate core feature gated to land before browser-control public release.

## Decision Authority

- **Architecture decisions**: AIWG maintainers (ADR `adr-remote-browser-control.md` required before Elaboration exit)
- **Security trade-offs**: Documented in `browser-control-safety.md` rule; reviewed by security-engineering framework agents
- **Browser support additions** (post-MVP): merit-based, no formal gate
- **Phase transitions**: per AIWG SDLC `hitl-gates` (Concept→Inception→Elaboration→Construction→Transition)

## Next Steps (Inception)

1. Solution profile at `.aiwg/intake/browser-control-solution-profile.md` (out of intake's scope; produced during Inception)
2. Use cases for `browser-setup`, `browser-doctor`, `browser-reset`, `browser-driver` agent
3. Threat model for the browser-control agent (security-engineering framework)
4. Stakeholder analysis (existing users using `claude-role`-style wrappers, new users without)
5. Risk register
6. NFR module on token security
7. ADR draft on remote-browser-control approach (extension vs CDP vs WebDriver BiDi long-term)

## References

- `.aiwg/working/browser-control-feature-plan.md` — full design and rationale
- `.aiwg/working/playwright-mcp-poc.md` — T1–T7 PoC test plan (now superseded by live demonstration)
- `.aiwg/activity.log` — provenance trail of PoC sessions 2026-05-21 / 2026-05-22
- `~/sysops/scripts/mcp-roles/` — `claude-role` infrastructure that AIWG's path replaces for normal users
- `~/.aiwg/mcp-servers.json` — registry written by setup wizard
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [Playwright MCP Bridge — Chrome Web Store](https://chromewebstore.google.com/detail/playwright-mcp-bridge/mmlmfjhmonkocbjadbfplnigmagldckm)
