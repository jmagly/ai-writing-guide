---
artifact_type: intake_form
study: novice-user-adoption
phase: inception
status: baselined
commissioning_epic: roctinam/aiwg#1334
created: 2026-05-14
voice: technical-authority
---

# Intake Form: AIWG Novice-User Adoption Study

## Problem Statement

Two adoption failures persist for users new to AIWG, particularly users without deep computer-science background:

1. **Project / session isolation failure.** Users run AIWG-using AI sessions in `$HOME` or other top-level directories, never establishing a project root. Many also mix unrelated tasks in a single session (e.g., "fix my resume, debug this Python script, plan a marketing campaign"). The resulting context bleed produces concretely measurable degradation: REF-720 (Lost in Multi-Turn Conversation, MSR/Salesforce 2025) shows a 39% capability drop FULL→SHARDED with the failure appearing at just two task shards.

2. **Hookup failure.** Users complete `aiwg use <framework>` and platform artifacts deploy, but in actual AI sessions the agent does not invoke the AIWG discover / skill / agent / KB routing system. The agent answers from training instead of querying the capability index. Users expect "it just works"; the reality requires technical setup most non-CS users skip or get wrong.

Both failures share a root cause: AIWG's onboarding assumes the user can self-navigate a CLI-and-context-file installation flow that is, by HCI literature standards (Krug, Norman, Zamfirescu-Pereira), demonstrably too steep for novice users.

## Success Metrics

Measurable outcomes that define study success:

1. **Hookup confidence per platform.** For each of AIWG's 10 supported providers, produce a field-validated assessment of whether the four discovery hooks (rule, AIWG.md, skill quickref, discovery-agent) actually reach the agent in production sessions. Method: scripted task on each platform, telemetry on whether `aiwg discover` was called when appropriate. Pass: per-platform evidence (not static analysis) for at least 8 of 10 platforms.

2. **Project-isolation warning shipped.** A non-blocking warning in `aiwg use` when `cwd` lacks project signals (no `.git/`, no `package.json`/`pyproject.toml`/`Cargo.toml`/etc., or `cwd` is `$HOME` or `/`). Pass: warning lands in main, does not block, is configurable to silence.

3. **Wizard flow design doc.** A written design document for a `aiwg wizard` (or equivalent) onboarding flow. Pass: design doc reviewed against Cognitive Walkthrough method (REF-158) with at least one walkthrough recorded.

4. **Global install decision.** A documented architecture decision (ADR) on whether global-install (`aiwg use --scope user`) is a first-class supported flow or a discouraged escape hatch. Pass: ADR baselined; rough edges either fixed or explicit guidance directing users to project-scoped install.

5. **Discovery-agent bolster.** Identifiable improvement to the `aiwg-finder` subagent-dispatch path — the discovery hook the project owner flagged as "might need more bolstering." Pass: measurable improvement in recall or invocation rate, OR documented finding that no improvement is warranted.

6. **AIWG-engagement surface decision.** A documented design decision on how to surface "AIWG is engaged" to users without crossing into branding pollution. Pass: design doc referencing Co-Audit (REF-157) and Lee & See (REF-159) trust-calibration framework.

## Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| AIWG core maintainers (jmagly et al.) | Decision-makers | Adoption velocity, support burden, framework integrity |
| Non-technical AIWG users | Primary beneficiaries | "It just works" experience without CLI fluency requirements |
| Technical AIWG users | Secondary beneficiaries | Don't regress current power-user UX |
| AIWG Discord/Telegram community | Field-feedback channel | Continued engagement, validated improvements |
| Provider platforms (Anthropic, OpenAI, Cursor, etc.) | Integration partners | Each platform's discovery hookup needs separate validation |

## Initial Solution Approach

This is a **research-then-design study**, not a product build. The study output is a set of decisions and design artifacts that will feed downstream implementation epics. Specifically:

- **Workstream A** (per-platform hookup audit): field validation, not static audit
- **Workstream B** (project-isolation warning): small implementation, ship as quick win
- **Workstream C** (wizard design): design doc only; implementation is a separate epic
- **Workstream D** (global install): ADR decision; implementation if first-class chosen
- **Workstream E** (provider read access): config audit per provider
- **Workstream F** (engagement surface): design doc with trust-calibration framing
- **Workstream G** (empirical questions): three open data-gathering questions

The study is structured to produce **decisions and designs ready for construction**, not new product code.

## Domain Context

AIWG is a multi-provider AI development framework deploying agents, skills, commands, and rules to 10 AI coding platforms (Claude Code, Codex, Copilot, Cursor, Factory, OpenCode, Warp, Windsurf, Hermes, OpenClaw). The framework includes an artifact index queryable via `aiwg discover` + `aiwg show`, with a kernel set of ~19 always-loaded skills and ~385 standard skills reachable on-demand. The skill-discovery rule mandates that agents query `discover` before declining a user request.

Discovery reaches agents through four parallel hooks: (1) rule files, (2) primary context files (AIWG.md / CLAUDE.md / AGENTS.md / WARP.md / .hermes.md), (3) kernel-loaded skill quickrefs, (4) discovery-agent subagent-dispatch (`aiwg-finder` and similar). Two platforms (Claude Code, Codex) are field-validated as working; the other eight reportedly get good user feedback but lack systematic per-platform validation.

## Out of Scope

- Major UI redesign across AIWG (the wizard is the only new surface)
- Mandating any platform-wide pattern; per-platform variation is expected
- Forcing users into project-scoped installs (global install stays available — this study decides only whether it's first-class or escape-hatch)
- Construction work (this study stops at the ABM gate; implementation epics will follow)
- Any AIWG attribution / branding pattern in generated user code (preserved invariant from existing `no-attribution` rule)

## Constraints

1. **Branding restraint** — UX surfaces must not push "AIWG" into user code, commits, or content. Quality differential is the intended signal; explicit identification is reserved for narrow status surfaces.
2. **Multi-platform** — every recommendation must work or degrade gracefully across all 10 platforms.
3. **No regression for power users** — current technical-user UX should not require change; new surfaces are opt-in or warning-only.
4. **Field-validated** — static analysis of platform-discovery paths is insufficient; conclusions require user-validated evidence.

## References

- Commissioning epic: roctinam/aiwg#1334
- Research support: research-papers #607–#613 (UX foundations), #614 (Lee & See trust calibration); existing corpus REF-720, REF-006/158, REF-877/878/879
- Field state: Claude Code and Codex confirmed working; other platforms get good user feedback but per-platform validation needed
