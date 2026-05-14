---
artifact_type: architecture_decision_record
adr_id: ADR-NUA-003
study: novice-user-adoption
workstream: C
status: PROPOSED
title: "Wizard invocation pattern — `aiwg wizard` as a separate top-level command"
created: 2026-05-14
voice: technical-authority
---

# ADR-NUA-003: Wizard Invocation Pattern — Separate Top-Level Command

## Status

**PROPOSED** — pending Cognitive Walkthrough validation in Workstream C and core-maintainer review. May be revised by Workstream C if walkthrough surfaces problems.

## Context

UC-NUA-003 describes a guided onboarding flow for non-technical users. The flow's responsibilities exceed `aiwg use`: it includes provider detection, project-root detection or creation, framework selection, deploy invocation, and post-deploy verification probe.

Three invocation patterns have been considered:

1. **`aiwg wizard`** — separate top-level command
2. **`aiwg use --wizard`** — flag on existing deploy command
3. **`aiwg new --interactive`** — extend the existing project-scaffolding command

The SAD (§10) flagged this as an optional ADR — possibly folded into the wizard design doc as an `ADR-equivalent:` annotation. This ADR promotes the decision to formal status because:

- The invocation choice constrains downstream UX (discoverability, command shape, mental model)
- A formal ADR provides a stable record that survives wizard design-doc iteration
- The ABM gate criterion of ≥3 ADRs is met by recording this decision explicitly rather than counting design-doc notes

## Decision

**Adopt `aiwg wizard` as a separate top-level command.** The wizard is invoked exclusively via this command. `aiwg use` retains current behavior unchanged; `aiwg new` retains current behavior unchanged.

The wizard's command name (`aiwg wizard`) and structure align with other AIWG top-level commands (`aiwg discover`, `aiwg show`, `aiwg doctor`, `aiwg status`).

## Consequences

### Positive

- **Clean separation of concerns.** `aiwg use` deploys; `aiwg new` scaffolds; `aiwg wizard` onboards. Each command has one clear responsibility.
- **Discoverability.** `aiwg help` lists `wizard` as a top-level command. New users scanning the help output encounter it.
- **Mental-model alignment.** Single-word top-level commands match the existing AIWG CLI conventions, reducing cognitive friction for novice users.
- **Scope flexibility.** The wizard can include actions that go beyond `aiwg use` (project-root creation, provider detection, verification probe) without contorting `aiwg use`'s argument surface.
- **No regression to power-user UX.** `aiwg use sdlc` behavior is unchanged.

### Negative

- **Adds a top-level command.** AIWG's command surface is already substantial (~94 commands per CLAUDE.md). One more adds incremental learning load — though primarily for users reading the help output, which is the audience the wizard targets.
- **Discoverability via `aiwg help` only.** Users who never run `aiwg help` and never read documentation may not discover the wizard. This is mitigated by documentation surfacing (README, landing page, quickstart) and by `aiwg-doctor` suggesting `aiwg wizard` when it detects no AIWG deployment.

### Neutral / Required follow-up

- **Wizard design doc** must specify the wizard's internal flow (Workstream C deliverable).
- **`aiwg new` integration** — the wizard may delegate project scaffolding to `aiwg new` internally, but external invocation patterns are unchanged for both commands.

## Alternatives Considered

### Option 2: `aiwg use --wizard`

**Rejected** because: conflates two responsibilities (deploy and onboard). A user running `aiwg use` already knows what they want; a flag adds noise. A user needing onboarding may not know to run `aiwg use` at all — they need a command whose name signals "guide me." A flag on the deploy command does not signal that to a novice.

This option also creates an argument-surface contortion: `aiwg use --wizard` would need to either ignore other arguments (confusing) or accept them and partially honor them (confusing differently). A separate command sidesteps both problems.

### Option 3: `aiwg new --interactive`

**Rejected** because: `aiwg new` scaffolds new projects. The wizard's scope includes onboarding for **existing** projects where the user wants to add AIWG. Routing the wizard through `aiwg new` either forces all wizard users to create a new project (wrong for existing-project use cases) or expands `aiwg new`'s scope to include non-new-project flows (confusing).

`aiwg new --interactive` may still be a useful flag for the new-project scaffolding flow specifically — that is unrelated to this ADR and is left to a separate decision if it arises.

## Implementation Guidance

This ADR is a status decision. Implementation actions inherited:

1. **Workstream C design doc** specifies the wizard's internal flow per UC-NUA-003.
2. **CLI registration** — `aiwg wizard` registered alongside other top-level commands in `src/extensions/commands/definitions.ts`.
3. **Help surface** — `aiwg help` lists the wizard under a "Getting Started" category or similar grouping that surfaces it to novice users.
4. **`aiwg-doctor` integration** — when the doctor detects no AIWG deployment in the current project, it suggests `aiwg wizard` as one possible next action.
5. **README and quickstart** — the wizard becomes the recommended entry point for non-technical users.

## Cognitive Walkthrough Requirement

Workstream C must produce a Cognitive Walkthrough record for the wizard's discoverability:

- **Question 1** (will the user try the right action?) — given the user's goal "set up AIWG for my project," will they try `aiwg wizard`? If yes, why? If no, what alternative will they try, and does the system handle that path?
- **Question 2–4** apply to each subsequent wizard step.

If the walkthrough finds Question 1 fails (users don't think to run `aiwg wizard`), this ADR is revisited.

## References

- Commissioning epic: `roctinam/aiwg#1334`
- UC-NUA-003 (onboards via wizard)
- SAD §10 (open architectural questions), §4.1.1 (Workstream C rationale)
- Research: `research-papers #613` / pending REF-158 (Cognitive Walkthrough Method)
- Related ADRs: ADR-NUA-001 (global install), ADR-NUA-002 (engagement surface)
- Existing commands: `aiwg discover`, `aiwg show`, `aiwg doctor`, `aiwg status` (naming-pattern precedent)
