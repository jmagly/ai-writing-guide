# Chain of Trust Design

> **Template usage**: One record per system or product whose boot/bootstrap chain processes secrets. Lives in `.aiwg/security-engineering/chain-of-trust/<system-name>.md`. Driven by the `chain-of-trust-design` skill and reviewed by the `secure-bootstrap-reviewer` agent. Replace all `[bracketed]` placeholders.

## Document Control

| Field | Value |
|-------|-------|
| System | `[Name of the system or component]` |
| Document ID | `[COT-NNN]` |
| Date Created | `[YYYY-MM-DD]` |
| Date Last Reviewed | `[YYYY-MM-DD]` |
| Authors | `[Bootstrap Reviewer, System Architect]` |
| Reviewers | `[Independent reviewer]` |
| Status | `[Draft / Under Review / Approved / Implemented / Superseded]` |
| Classification | `[Public / Internal / Confidential]` |

## 1. Trust Anchors

> **What is the smallest thing that must be trusted, and why?** This is the section that determines whether the design has a real chain at all. Every other section depends on getting this right.

### Inventory

| Anchor | Type | Holder | Compromise impact | Rotation procedure | Last tested |
|---|---|---|---|---|---|
| `[e.g., HQ Ed25519 signing key]` | hardware-token / printed / firmware-fused / TPM-sealed / operator-carried | `[who]` | `[total / partial / detection-only]` | `[procedure ref]` | `[YYYY-MM-DD]` |

`[Add one row per anchor. EVERY row must have all fields filled in. "TBD" means the design is incomplete.]`

### Termination check

For each chain in the system, the trust recursion MUST terminate at a row from the inventory above. Confirm here:

- Chain `[name]` terminates at: `[anchor name from table]`
- Chain `[name]` terminates at: `[anchor name from table]`

If a chain does not terminate at a listed anchor, the design is BLOCKED.

### Documented assumptions (when termination is "trust this")

`[List explicit assumptions and the reasoning that justifies accepting them. Examples: "We assume the travel host firmware is not malicious, because operators are trained to use only company-provided hardware with locked BIOS." Each assumption must include who is responsible for maintaining it.]`

## 2. Boot Chain Diagram

```mermaid
sequenceDiagram
    autonumber
    participant FW as Firmware (UEFI)
    participant BL as Bootloader
    participant K  as Kernel + initrd
    participant U  as Userland (unlock.sh)
    participant L  as LUKS volume
    participant S  as Secrets pipeline

    FW->>BL: Verify signature (SB key X)
    BL->>K: Verify signature (SB key X)
    K->>U: [INSERT VERIFICATION HERE]
    U->>L: Unlock with derived key
    L->>S: Mount; pipeline reads secrets
```

`[Replace with the actual chain. Every arrow must be labeled with what authenticates the next step. If any arrow is unlabeled or "trust", call it out in §3.]`

## 3. Verification Matrix

For each stage, document what authenticates it.

| Stage | Verifies the next stage how? | Key / cert source | Failure mode | Failure behavior |
|---|---|---|---|---|
| Firmware (UEFI) | `[Secure Boot signature against PK/KEK/db]` | `[operator-controlled / OEM]` | `[invalid signature]` | `[refuse to boot]` |
| Bootloader | `[verifies kernel + initrd]` | `[same SB chain]` | `[invalid signature]` | `[refuse to boot]` |
| Kernel + initrd | `[?]` | `[?]` | `[?]` | `[?]` |
| Userland bootstrap | `[?]` | `[?]` | `[?]` | `[?]` |
| Secrets pipeline | `[?]` | `[?]` | `[?]` | `[?]` |

`[Every "?" represents a missing link in the chain. Fill them in with concrete answers or document them as accepted gaps in §1.]`

### Failure-behavior policy

The default behavior on integrity failure MUST be **fail closed** (refuse to proceed, no recovery via operator override). If any row above has "warn but continue" or "operator can override", justify here:

- `[stage]`: `[justification, threat-model alignment]`
- (See `degraded-mode-design` skill, Tier 2, for multi-step ceremony patterns when override is unavoidable)

## 4. Pattern Selection

This design implements which patterns from the `chain-of-trust-design` skill?

- [ ] Pattern A — Signed bootstrap blob with offline key
- [ ] Pattern B — Signed live image
- [ ] Pattern C — Measured boot + TPM attestation
- [ ] Pattern D — Printed hash card (operator-carried)

For each selected pattern, document:

### Pattern `[A/B/C/D]` implementation

- **Tooling**: `[e.g., signify, Cosign, sbctl, tpm2-tools, custom verifier]`
- **Configuration**: `[key paths, PCR set, signature format, embedding strategy]`
- **Verification step**: `[exact command/operation the operator or automation runs]`
- **Failure handling**: `[fail-closed default; deviation justifications]`

## 5. Threat Scenarios Addressed

For each scenario, document whether this design defeats it.

| Scenario | Defeated? | Mitigation |
|---|---|---|
| Evil-maid swap of bootstrap script | `[Yes / No / Detection only]` | `[which pattern]` |
| Compromised travel host (root malware) | `[?]` | `[?]` |
| Thunderbolt / USB-C DMA attack | `[?]` | `[BIOS DMA disable, IOMMU, etc.]` |
| Hostile USB peripheral (BadUSB) | `[?]` | `[?]` |
| Cold-boot RAM extraction | `[?]` | `[?]` |
| Hardware implant in supply chain | `[?]` | `[?]` |
| Supply-chain compromise of build host | `[?]` | `[reproducible builds, signed transparency log]` |
| Coercion of operator | `[?]` | `[duress procedure, see auth-factor-design skill]` |

`[Reference the physical-threat-modeling skill (Tier 2) for the canonical scenario list.]`

## 6. Recovery and Rotation

Every chain of trust must include tested procedures for compromise and failure.

### Recovery procedures

| Event | Procedure | Tested? | Last test date | Next test due |
|---|---|---|---|---|
| Operator media lost/stolen | `[procedure ref or "TBD"]` | `[Y/N]` | `[date]` | `[date]` |
| Travel host fails | `[…]` | | | |
| Signing key compromise (HQ) | `[revoke pubkey on all media, reissue]` | | | |
| Signing key custody lost | `[…]` | | | |
| TPM hardware failure | `[…]` | | | |
| Firmware update breaks PCR seal | `[…]` | | | |
| Secure Boot key rotation | `[…]` | | | |

**Rule**: an untested procedure does not exist. Any row with "Tested? = N" represents a recovery path that is purely aspirational.

### Tabletop exercise log

| Date | Scenario walked through | Witnesses | Findings | Procedure updates |
|---|---|---|---|---|
| `[YYYY-MM-DD]` | `[e.g., "USB stolen, both YubiKeys retained"]` | `[names]` | `[gaps found]` | `[document refs]` |

## 7. Open Assumptions

Document every assumption the design relies on but does not enforce.

- **Assumption**: `[e.g., "Travel host BIOS does not have an unauthenticated remote management interface"]`
  - **Why we accept it**: `[reasoning, e.g., "operator hardware is procured from a known vendor and BIOS-flashed at HQ"]`
  - **Owner**: `[who validates this assumption stays true]`
  - **Compromise impact**: `[what happens if the assumption breaks]`

- **Assumption**: `[…]`

## 8. Open Questions / Unresolved Risks

- `[anything the design doesn't yet answer]`

## 9. Cross-references

- Threat model: `[link]`
- Skill: `agentic/code/frameworks/security-engineering/skills/chain-of-trust-design/SKILL.md`
- Related decisions: `[COT-NNN, CRYPTO-DEC-NNN — likely a CRYPTO-DEC for the signing primitive]`
- Tier 2 references: `physical-threat-scenarios.md`, `degraded-mode-matrix.md`, `factor-design-rationale.md`

## 10. Review Trail

| Date | Reviewer | Findings | Resolution |
|------|----------|----------|------------|
| `[YYYY-MM-DD]` | `[Reviewer]` | `[Findings]` | `[Resolution]` |

`[Per review recommendation #9: independent reviewer required before "Approved" status.]`

---

# Worked Example: Pattern B+A+D for review finding B3

The following is a sketch of how this template captures the recommended fix for review finding B3 (unsigned bootstrap chain).

## Document Control (excerpt)

| Field | Value |
|---|---|
| System | Agent-in-a-Box portable secrets system |
| Document ID | COT-001 |
| Date Created | 2026-05-03 |
| Status | Draft (post-review remediation) |

## 1. Trust Anchors (excerpt)

| Anchor | Type | Holder | Compromise impact | Rotation procedure | Last tested |
|---|---|---|---|---|---|
| HQ bootstrap signing key | Ed25519 private key, FIDO2-protected | HQ ops | Total: attacker can sign malicious bootstrap | Revoke embedded pubkey in next live image build, reissue media | TBD (must test before production) |
| Live-image signing key | Ed25519 private key, offline | HQ ops | Total: malicious live image | Same as above | TBD |
| Operator USB | Physical device | Operator | Loss alone: nothing (LUKS at rest) | Reissue: rebuild encrypted volume with new challenge files | n/a |
| Printed hash card | Paper card | Operator | Detection-only | Reprint with new fingerprint on rotation | TBD |

Termination: every chain in this system terminates at either (a) the operator-controlled Secure Boot key fused into firmware, or (b) the printed hash card the operator carries. No assumption rows.

## 2. Boot Chain Diagram

```mermaid
sequenceDiagram
    autonumber
    participant FW as UEFI Firmware
    participant SB as Secure Boot
    participant LI as Live Image
    participant V  as Embedded Verifier
    participant U  as User USB Bootstrap
    participant L  as LUKS volume
    participant S  as Secrets pipeline

    FW->>SB: Verify (operator-controlled SB key)
    SB->>LI: Verify live-image signature (LI signing pubkey in SB db)
    LI->>V: Mount; verifier is part of LI
    V->>U: Verify bootstrap.tar.sig against HQ Ed25519 pubkey embedded in LI
    V->>U: Operator confirms hash via printed card (Pattern D)
    U->>L: unlock.sh runs; derives LUKS key
    L->>S: Mount; secrets pipeline runs in LI userland
```

## 3. Verification Matrix (excerpt)

| Stage | Verifies the next stage how? | Key / cert source | Failure mode | Failure behavior |
|---|---|---|---|---|
| UEFI Firmware | Secure Boot signature against operator-controlled PK | Hardware-fused; operator-rotated | invalid sig | refuse to boot |
| Live Image | Embedded verifier checks Ed25519 sig over user data | HQ pubkey embedded in LI | invalid sig | abort; alert |
| Embedded Verifier | (verifies user-data bootstrap) | HQ pubkey + printed hash card cross-check | invalid sig OR card mismatch | abort; alert |
| User-data Bootstrap | (executes unlock.sh) | n/a — already verified | n/a | n/a |

## 4. Pattern Selection

- [x] Pattern A — Signed bootstrap blob with offline key
- [x] Pattern B — Signed live image
- [ ] Pattern C — Measured boot (deferred; would add defense in depth, not yet in scope)
- [x] Pattern D — Printed hash card (operator-carried)

`[For each, fill in tooling/configuration/verification step/failure handling per template structure.]`

## 5. Threat Scenarios Addressed (excerpt)

| Scenario | Defeated? | Mitigation |
|---|---|---|
| Evil-maid swap of bootstrap script | Yes | Pattern A signature + Pattern D card check |
| Compromised travel host (root malware) | Yes | Pattern B (host runs only signed live image) |
| Thunderbolt / USB-C DMA attack | Partial | BIOS-level DMA disable required; documented in §7 assumptions |
| Hostile USB peripheral | Detection only | Live image refuses unknown USB classes; mitigation not strong |
| Cold-boot RAM extraction | No | Out of scope for this design; documented |
| Hardware implant supply chain | No | Out of scope; HQ procurement controls (assumed) |
| Build-host supply chain | Yes | Reproducible build of live image; signed by offline key |
| Operator coercion | No | Handled by `auth-factor-design` skill; not this layer |

## 6. Recovery (excerpt)

`[Each recovery procedure documented, with explicit "Tested? = N" rows that must be addressed before production.]`

## 7. Open Assumptions

- **Assumption**: BIOS DMA-over-Thunderbolt is disabled.
  - **Why we accept it**: Operator hardware is BIOS-locked at HQ; documented in operator runbook §3.4.
  - **Owner**: HQ provisioning lead.
  - **Compromise impact**: Cold RAM extraction of unlocked secrets becomes feasible in <30 seconds.

- **Assumption**: UEFI firmware is not malicious.
  - **Why we accept it**: Operator hardware is procured from `[vendor]`, with firmware update policy documented in `[reference]`.
  - **Owner**: HQ procurement.
  - **Compromise impact**: Total — malicious firmware can extract anything.
