# DFIR Security Framework Integration Research

Date: 2026-05-24
Issue: #1454
Status: Planning complete; implementation split required

## Question

How should AIWG expose DFIR readiness for projects that start from the
`security-engineering` framework without duplicating the existing
`forensics-complete` framework?

## Current State

`forensics-complete` is already an installable framework:

- `agentic/code/frameworks/forensics-complete/manifest.json` declares
  `modeAliases: ["forensics", "dfir"]`.
- Its manifest declares `.aiwg/forensics/` workspace topology for profiles,
  plans, evidence, findings, timelines, IOCs, reports, and Sigma rules.
- `agentic/code/frameworks/forensics-complete/README.md` documents
  `aiwg use forensics` and the DFIR lifecycle.
- `forensics-quickref` is a kernel skill and already triggers for forensics,
  incident response, IOC handling, evidence preservation, breach investigation,
  threat hunting, and attack timeline requests.

`security-engineering` is also already installable:

- `agentic/code/frameworks/security-engineering/manifest.json` declares
  `security-eng`, `secure-dev`, and `applied-security` aliases.
- Its boundary owns design-time applied security decisions.
- Its boundary explicitly delegates post-incident analysis and IOC enrichment
  to `forensics-complete`.

## Discovery Evidence

Commands run from the repository root:

```bash
./bin/aiwg.mjs discover "DFIR incident response evidence preservation chain of custody" --limit 8
./bin/aiwg.mjs discover "security-engineering incident response forensics" --limit 8
./bin/aiwg.mjs discover "start incident response case forensics workspace" --limit 8
./bin/aiwg.mjs show skill forensics-quickref
```

Findings:

- `DFIR incident response evidence preservation chain of custody` returns
  `evidence-preservation`, `linux-forensics`, `flow-incident-response`, and
  `forensics-quickref`.
- `security-engineering incident response forensics` returns
  `flow-incident-response` first, then `linux-forensics`, then
  `forensics-quickref`.
- `start incident response case forensics workspace` returns only
  `flow-incident-response` and `forensics-quickref`; it does not surface a
  clear "prepare this security project for DFIR" entry point.

This means the corpus is present and partly discoverable, but the
security-engineering path does not explain how to install or hand off to the
DFIR workspace.

## Gap

The original issue describes the gap as "DFIR is not surfaced as an obvious
installable feature/addon." The installable framework already exists. The
remaining user-facing gap is more specific:

1. Security-oriented users need a readiness/handoff entry point from
   `security-engineering` to `forensics-complete`.
2. Discovery should distinguish production incident management
   (`sdlc-complete/flow-incident-response`) from evidence-preserving DFIR.
3. The forensics workspace scaffold should align manifest, quickref, and issue
   acceptance criteria, including `triage/` and a master chain-of-custody log.
4. The docs should explain when to use security-engineering, SDLC incident
   response, and forensics-complete together.

## Recommendation

Add a `dfir-readiness` skill to `security-engineering`.

The skill should not collect evidence, perform containment, or replace
`forensics-complete`. It should:

- Recognize DFIR readiness, incident-response preparation, chain-of-custody
  readiness, IOC readiness, and forensic-report readiness requests.
- Check whether `forensics-complete` is installed or clearly instruct the
  operator to run `aiwg use forensics`.
- Explain the boundary:
  - `security-engineering`: preventive controls, disclosure intake, readiness,
    handoff.
  - `sdlc-complete`: production incident coordination, severity, comms,
    post-incident review.
  - `forensics-complete`: evidence preservation, triage, acquisition, analysis,
    timeline, IOC extraction, reporting.
- Create or point to `.aiwg/security-engineering/incident-readiness/` records
  for preparation checklists while leaving case evidence under
  `.aiwg/forensics/`.
- Link to existing forensics skills instead of duplicating their procedures.

## Implementation Slices

1. `security-engineering` DFIR readiness bridge:
   - Add `dfir-readiness` skill.
   - Update `security-engineering-quickref`, README, and manifest boundary.
   - Add discovery tests for security-oriented DFIR phrasing.

2. `forensics-complete` scaffold alignment:
   - Add `triage/` and `chain-of-custody.md` to manifest workspace/memory.
   - Ensure deployed clean workspaces receive the expected directories and
     starter templates.
   - Add smoke tests for `aiwg use forensics` / `aiwg use dfir`.

3. Cross-framework documentation:
   - Add a short integration guide explaining security vs SDLC incident
     response vs DFIR.
   - Update quickrefs so discovery returns a clear route for "DFIR readiness",
     "start an investigation case", "chain of custody", and "incident response
     evidence preservation".

## Non-Goals

- No SIEM, EDR, or case-management product.
- No live evidence collection without explicit operator authorization.
- No destructive containment defaults.
- No duplication of forensics-complete skills, agents, or rules inside
  security-engineering.

