# ADR: DFIR Readiness Bridge in Security Engineering

Date: 2026-05-24
Status: Proposed
Issue: #1454

## Context

AIWG already has a dedicated `forensics-complete` framework with a DFIR
workspace, agents, skills, templates, Sigma rules, and `dfir` / `forensics`
mode aliases. It also has a separate `security-engineering` framework that
owns design-time applied-security decisions and private disclosure handling.

Issue #1454 asks to expose DFIR as an installable feature/addon. Research
found that the installable DFIR framework already exists, but the
security-engineering route is weak: a security-oriented user asking for
incident-response readiness or evidence-preservation readiness is not guided
to install or use the forensics workspace.

## Decision

Keep DFIR evidence handling and investigations owned by `forensics-complete`.
Add a `security-engineering` bridge for DFIR readiness and handoff.

The bridge is a security-engineering skill and documentation path, not a
second DFIR framework. It prepares the project and operator to hand off safely
to `forensics-complete` when an incident becomes evidence-bearing.

## Scope

The security-engineering bridge owns:

- DFIR readiness checklist and routing.
- Boundary guidance for security-engineering vs SDLC incident response vs
  forensics-complete.
- Installation guidance for `aiwg use forensics` / `aiwg use dfir`.
- Preparation records under
  `.aiwg/security-engineering/incident-readiness/`.
- Links to existing forensics skills, agents, templates, and rules.

`forensics-complete` owns:

- Target profiling.
- RFC 3227 triage.
- Evidence acquisition and chain of custody.
- Platform-specific forensic analysis.
- Timeline reconstruction.
- IOC extraction and reporting.
- Case artifacts under `.aiwg/forensics/`.

`sdlc-complete` owns:

- Production incident severity and triage.
- Stakeholder coordination and communications.
- Service restoration tracking.
- Post-incident review process.

## Consequences

Positive:

- Security users get a clear DFIR readiness path without copying forensics
  content.
- Existing `forensics-complete` assets remain the source of truth for
  evidence-bearing work.
- The boundary between preventive security engineering, incident management,
  and forensic investigation becomes explicit.

Tradeoffs:

- Users may still need to install two frameworks (`security-engineering` and
  `forensics-complete`) for full readiness.
- Discovery tests must cover cross-framework phrasing so the bridge stays
  findable.
- `forensics-complete` manifest and quickref need a small alignment pass for
  `triage/` and master chain-of-custody artifacts.

## Rejected Options

### Fold forensics-complete into security-engineering

Rejected. DFIR has its own lifecycle, standards, workspace topology, and
evidence-safety rules. Folding it into security-engineering would blur
ownership and duplicate mature forensics content.

### Leave security-engineering as a passive delegate only

Rejected. The manifest boundary already says post-incident analysis delegates
to `forensics-complete`, but discovery and user guidance still do not provide
a security-engineering entry point for readiness.

### Create a new DFIR addon separate from forensics-complete

Rejected for now. The framework already exists and is installable via
`forensics` / `dfir`; the practical gap is surfacing and scaffolding, not a
new package.

## Follow-Up Work

- Add `dfir-readiness` under `security-engineering`.
- Align `forensics-complete` workspace scaffold with issue #1454 acceptance.
- Add cross-framework guide and discovery tests.

