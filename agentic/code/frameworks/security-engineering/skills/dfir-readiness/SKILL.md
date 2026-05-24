---
namespace: aiwg
name: dfir-readiness
platforms: [all]
description: Use when a project needs DFIR readiness from the security-engineering side: prepare incident evidence handling, chain-of-custody expectations, IOC readiness, and handoff to forensics-complete without collecting evidence.
triggers:
  - "DFIR readiness"
  - "incident response readiness"
  - "evidence preservation readiness"
  - "chain of custody readiness"
  - "IOC readiness"
  - "forensic report readiness"
requires:
  - project-context: repository or workspace that may need evidence-bearing incident response
ensures:
  - boundary-routing: preventive security, production incident management, and forensic investigation responsibilities are separated
  - forensics-handoff: operator is routed to forensics-complete for evidence-bearing work
  - readiness-record: preparation notes can be written under .aiwg/security-engineering/incident-readiness/
invariants:
  - no live evidence collection happens from this skill
  - no containment, cleanup, or destructive action is suggested without explicit operator authorization
  - forensic case artifacts stay under .aiwg/forensics/
---

# DFIR Readiness

Use this skill when a security-engineering conversation turns into incident readiness: evidence handling, chain of custody, IOC workflow, forensic report readiness, or "what should this project have in place before an incident?"

This is a bridge. It prepares and routes. It does not replace `forensics-complete`, and it does not collect evidence.

## Triggers

- "DFIR readiness"
- "incident response readiness"
- "evidence preservation readiness"
- "chain of custody readiness"
- "IOC readiness"
- "forensic report readiness"
- "prepare this project for a breach investigation"
- "start a forensics case safely"
- "what do we need before collecting evidence?"

## Purpose

Make a security project ready to hand off to evidence-preserving DFIR work.

The skill answers three questions:

1. Is this preventive security work, production incident coordination, or a forensic investigation?
2. Is `forensics-complete` installed for evidence-bearing work?
3. What readiness record, custody expectation, and handoff steps should exist before anyone touches volatile or potentially admissible evidence?

## Behavior

### Boundary

| Need | Route |
|---|---|
| Preventive controls, disclosure intake, secure design decisions | `security-engineering` |
| Severity, incident bridge, stakeholder comms, service restoration, PIR | `sdlc-complete` incident-response flows |
| Evidence preservation, triage, acquisition, timelines, IOCs, reports | `forensics-complete` |

If a request includes live evidence, suspected compromise, a target host, IOC extraction, chain of custody, forensic timeline, or report generation, route to `forensics-complete`.

### 1. Classify the situation

Ask only enough to route safely:

- Is there an active incident, or is this readiness planning?
- Is any evidence already collected?
- Are any destructive containment or cleanup actions planned?
- Is legal, compliance, or customer-impact handling in scope?
- Which systems could hold volatile evidence?

Do not ask for secrets, exploit payloads, private vulnerability details, or raw evidence in chat.

### 2. Check for the DFIR framework

Look for `.aiwg/forensics/` or an installed `forensics-complete` entry in `.aiwg/aiwg.config`.

If it is missing, instruct the operator:

```bash
aiwg use forensics
# or
aiwg use dfir
```

Then route through discovery:

```bash
aiwg discover "forensic triage"
aiwg discover "evidence preservation"
aiwg discover "start forensics case"
```

### 3. Create a readiness record

For readiness planning, write or update:

```text
.aiwg/security-engineering/incident-readiness/<system-or-project>.md
```

Use this structure:

```markdown
# DFIR Readiness: <system-or-project>

- Prepared: <date>
- Owner: <person/team>
- Security-engineering record: readiness / review / update
- Forensics workspace installed: yes/no
- Production incident-management route: <SDLC flow or runbook>
- DFIR route: forensics-complete

## Evidence Sources

| Source | Volatility | Owner | Access Method | Notes |
|---|---|---|---|---|
| <host/log/cloud/container> | high/medium/low | <team> | <read-only path> | <notes> |

## Chain-of-Custody Expectations

- Master custody log: `.aiwg/forensics/chain-of-custody.md`
- Case evidence root: `.aiwg/forensics/evidence/<case-id>/`
- Hash algorithm: SHA-256 unless a stricter local standard applies
- Transfer logging: required for every evidence handoff

## Safe Start Checklist

- [ ] Confirm authority to investigate.
- [ ] Preserve volatile evidence before low-volatility sources.
- [ ] Avoid cleanup, reboot, patching, or containment unless authorized.
- [ ] Start custody logging before collection.
- [ ] Record production incident handoff if SDLC incident management is active.
- [ ] Route evidence-bearing work to `forensics-complete`.

## Open Gaps

- [ ] <missing access, log source, retention, owner, tooling, legal gate>
```

### 4. Route to the right next skill

Use `aiwg discover` rather than naming non-kernel skills as commands:

```bash
aiwg discover "evidence preservation"
aiwg discover "forensic triage"
aiwg discover "extract iocs"
aiwg discover "build forensic timeline"
aiwg discover "forensic report"
```

For production incident coordination, use:

```bash
aiwg discover "handle incident"
aiwg discover "incident triage"
```

## Safety Rules

- Never modify a suspected evidence source as a readiness step.
- Never recommend reboot, cleanup, quarantine, or credential rotation as a forensic action without explicit operator authorization and custody logging.
- Never paste secrets, exploit payloads, raw private reports, or customer data into public issues or chat.
- If evidence already exists, record who collected it, when, from where, and how integrity was verified before continuing.

## References

- `forensics-complete/skills/forensics-quickref` for DFIR discovery phrases.
- `forensics-complete/skills/evidence-preservation` for custody procedures.
- `sdlc-complete/skills/flow-incident-response` for production incident coordination.
- `docs/integrations/dfir-handoff.md` for cross-framework routing guidance.
