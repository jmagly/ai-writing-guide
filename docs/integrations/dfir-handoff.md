# DFIR Handoff

Use this guide when a security conversation becomes incident readiness or an active evidence-bearing investigation.

## Which Framework Owns What

| Need | Use |
|---|---|
| Preventive controls, secure design, disclosure intake, DFIR readiness | `security-engineering` |
| Severity, incident bridge, stakeholder communications, restoration, PIR | `sdlc-complete` incident-response flows |
| Evidence preservation, acquisition, analysis, timelines, IOCs, reports | `forensics-complete` |

`security-engineering` prepares the route. It should not collect evidence. `sdlc-complete` coordinates the production incident. `forensics-complete` preserves and analyzes evidence.

## Readiness Path

```text
Use AIWG asset `dfir-readiness` to prepare this project for a defensible
incident-response handoff. Explain the evidence and custody expectations and
ask before changing project policy or storage.
```

The readiness record belongs under:

```text
.aiwg/security-engineering/incident-readiness/
```

Use it for evidence-source inventory, custody expectations, owners, access methods, and open gaps.

## Start A Case Safely

Before collecting evidence:

1. Confirm authority to investigate.
2. Preserve volatile evidence before low-volatility sources.
3. Avoid reboot, cleanup, patching, quarantine, or credential rotation unless the operator explicitly authorizes containment.
4. Initialize chain of custody.
5. Record the handoff from production incident management to DFIR.

Install the DFIR framework if needed:

```bash
aiwg use forensics
# or
aiwg use dfir
```

Then route by task:

```text
Route this incident through the appropriate AIWG forensic assets. Consider
`forensics-triage`, `evidence-preservation`, `forensics-ioc`,
`forensics-timeline`, and `forensics-report`; select only what the evidence and
scope require, preserve chain of custody, and explain each transition.
```

## Workspace Split

Preventive readiness:

```text
.aiwg/security-engineering/incident-readiness/
```

Evidence-bearing case work:

```text
.aiwg/forensics/
├── profiles/
├── plans/
├── triage/
├── evidence/
├── findings/
├── timelines/
├── iocs/
├── reports/
├── sigma/
└── chain-of-custody.md
```

## Safety Rules

- Do not paste raw evidence, secrets, exploit payloads, customer data, or private vulnerability details into public issues or chat.
- Do not modify suspected evidence sources as part of readiness.
- Every transfer of evidence must be logged.
- Hash evidence at collection and verify hashes after transfer.
- Keep raw evidence separate from derived analysis outputs.
