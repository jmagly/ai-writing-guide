---
namespace: aiwg
name: physical-threat-modeling
platforms: [all]
description: "Threat library for physical-access threats STRIDE and OWASP Top 10 miss — evil-maid, DMA, hostile peripheral, travel-host, coercion, cold-boot, side-channel."

---

# physical-threat-modeling

Threat library for systems that face physical-access adversaries. Use when designing or reviewing systems that travel, are stored unattended, are operated in shared spaces, or face threat actors with momentary physical access (border crossings, hotel rooms, conferences, theft of laptops).

STRIDE and OWASP Top 10 implicitly assume a network adversary against a fixed-asset server. Their threat enumeration is **silent** on physical attacks — the threat model literally doesn't have categories for "evil-maid swap" or "Thunderbolt DMA". This skill fills that gap.

## Triggers

- "evil maid"
- "DMA attack" / "Thunderbolt attack"
- "travel host" / "airport / border / hotel"
- "hostile peripheral" / "BadUSB"
- "physical access" / "physical adversary"
- "coercion" / "rubber-hose" / "duress"
- "cold boot" / "RAM extraction"
- "supply chain implant"
- "side channel" / "TEMPEST" / "EM emanation"

## When NOT to use this skill

- Pure datacenter/cloud workloads with no portable assets (use STRIDE)
- Pure web app threat modeling (use OWASP)
- Forensics IR after a known compromise (use `forensics-complete`)

---

## Section 1: Threat Library

The library lists ten canonical physical-access threats. For each: applicability conditions, attacker capabilities required, detection difficulty, and remediation patterns. The remediation patterns are references to other skills' solutions — this skill is the enumeration.

### Threat 1: Evil-maid swap of bootstrap / boot media

**Description**: Adversary with brief physical access modifies code that runs before the integrity chain is established (bootloader, init scripts on writable media, USB bootstrap files).

**Applicability**:
- Asset is portable AND left unattended (hotel room, hotel safe, baggage claim, customs)
- Bootstrap code lives on writable media (FAT32 partition, USB MBR, unsigned ESP)
- Boot chain has no signature verification before user data is touched

**Attacker capability**: ~5–30 minutes physical access, basic technical skill, ability to write to the device or swap it.

**Detection difficulty**: Hard — the swap is functionally transparent until the operator runs something that reveals tampering, which the modified bootstrap can prevent.

**Remediation**: `chain-of-trust-design` skill — Pattern A (signed bootstrap blob) + Pattern D (printed hash card), or Pattern B (signed live image so the host code itself isn't on the writable media). Maps to review finding **B3**.

### Threat 2: Thunderbolt / USB-C DMA attack

**Description**: Adversary plugs a hostile DMA-capable peripheral into a Thunderbolt or USB-C port (with PCIe tunneling) and reads RAM via direct memory access, bypassing OS protections.

**Applicability**:
- Host has Thunderbolt 3+, USB-C with PCIe-tunnel, or FireWire
- Asset is in S0 (running) or S3 (sleep) state with secrets in RAM
- IOMMU is disabled or not properly configured

**Attacker capability**: 30–60 seconds, commodity attack tool (PCILeech, Inception), direct port access.

**Detection difficulty**: Detection-only via post-hoc memory analysis. Real-time detection requires DMAR/IOMMU event logging.

**Remediation**: 
- Disable Thunderbolt DMA in BIOS (`Thunderbolt Security Level: User Authorization` or `DisplayPort Only`)
- Enable IOMMU (`intel_iommu=on iommu=pt` Linux kernel)
- Lock screen → S5 (shutdown), not S3 (suspend), in hostile environments
- Use only known peripherals; physically block ports if possible (port blockers)

Maps to review finding **H4**.

### Threat 3: Hostile USB peripheral (BadUSB, keystroke injection)

**Description**: Adversary hands or plants a USB device that presents itself as a HID (keyboard) and runs commands, OR presents itself as a network adapter and intercepts traffic, OR presents as a mass storage device and exploits autorun.

**Applicability**:
- Host accepts USB devices without user authorization per device
- USB authorization (`/sys/bus/usb/.../authorized`) not enforced
- Operator plugs in unverified devices (gifted, found, public charging)

**Attacker capability**: Pre-attack hardware preparation; one-shot usage; deniability.

**Detection difficulty**: Hard at runtime; possible via USB authorization logs, USBGuard rules.

**Remediation**:
- USB authorization daemon (`USBGuard`) with allowlist
- Disable USB classes you don't use (mass storage, HID-from-storage)
- Use USB data blockers ("USB condoms") when charging from untrusted sources
- BIOS-level USB boot disabled when not provisioning

### Threat 4: Travel-host root compromise

**Description**: The host the operator uses to access the secret system is itself compromised at the OS or firmware level. Anything that runs on it — including the secrets pipeline — is observed by the adversary.

**Applicability**:
- Host is shared, public, hotel-provided, or has been out of operator's continuous custody
- Operator brings the secret system to the host (USB plug-in)
- Host runs an unsigned, unattested OS

**Attacker capability**: Persistent root malware; potentially firmware persistence.

**Detection difficulty**: Hard — root malware can hide from standard tools.

**Remediation**: This is the **single highest-leverage** mitigation for portable secret systems.

- **Boot the host from a signed live image** (Pattern B in `chain-of-trust-design`). The host stops being a trust dependency.
- Measured boot with TPM attestation against a known-good PCR set
- Forbid Docker fallback in production (Docker shares the host kernel; against kernel-resident adversary it's not a boundary)

Maps to review finding **H4**.

### Threat 5: Coercion of operator (rubber-hose attack)

**Description**: Adversary compels the operator (legally, threateningly, or via deception) to authenticate against the secret system.

**Applicability**:
- Operator is identifiable as a target
- Operator can be intercepted in person (border crossing, raid, kidnapping)
- System has no "what you know" factor (biometric + hardware = both available under duress)

**Attacker capability**: Physical access to operator AND device.

**Detection difficulty**: After-the-fact; sometimes never.

**Remediation**: `auth-factor-design` skill —
- FIDO2 PIN as a "what you know" factor (review finding H2)
- Duress codes (PIN that triggers wipe/silent-alarm)
- Time-locks, witness requirements, geographic fences

Maps to review finding **H2**.

### Threat 6: Cold-boot RAM extraction

**Description**: Adversary cools and removes RAM modules (or freezes the host with liquid nitrogen) to preserve the contents long enough to read out secrets that were unlocked in memory.

**Applicability**:
- Host can be physically opened
- Secrets are in plaintext in RAM
- Operating system/host doesn't crypto-protect RAM at rest

**Attacker capability**: Physical access; cooling spray (commodity); 5–10 minutes uninterrupted.

**Detection difficulty**: Impossible at runtime; possible via post-hoc inventory check.

**Remediation**:
- Reduce window: lock to S5 (full shutdown), not S3 (suspend), in hostile environments
- Use hardware features when available: Intel TME (Total Memory Encryption), AMD SME, Apple Silicon's secure enclave for sensitive computations
- Don't store keys in long-lived process memory — derive on demand and zeroize
- Accept residual risk: cold-boot is hard to fully eliminate without specialized hardware

### Threat 7: Hardware implant in supply chain

**Description**: A device is intercepted in supply chain (during shipment, at customs, by a malicious supplier) and a hardware implant is added — modified firmware, added microcontroller on motherboard, modified USB cable.

**Applicability**:
- High-value target
- Hardware sourced from untrusted supplier or shipped without tamper-evident packaging
- No hardware verification post-receipt

**Attacker capability**: Resourced adversary — nation-state, well-funded criminal group.

**Detection difficulty**: Very hard. Requires hardware teardown + comparison to known-good.

**Remediation**:
- Procurement controls: known vendor, tamper-evident shipping, randomized purchase patterns
- Out-of-band verification: photograph hardware on receipt; compare to known-good
- Firmware verification (where feasible): re-flash to known-good firmware on receipt
- Diversity: don't depend on a single hardware vendor for critical-path crypto
- Accept residual risk; document explicitly

### Threat 8: Side-channel observation (acoustic, EM, power, thermal)

**Description**: Adversary observes physical emanations from the device — fan noise, EM radiation, power consumption, thermal output — and infers cryptographic operations, key bits, or content.

**Applicability**:
- Adversary is physically near the device (within meters for EM, room for acoustic, electrical-network for power)
- Cryptographic operations are not constant-time
- Hardware emanations are not shielded

**Attacker capability**: Specialized equipment for advanced attacks; acoustic and timing attacks have been demonstrated with consumer microphones.

**Detection difficulty**: Detection-only via specialized monitoring.

**Remediation**:
- Use constant-time cryptographic libraries (libsodium, RustCrypto, BearSSL)
- Don't allow user-supplied data to influence timing of cryptographic operations
- Physical: shielded room (SCIF) for the most sensitive operations; otherwise accept and document

### Threat 9: Visual / shoulder-surfing / camera observation

**Description**: Adversary observes the screen or keyboard during operation — direct shoulder-surf, hidden camera, reflection in glass.

**Applicability**:
- Operations involve typing secrets (passwords, recovery phrases)
- Public or semi-public location
- Display visible to others

**Attacker capability**: Trivial — anyone with line of sight or a phone camera.

**Detection difficulty**: Easy if you're paying attention; hard otherwise.

**Remediation**:
- Privacy filter on screen
- Secrets via hardware token (no display required)
- Operate in privacy-respecting locations for high-value steps
- Recovery phrases: write once, on paper, in a private location

### Threat 10: Lost or stolen device (no other compromise)

**Description**: Adversary obtains the device but does not have keys, bio, or operator. Pure theft scenario.

**Applicability**: Always relevant for portable assets.

**Attacker capability**: Has the device; can attempt offline brute force, can preserve for later authenticated access.

**Detection difficulty**: Operator typically notices loss within hours; some scenarios (luggage skimming) may not be noticed.

**Remediation**:
- LUKS / full-disk encryption on operator media
- No plaintext secrets at rest (review finding B4 anti-pattern)
- Hardware factors (YubiKey, Bio key) are physically separate from media — loss of media doesn't include loss of keys
- Remote-wipe / rotation procedure when loss is detected

This is the **expected** scenario the system is designed for. If the design fails this scenario, the design is broken.

---

## Section 2: Threat applicability decision tree

Not every system needs to consider every threat. Walk this tree to identify which threats apply:

```
Is the asset portable (travels with operator)?
├── YES → Threats 1, 2, 3, 4, 5, 6, 9, 10 apply
│         If high-value target: + 7
│         If TEMPEST-relevant operation: + 8
└── NO (datacenter / fixed)
    ├── Is the asset accessible to non-employees (cleaning, contractors)? 
    │   ├── YES → Threats 1, 3, 6 apply (limited)
    │   └── NO (controlled DC) → Threats 7, 8 apply (resourced adversary only)
```

For each applicable threat, document in `physical-threat-scenarios.md` (template):

- Whether the system addresses it
- Which mitigation pattern
- Residual risk after mitigation

---

## Section 3: Cross-references to mitigation skills

| Threat | Primary mitigation skill |
|---|---|
| 1. Evil-maid bootstrap swap | `chain-of-trust-design` |
| 2. DMA attack | (BIOS-level config; no skill — see Threat 2 remediation above) |
| 3. Hostile USB peripheral | (USB authorization; no skill yet) |
| 4. Travel-host compromise | `chain-of-trust-design` Pattern B (signed live image) |
| 5. Coercion | `auth-factor-design` (PIN factor, duress) |
| 6. Cold-boot RAM | `secret-handling-runtime` (memory hygiene); BIOS-level S5 lock |
| 7. Hardware implant | `supply-chain-trust` (procurement, diversity) |
| 8. Side-channel | (constant-time libs; physical shielding) |
| 9. Shoulder-surf | (operational pattern; privacy filter) |
| 10. Lost device | LUKS + factor separation (basic hygiene) |

---

## Section 4: Worked examples

### Review B3 — evil-maid via unsigned bootstrap

This skill flags Threat 1 as in-scope. Mitigation per `chain-of-trust-design` (Pattern A + D). Cross-reference recorded in `physical-threat-scenarios.md` and `chain-of-trust-design.md`.

### Review H4 — travel-host blast radius

This skill flags Threats 1, 2, 4, 6 as all in-scope for portable operator secrets system. Mitigations:

- Threat 1: signed bootstrap (chain-of-trust)
- Threat 2: BIOS DMA disable (documented in `chain-of-trust-design.md` open assumptions)
- Threat 4: signed live image (chain-of-trust Pattern B — single highest leverage)
- Threat 6: lock to S5 in hostile environments; document in operator runbook

---

## Section 5: Output format

When invoked, produce a `physical-threat-scenarios.md` document (template) covering applicable threats, mitigations, and residual risk. When invoked as part of a review, produce findings in standard format identifying threats not yet addressed.

This skill is also referenced by `sdlc-complete/skills/security-assessment` when the threat-model template's "Physical Access Considerations" section is non-empty (see Tier 2 issue #1079).

---

## Related

- **Threat-model extension**: existing `sdlc-complete/templates/security/threat-model-template.md` will be extended with a "Physical Access Considerations" section that triggers this skill (#1079)
- **Template**: `physical-threat-scenarios.md`
- **Companion skills**: `chain-of-trust-design`, `auth-factor-design`, `secret-handling-runtime`, `supply-chain-trust`

## Standards referenced

- NIST SP 800-114 — User's Guide to Telework and BYOD Security (travel host scope)
- NIST SP 800-88 — Media Sanitization (lost device cleanup)
- "TEMPEST: A Signal Problem" — NSA declassified document (Threat 8 history)
- CIS Critical Security Controls v8 — physical security mappings
- "Lest We Remember: Cold-Boot Attacks on Encryption Keys" (Halderman et al., 2008)
