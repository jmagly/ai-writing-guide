# Degraded Mode Matrix

> **Template usage**: One record per system or critical subsystem. Lives in `.aiwg/security-engineering/degraded-modes/<system-name>.md`. Driven by the `degraded-mode-design` skill. Replace all `[bracketed]` placeholders.

## Document Control

| Field | Value |
|---|---|
| System | `[Name]` |
| Document ID | `[DM-NNN]` |
| Date Created | `[YYYY-MM-DD]` |
| Authors | `[role / agent]` |
| Reviewers | `[independent reviewer]` |
| Status | `[Draft / Under Review / Approved / Implemented]` |

## 1. System Assets and Protection Goals

| Asset | Confidentiality priority | Integrity priority | Availability priority |
|---|---|---|---|
| `[secret material]` | HIGH | HIGH | LOW (acceptable to lose access) |
| `[operational state]` | MEDIUM | HIGH | MEDIUM |

**Default principle for this system**: `[fail-closed / fail-safe / fail-open]` based on CIA prioritization above.

## 2. Failure Modes Matrix

For each trigger condition, document what the system does, how it cleans up, who gets notified, and how recovery happens.

| # | Trigger | Behavior on trigger | In-memory cleanup | Operator notification | Recovery path |
|---|---|---|---|---|---|
| F1 | One factor (e.g., YubiKey) lost mid-session | refuse next operation; preserve at-rest | zeroize active key buffers; unmount tmpfs | display + log | bring missing factor back |
| F2 | All factors lost | refuse operation; SHRED scratch state | clear all RAM via tmpfs unmount; force fsync | display + log + HQ alert (out-of-band) | escrow path with HQ keys (separate from operational) |
| F3 | Network lost mid-operation | complete current op offline if safe; defer next | n/a | display | wait for network |
| F4 | Hardware failure (TPM, HSM, YubiKey) | refuse operation | zeroize | display + HQ alert | replace hardware; re-provision |
| F5 | Verification failure (signature, manifest) | refuse operation; do NOT override | zeroize | display + HQ alert | investigate; do not bypass |
| F6 | Time skew detected (HMAC TOTP, cert expiry) | accept small skew (configurable); refuse large | n/a | display | sync clock; investigate skew source |
| F7 | Disk full mid-operation | refuse next write; preserve current state if safe | n/a | display | free space; resume |
| F8 | Power loss | n/a (hardware reset) | hardware: secrets in RAM lost (intended) | next-boot diagnostic | next session resumes from at-rest state |
| F9 | Operator suspect compromised | manual revocation triggered | n/a (operational state irrelevant; revoke at HQ) | HQ-driven | reissue credentials |
| F10 | `[project-specific trigger]` | `[…]` | `[…]` | `[…]` | `[…]` |

Every row must have an entry in every column. "TBD" means the design is incomplete.

## 3. Override Ceremony (if any)

If any failure mode supports a manual override, document the ceremony per `degraded-mode-design` Section 4.

```
Override permitted for: [F2 only? F4? none?]
Ceremony:
  1. Operator types SHA-256 prefix of failing artifact (forces inspection)
  2. Witness physically present, types their own credential
  3. External log entry (HQ-side syslog) — can NOT be suppressed
  4. Time-delay [N seconds] before override takes effect
  5. Confirmation step (type CONFIRM) or abort
Anti-pattern check: NO single Y/n prompt — autoresponse-prone
```

If no override is permitted, state explicitly: "Override is not permitted. Failure modes route to recovery paths in §2."

## 4. Recovery Paths

| Recovery scenario | Procedure document | Tested (date)? | Next test due |
|---|---|---|---|
| F2 (all factors lost) | `[procedure ref]` | `[date or N]` | `[date]` |
| F4 (hardware failure) | `[procedure ref]` | `[date or N]` | `[date]` |
| `[…]` | | | |

**Rule**: an untested recovery procedure does not exist.

## 5. Worked Example: Review Findings B4 / M8

### Original (review B4 + M8)

```
F2 (both YubiKeys gone): COPY VM disk PLAINTEXT to LUKS volume
F5 (manifest verification failure): "Type Y to override"
```

### What this matrix would have caught

- F2 violates §1 default (preserves availability at cost of confidentiality)
- F5 violates §3 ceremony requirement (single Y/n prompt is autoresponse-prone)

### Remediation in matrix form

| # | Trigger | Behavior | Cleanup | Notification | Recovery |
|---|---|---|---|---|---|
| F2 | Both YubiKeys gone | SHRED VM disk in tmpfs; fail closed | tmpfs unmount + RAM clear | display + HQ alert | escrow path: encrypted-to-HQ stranded-session bundle (operator-opt-in at provisioning) |
| F5 | Manifest verification failure | refuse; **no override** | zeroize | display + HQ alert | return to HQ for manifest reissue |

## 6. Cross-references

- Skill: `agentic/code/frameworks/security-engineering/skills/degraded-mode-design/SKILL.md`
- Companion: `factor-design-rationale.md` (which factor failures trigger which row)
- Companion: `chain-of-trust-design.md` (override-ceremony anti-pattern shared)
- Cleanup detail: `agentic/code/frameworks/security-engineering/skills/secret-handling-runtime/SKILL.md`

## 7. Review Trail

| Date | Reviewer | Findings | Resolution |
|---|---|---|---|
| `[date]` | `[reviewer]` | `[findings]` | `[resolution]` |
