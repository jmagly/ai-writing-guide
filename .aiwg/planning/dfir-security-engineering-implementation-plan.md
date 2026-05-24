# DFIR Security Engineering Implementation Plan

Date: 2026-05-24
Issue: #1454
Status: Ready for implementation issues

## Objective

Make DFIR readiness discoverable from `security-engineering` while preserving
`forensics-complete` as the owner of evidence-bearing investigation workflows.

## Workstream 1: Security-Engineering Bridge

Deliver a new `dfir-readiness` skill in
`agentic/code/frameworks/security-engineering/skills/dfir-readiness/`.

Acceptance:

- Skill frontmatter triggers include DFIR readiness, incident-response
  readiness, evidence-preservation readiness, chain-of-custody readiness, IOC
  readiness, and forensic-report readiness.
- Skill explains the boundary among `security-engineering`, `sdlc-complete`,
  and `forensics-complete`.
- Skill checks or instructs installation of `forensics-complete` via
  `aiwg use forensics` / `aiwg use dfir`.
- Skill writes or templates readiness records under
  `.aiwg/security-engineering/incident-readiness/`.
- `security-engineering-quickref`, README, and manifest boundary mention DFIR
  readiness as a routing/handoff concern, not evidence analysis ownership.
- Discovery tests cover security-oriented DFIR phrases.

## Workstream 2: Forensics Scaffold Alignment

Bring the existing `forensics-complete` scaffold into exact alignment with
the issue acceptance criteria.

Acceptance:

- `forensics-complete/manifest.json` workspace and memory include `triage/`
  and a master `chain-of-custody.md` artifact.
- README and quickref use the same workspace layout.
- Deploying `aiwg use forensics` and `aiwg use dfir` into a clean project
  creates the expected forensics workspace artifacts.
- Starter templates exist for investigation scope/status, triage summary,
  evidence package notes, custody logging, IOC register, forensic report, and
  remediation tracking.
- Tests verify the clean-workspace deployment path.

## Workstream 3: Cross-Framework Guidance

Add a short integration guide that operators can find from either framework.

Acceptance:

- Guide documents when to use:
  - `security-engineering` for preventive controls, disclosure intake, and
    DFIR readiness.
  - `sdlc-complete` for production incident coordination.
  - `forensics-complete` for evidence preservation and investigation.
- Guide includes "start a case safely" steps:
  - preserve volatility order;
  - avoid destructive actions;
  - initialize chain of custody;
  - route live containment through explicit operator authorization;
  - record handoff from incident management to DFIR.
- Quickrefs cross-link to the guide.
- Discovery phrases for "DFIR", "incident response evidence", "start
  forensics case", "chain of custody", "IOC", and "timeline reconstruction"
  return either the bridge skill or forensics quickref in the top results.

## Suggested Sequence

1. Land Workstream 1 first. It gives security-engineering users a route
   without changing forensics internals.
2. Land Workstream 2 next. It makes the existing DFIR install path match the
   issue's scaffold acceptance criteria.
3. Land Workstream 3 last, after the concrete surfaces exist.

## Verification

Run at minimum:

```bash
./bin/aiwg.mjs discover "DFIR readiness" --limit 5
./bin/aiwg.mjs discover "incident response evidence preservation" --limit 5
./bin/aiwg.mjs discover "start forensics case" --limit 5
npx vitest run test/integration/forensics-complete.test.ts
npx vitest run test/unit/artifacts/discover.test.ts
```

If implementation changes deployment behavior, also run the relevant `use`
handler/deployment tests.

