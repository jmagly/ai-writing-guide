# Authentication Factor Design Rationale

> **Template usage**: One record per authentication subsystem. Lives in `.aiwg/security-engineering/factors/<system-name>.md`. Driven by the `auth-factor-design` skill. Replace all `[bracketed]` placeholders.

## Document Control

| Field | Value |
|---|---|
| System | `[Name of system or component]` |
| Document ID | `[FACTOR-NNN]` |
| Date Created | `[YYYY-MM-DD]` |
| Authors | `[role / agent]` |
| Reviewers | `[independent reviewer]` |
| Status | `[Draft / Under Review / Approved / Implemented]` |

## 1. Factor Inventory

| Factor | Class (have/know/are) | Specific instance | Operations protected | Lost-recovery procedure | Tested? |
|---|---|---|---|---|---|
| `[name]` | `[have/know/are]` | `[hardware/protocol/algorithm]` | `[unlock, sign, decrypt, ...]` | `[procedure ref]` | `[Y/N + date]` |

**Termination check**: at least one row from each of two distinct classes for every operation that protects high-value assets. If any operation has fewer, document the risk acceptance.

## 2. Coercion-Resistance Matrix

| Factor | Coercible? | How | Mitigation |
|---|---|---|---|
| `[factor]` | `[Yes/No/Always]` | `[scenario]` | `[duress code / time-lock / witness / etc.]` |

**Anti-pattern check**: If only "have" + "are" factors are present (no "know"), the system is not coercion-resistant. Document remediation or explicit risk acceptance.

## 3. FIDO2 / WebAuthn PRF Configuration (if applicable)

| Setting | Value |
|---|---|
| RP ID | `[domain or identifier; document if non-domain]` |
| `uv` | `[required / preferred / discouraged]` |
| PIN required | `[Yes/No]` |
| Resident credentials | `[Yes/No]` |
| Extensions | `[hmac-secret, credProtect, etc.]` |
| Tooling on hot path | `[libfido2 C / python-fido2 sandboxed / WebAuthn server lib]` |

## 4. Lockout / Retry Policy

For each factor with retry-able failure modes, document:

```
Factor: [name]
Wrong-attempt behavior:
  After 1: [delay/warning]
  After 3: [delay]
  After N: [lockout]
Recovery procedure: [steps]
Operational impact of lockout: [what breaks]
```

## 5. Duress / Coercion Countermeasures

| Countermeasure | Implemented? | Notes |
|---|---|---|
| Duress PIN | `[Y/N]` | `[if Y: which PIN, what it triggers]` |
| Time-lock | `[Y/N]` | `[duration]` |
| Witness requirement | `[Y/N]` | `[for which operations]` |
| Geographic / device fence | `[Y/N]` | `[boundary, revocation procedure]` |
| Silent canary / heartbeat | `[Y/N]` | `[mechanism, monitoring]` |

## 6. Hardware / Firmware Constraints

| Hardware | Tested firmware range | Known constraints |
|---|---|---|
| `[YubiKey 5]` | `[5.4.0–5.7.x]` | `[FIDO2 PRF behavior diff at 5.7]` |
| `[YubiKey Bio]` | `[?]` | `[max stored fingerprints, enrollment behavior]` |

## 7. Worked Example: Review Findings H2 / H3 / M4

`[Filled-in example showing a factor design that addresses review findings H2 (no know factor), H3 (Python deps in PRF hot path), M4 (lockout policy unclear).]`

## 8. Cross-references

- Skill: `agentic/code/frameworks/security-engineering/skills/auth-factor-design/SKILL.md`
- Companion docs: `physical-threat-scenarios.md` (coercion is Threat 5), `degraded-mode-matrix.md` (what happens on factor failure)
- Hardware pinning: `supply-chain-pins.yaml`

## 9. Review Trail

| Date | Reviewer | Findings | Resolution |
|---|---|---|---|
| `[date]` | `[reviewer]` | `[findings]` | `[resolution]` |
