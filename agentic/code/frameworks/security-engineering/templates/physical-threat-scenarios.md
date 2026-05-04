# Physical Threat Scenarios

> **Template usage**: One record per system that faces physical-access adversaries. Lives in `.aiwg/security-engineering/physical-threats/<system-name>.md`. Driven by the `physical-threat-modeling` skill. Complements (does not replace) `sdlc-complete/templates/security/threat-scenario-card.md` which is network/app-focused. Replace all `[bracketed]` placeholders.

## Document Control

| Field | Value |
|---|---|
| System | `[Name]` |
| Document ID | `[PT-NNN]` |
| Date Created | `[YYYY-MM-DD]` |
| Authors | `[role / agent]` |
| Reviewers | `[independent reviewer]` |
| Status | `[Draft / Under Review / Approved / Implemented]` |

## 1. Asset and Operator Profile

| Aspect | Value |
|---|---|
| Asset class | `[portable laptop / portable USB-secrets / fixed datacenter / IoT field device]` |
| Operator role | `[security operator / journalist / executive / sysadmin / SRE]` |
| Travel pattern | `[domestic only / international / hostile-jurisdictions]` |
| Storage when not in use | `[hotel room / safe / office / never unattended]` |
| Operational environment | `[private office / shared workspace / public / semi-public]` |
| Adversary profile | `[opportunistic / criminal / corporate competitor / nation-state]` |
| Physical-access exposure | `[never / rare / regular / continuous risk]` |

## 2. Applicability Decision

Walked through the `physical-threat-modeling` Section 2 decision tree:

```
Asset portable: [Y/N]
High-value target: [Y/N]
Cross-references TEMPEST-relevant operations: [Y/N]
```

**Resulting threat applicability** (check all that apply):

- [ ] Threat 1: Evil-maid swap of bootstrap / boot media
- [ ] Threat 2: Thunderbolt / USB-C DMA attack
- [ ] Threat 3: Hostile USB peripheral (BadUSB)
- [ ] Threat 4: Travel-host root compromise
- [ ] Threat 5: Coercion of operator
- [ ] Threat 6: Cold-boot RAM extraction
- [ ] Threat 7: Hardware implant in supply chain
- [ ] Threat 8: Side-channel observation
- [ ] Threat 9: Visual / shoulder-surfing
- [ ] Threat 10: Lost or stolen device

For each unchecked, document why it's NOT applicable in §3.

## 3. Threat-by-Threat Analysis

For each applicable threat:

### Threat N: `[name from library]`

| Aspect | Value |
|---|---|
| **Applicability** | `[in scope / out of scope / partial]` |
| **Why** | `[one sentence; cite asset/operator profile fields]` |
| **Attack steps** | `[summary of how the attack proceeds]` |
| **Detection** | `[how/whether we can detect this]` |
| **Mitigation in this design** | `[concrete reference: 'chain-of-trust-design Pattern A+D' or 'BIOS-level Thunderbolt DMA disable per operator runbook §3.4']` |
| **Mitigation effectiveness** | `[Defeated / Detection-only / Partial / None]` |
| **Residual risk** | `[what remains after mitigation; explicitly accepted by [whom]]` |
| **Cross-references** | `[other docs that contain mitigation detail]` |

`[Repeat for each applicable threat. Out-of-scope threats can be tabulated more briefly.]`

## 4. Mitigation Cross-Reference Matrix

Roll-up: which other documents address each applicable threat?

| Threat | `chain-of-trust-design.md` | `factor-design-rationale.md` | `degraded-mode-matrix.md` | `supply-chain-pins.yaml` | Operator runbook |
|---|---|---|---|---|---|
| 1. Evil-maid | ✓ | | | | |
| 2. DMA | (assumption) | | | | ✓ |
| 4. Travel-host | ✓ (Pattern B) | | | | ✓ |
| 5. Coercion | | ✓ (PIN factor) | | | ✓ (duress procedure) |
| `[…]` | | | | | |

If any applicable threat has no ✓ in any column, it's an unaddressed risk.

## 5. Operational Hardening Checklist

For threats whose mitigation is operational (not technical), document the requirements operators must follow.

- [ ] BIOS settings: `[specific values — Secure Boot enabled, Thunderbolt Security Level User, USB Boot disabled]`
- [ ] Storage when unattended: `[hotel safe / personal carry / never unattended]`
- [ ] Charging from public sources: `[USB data blocker required / forbidden / acceptable]`
- [ ] Privacy filter on screen: `[required when working in public / always]`
- [ ] Lock to S5 (full shutdown), not S3 (suspend), when: `[hostile environment / always when leaving device]`

## 6. Tabletop Exercise Log

Per recommendation #10 from the gap analysis, run periodic tabletop exercises walking through threat scenarios.

| Date | Scenario | Witnesses | Findings | Procedure updates |
|---|---|---|---|---|
| `[YYYY-MM-DD]` | `[e.g., "USB stolen from hotel room while operator at conference"]` | `[names]` | `[gaps found]` | `[document refs]` |

## 7. Worked Example: Review Findings B3 / H4

### Original system

`[Description: portable hardware-backed secrets system; travels with operator; left unattended in hotels.]`

### Decision tree results

- Asset portable: Y
- High-value target: Y (security operator)
- TEMPEST-relevant: N

### Applicable threats and current mitigation status

| Threat | Pre-review status | Post-fix status | Reference |
|---|---|---|---|
| 1. Evil-maid | NOT addressed (review B3) | Pattern A+D from `chain-of-trust-design.md` | COT-001 |
| 2. DMA | not documented | accepted-with-mitigation: BIOS DMA disable in operator runbook §3.4 | runbook |
| 4. Travel-host | Partial (review H4) | Pattern B (signed live image) — primary mitigation | COT-001 |
| 5. Coercion | NOT addressed (review H2) | FIDO2 PIN added per `factor-design-rationale.md` | FACTOR-001 |
| 6. Cold-boot | not documented | accepted; lock to S5 in hostile environments per runbook | runbook |
| 7. Hardware implant | accepted-with-mitigation | procurement controls per `supply-chain-pins.yaml` | supply chain |
| 9. Shoulder-surf | operator-managed | privacy filter required per runbook | runbook |
| 10. Lost device | core threat | LUKS + factor separation (basic design) | COT-001 |

## 8. Cross-references

- Skill: `agentic/code/frameworks/security-engineering/skills/physical-threat-modeling/SKILL.md`
- Companion network/app threats: `sdlc-complete/templates/security/threat-scenario-card.md`
- Mitigation docs referenced above
- Operator runbook: `[link]`

## 9. Review Trail

| Date | Reviewer | Findings | Resolution |
|---|---|---|---|
| `[date]` | `[reviewer]` | `[findings]` | `[resolution]` |
