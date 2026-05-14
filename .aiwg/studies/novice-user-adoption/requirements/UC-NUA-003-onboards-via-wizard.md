---
artifact_type: use_case
id: UC-NUA-003
study: novice-user-adoption
workstream: C
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-003: User completes AIWG onboarding via an interactive wizard

## Reasoning

1. **Problem analysis** — Many novice users do not know which framework to install, which provider they're using, or what `aiwg use sdlc` actually does. A guided flow surfaces these decisions explicitly.
2. **Constraint identification** — Must be opt-in (not default). Must not regress power-user UX. Must work across all 10 providers, degrading gracefully where provider detection fails.
3. **Alternative consideration** — Options: (a) wizard as `aiwg wizard` subcommand, (b) wizard as `aiwg new --interactive`, (c) wizard as `aiwg use --wizard`. Chose to defer the final naming to the design doc; this UC describes the flow regardless of invocation.
4. **Decision rationale** — Wizard scope is contained: detect provider, detect/create project root, ask about frameworks, run `aiwg use` with the right flags, confirm `aiwg discover` works in a test session.
5. **Risk assessment** — R-003 (wizard degrades power-user UX) is the dominant risk. Mitigation: opt-in only; default path unchanged.

## Primary Actor

Novice User (unsure where to start)

## Goal

Complete AIWG installation correctly without needing to read the CLI reference, with confidence that the install actually works.

## Preconditions

- AIWG is installed (`aiwg --version` succeeds)
- User has at least one AI provider configured locally
- User has discovered the wizard command (via landing page, README, or `aiwg help`)

## Main Success Scenario

1. User runs `aiwg wizard` (final naming TBD per Workstream C design)
2. Wizard detects current AI provider(s) installed on the system
3. Wizard asks: "Which provider do you primarily use?" (offers detected options)
4. Wizard asks: "What are you working on?" (offers framework presets: SDLC for software, research for academic, marketing, forensics, etc.)
5. Wizard detects whether `cwd` looks like a project root; if not, offers to create one or `cd` to one
6. Wizard runs `aiwg use <chosen-framework> --provider <chosen-provider>` with appropriate flags
7. Wizard opens or instructs the user to open an AI session in the project
8. Wizard provides a test prompt: "Try asking your agent: 'help me understand this project'"
9. Wizard waits for the user to confirm the agent responded with AIWG behavior (or runs a discovery probe if telemetry available)
10. Wizard prints success summary with next-step pointers

## Alternative Flows

**A1 — No provider detected** (5a–c. Wizard prompts user to install one; provides 3 supported options with links; exits cleanly so user can install and re-run)

**A2 — Multiple providers detected** (3a. Wizard lets user pick primary, offers to deploy to others as secondary if desired)

**A3 — User wants global install instead** (5a. Wizard offers global install as alternative; references the global-install ADR's guidance on tradeoffs)

**A4 — Cognitive walkthrough fails on a step** — Workstream C evaluation finds that step X confuses novice users. Wizard revised before shipping.

## Postconditions

- User has a correctly-configured project with AIWG deployed
- User has verified the agent responds with AIWG behavior
- User knows how to invoke AIWG behavior in future sessions

## Acceptance Criteria

- [ ] Wizard is opt-in (default `aiwg use` behavior unchanged)
- [ ] Wizard supports all 10 providers (degrades gracefully for any provider where detection fails)
- [ ] Cognitive Walkthrough (REF-158) records ≤2 friction points per step in the final design
- [ ] Test prompt step confirms AIWG behavior is engaged before declaring success
- [ ] Design doc is approved before implementation begins (implementation is a separate epic)

## References

- Workstream C
- Parent: UC-NUA-001
- Research: research-papers #608 (Nielsen heuristics), #611 (Zamfirescu-Pereira), #613 (Wharton et al. — Cognitive Walkthrough)
