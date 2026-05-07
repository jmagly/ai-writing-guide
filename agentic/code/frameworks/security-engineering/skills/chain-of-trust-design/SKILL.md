---
namespace: aiwg
name: chain-of-trust-design
platforms: [all]
description: "Decision aid for bootstrap and verification chains — forces the 'what authenticates the authenticator' question; patterns for signed bootstrap, measured boot, recovery."

---

# chain-of-trust-design

Decision aid for the integrity chain that protects a system from first byte executed to first secret derived. Use this skill when designing or reviewing any system that has a "boot" step, an "unlock" step, or a "first run" step where code outside your trust boundary must be trusted to load code inside it.

The skill exists to force the question almost everyone forgets: **what authenticates the code that authenticates everything else?**

## Triggers

Primary phrases match automatically. Alternates:

- "bootstrap signing" / "signed bootstrap"
- "evil maid" / "physical access attacker"
- "measured boot" / "TPM attestation"
- "verify the verifier"
- "unsigned scripts" / "is this script trusted"
- "first-run integrity"
- "USB boot integrity"

## When NOT to use this skill

- Networked TLS chain-of-trust (different domain — use a peer-reviewed PKI design)
- Code-signing for application updates *after* boot (use Sigstore, signify, or platform store; this skill is about the layer below)
- Software-supply-chain trust *upstream* of build (handled by `supply-chain-trust` skill — Tier 2)

---

## Section 1: The core question

Every system that processes secrets has a chain of code, where each link must trust the previous one. The chain typically looks like:

```
firmware → bootloader → kernel → init/userland → application → secrets
```

Or, in a portable-secrets context:

```
travel-host firmware → BIOS → USB boot → unlock.sh → LUKS unlock → install-pkgs.sh → secrets pipeline
```

For each arrow, ask: **what authenticates the next link?**

If the answer is "the previous link verifies a manifest" — fine, but then ask: **what authenticates the previous link?** Trace it all the way back. The chain MUST terminate at:

- A **hardware root of trust** (TPM PCR measurement, Secure Boot pubkey in firmware), OR
- An **operator-carried secret** (a printed hash card, a signed binary on a piece of media you carry physically), OR
- An **assumption** (e.g., "the firmware is trusted") that is documented and accepted

If the chain terminates in a circular reference — "the manifest verifies the scripts, the scripts verify the manifest" — you have **no chain of trust at all**. This is the failure mode in review finding B3.

---

## Section 2: Anti-patterns (BLOCK on these)

### Circular trust

```
unlock.sh on FAT32 partition
  ↓ (verifies)
manifest.sha256 on FAT32 partition
  ↓ (lists hash of)
unlock.sh on FAT32 partition
```

Both files live on unauthenticated media. An evil-maid attacker swaps `unlock.sh` AND `manifest.sha256` consistently. Detection: zero. → **BLOCK**

### Unsigned bootstrap on writable media

Any executable on writable storage that runs before the integrity chain is established. → **BLOCK**

### "Override" prompt on integrity failure

```
[!] Manifest verification failed. Type Y to continue:
```

Operators learn to autoresponse-Y. The override defeats the integrity check on the exact pathway integrity matters most: when something is wrong. → **BLOCK** (see `degraded-mode-design` skill, Tier 2, for the multi-step ceremony alternative)

### "We use SHA-256 of the scripts" without offline-signed pubkey

Hashing is not signing. Anyone with write access to the manifest can replace it. Hashing only authenticates if the hash itself is delivered through a separately-trusted channel (printed card, hardware-fused).

### Scripts that mount LUKS before integrity is verified

The unlock script IS the high-value target. Verify its integrity before running it, or you've gained no security from LUKS.

---

## Section 3: Pattern catalog

Pick at least one. The patterns are not mutually exclusive — defense in depth combines two or more.

### Pattern A: Signed bootstrap blob with offline key

**Shape**: Ship `bootstrap.tar` plus `bootstrap.tar.sig` plus a small static-linked verifier (`verify`) on the same media. The verifier has an embedded ed25519 public key. The private key is offline (HQ, hardware-stored).

```
USB layout:
  /verify              ← static, ~50 KB, embedded pubkey
  /bootstrap.tar       ← contains unlock.sh, install-pkgs.sh, .deb files, manifests
  /bootstrap.tar.sig   ← Ed25519 signature over bootstrap.tar

Operator runs:
  ./verify bootstrap.tar bootstrap.tar.sig && tar xf bootstrap.tar && ./unlock.sh
```

**What this gives you**: Evil-maid swap of `unlock.sh` requires also forging an Ed25519 signature → infeasible without HQ private key.

**What this does NOT give you**: Trust in `verify` itself. The verifier is on the unauthenticated media. Mitigations:

1. Make `verify` minimal and reproducibly built — anyone can audit it
2. Print a SHA-256 of `verify` on a card the operator carries; check before running
3. Better: combine with Pattern B or C

**Suggested defaults**:
- Signature: Ed25519 via libsodium or Rust `ring`
- Verifier build: Rust with `#![no_std]`, statically linked, reproducibly built
- Key custody: offline, hardware-token-protected (FIDO2 PRF or HSM)

**Vetted alternatives**:
- `signify` (OpenBSD) — minimal verifier already exists; use if you want zero custom code
- `minisign` — `signify` with extras (prehashed mode)
- Sigstore Cosign — heavier, network-aware; pick when you want transparency log integration

### Pattern B: Signed live image (Tails-style)

**Shape**: The "operating environment" is itself the signed thing. Boot from a signed read-only image; the USB you carry only contributes data, not code.

```
Travel host:
  → BIOS verifies bootloader signature (Secure Boot)
  → Bootloader verifies live-image signature
  → Live image kernel + userland is read-only
  → User USB plugs in for data only

Threat collapses to: trusted firmware + your USB.
```

**What this gives you**: Massive blast-radius reduction (review finding H4). The travel host stops being a trust dependency.

**What this does NOT give you**: Protection against firmware-level adversary or hardware implant. Combine with Pattern C.

**Suggested defaults**:
- Build: NixOS image (reproducible by construction) OR Tails (community-vetted, anonymity-focused)
- Signing: integrate with the distro's existing signing (NixOS: `nix-store --verify`; Debian-based: signed `Release` file)
- Boot: Secure Boot with operator-controlled keys (sbctl), not Microsoft's defaults

### Pattern C: Measured boot + TPM remote/local attestation

**Shape**: TPM measures every stage of boot into PCRs. Refuse to derive secrets if PCRs don't match a known-good set.

```
PCR measurements taken at:
  PCR 0    — firmware
  PCR 4    — bootloader
  PCR 7    — Secure Boot policy
  PCR 8    — kernel + initrd
  PCR 9    — kernel command line

Unlock requires: TPM2_Unseal succeeds against the known-good PCR set
```

**What this gives you**: Binds secret access to a non-tampered boot chain. Evil-maid swap → PCRs change → unseal fails → no secrets.

**What this does NOT give you**: Anything if the TPM is compromised, the firmware is malicious, or the operator is coerced into running with sealed values that match a malicious chain ("seal your secret to my malicious kernel").

**Suggested defaults**:
- Tooling: `systemd-cryptenroll --tpm2-pcrs=...`, `tpm2-tools`, `clevis` for higher-level sealing
- PCR set: 0, 2, 4, 7, 8 (firmware, option ROMs, bootloader, Secure Boot policy, kernel)
- Backup unseal: secondary path with hardware token (review finding H5: backup story)

### Pattern D: Printed hash card (operator-carried)

**Shape**: The operator carries a piece of paper (or laminated card) with a SHA-256 of the bootstrap blob. Manually compares before running.

```
Card:
  bootstrap.tar.sig SHA-256:
  a1b2 c3d4 e5f6 0708 1a2b 3c4d 5e6f 7081
  9a8b 7c6d 5e4f 3021 1a2b 3c4d 5e6f 7080

Operator runs:
  sha256sum bootstrap.tar.sig
  # compares first/last 4 groups against card
```

**What this gives you**: A truly out-of-band trust anchor, immune to USB tampering.

**What this does NOT give you**: Operational ergonomics; it's tedious and skipped under time pressure. Use as a SECONDARY check, not the only one.

**Suggested defaults**:
- Compare a prefix and suffix (first 4 + last 4 hex groups), not the full hash — operators won't read 64 hex digits accurately
- Card laminated, signed by HQ, dated, with revocation procedure documented

---

## Section 4: Decision matrix

```
                              Pattern A      Pattern B      Pattern C      Pattern D
                              (signed       (signed live   (measured      (printed
                              blob)         image)         boot/TPM)      hash card)

Defeats evil-maid swap        YES           YES            YES            partial*
Defeats compromised host      no            YES            YES            no
Defeats firmware compromise   no            no             partial**      YES
Recovery if hardware fails    moderate      easy           hard           moderate
Operator burden               low           lowest         low            HIGH
Hardware dependency           none          UEFI/SB        TPM 2.0        none
Greenfield-friendly           YES           YES            YES            yes
Retrofit-friendly             yes           moderate       moderate       yes

*  Pattern D detects evil-maid only if the operator actually checks
** Pattern C with operator-controlled Secure Boot keys; otherwise firmware compromise unseals secrets
```

**Recommended starting point**: combine Pattern B (signed live image) + Pattern A (signed user-data blob). The live image is the trusted environment; the USB user-data has a signed manifest validated against an HQ Ed25519 pubkey embedded in the live image. This is the answer for review finding B3 + H4.

---

## Section 5: Trust anchor inventory (mandatory exercise)

Before declaring any chain-of-trust design complete, fill out:

| Anchor | What is it? | Who controls it? | Compromise impact |
|---|---|---|---|
| HQ signing key | Ed25519 private key for bootstrap signing | HQ ops, hardware token | Total: attacker can sign malicious bootstrap |
| Operator USB | The physical USB device | Operator | Loss alone: nothing (LUKS at rest); loss + travel host compromise: partial |
| Travel host firmware | UEFI + Secure Boot keys | … | … |
| TPM PCR baseline | Known-good PCR set sealed at provisioning | HQ + per-device | … |
| Operator-carried card | Printed hash | Operator | Detection of out-of-band tampering |

Every anchor MUST be:

1. **Identified**: who or what holds it
2. **Protected**: how is it kept from being lost or copied
3. **Rotatable**: what is the procedure when it's lost or compromised
4. **Tested**: have you actually run the rotation procedure?

If any row has "TBD" in any column, the design is not complete.

---

## Section 6: The "verify the verifier" recursion

For every signed component, you have to answer "what verifies the signer?". The recursion terminates at one of:

1. **Hardware** — a key fused into firmware (Secure Boot, TPM endorsement key)
2. **Physical** — something the operator carries (a printed key fingerprint, a signed binary on physically separate media)
3. **Documented assumption** — explicitly stated and accepted

A common failure mode is **incomplete recursion**: stating "the bootstrap is signed by HQ" without saying how the operator validates HQ's pubkey. The pubkey must:

- Be embedded in a verifier whose integrity is established by some other means (Pattern D card, Secure Boot embedded firmware, etc.), AND
- Be rotatable when compromise is suspected

If you can't draw this recursion ending at hardware or physical, the chain is incomplete.

---

## Section 7: Recovery and rotation

A chain of trust must include:

| Procedure | Documented? | Tested? |
|---|---|---|
| Operator USB lost | … | … |
| Travel host fails / unavailable | … | … |
| HQ signing key compromise | … | … |
| TPM hardware failure | … | … |
| Firmware update breaks PCR seal | … | … |
| Bootstrap pubkey rotation | … | … |

**Untested procedures don't exist.** Every project should run a tabletop exercise (review recommendation #10) walking through "USB stolen but keys retained" and "USB plus one key stolen" before declaring the design production-ready.

---

## Section 8: Worked example — review finding B3

Original design:
```
unlock.sh + install-pkgs.sh on FAT32 (unencrypted)
checksum.manifest on FAT32 (unencrypted)
unlock.sh "verifies" checksum.manifest — but checksum.manifest names unlock.sh
```

What this skill flags:
- Section 2 anti-pattern: **circular trust** → BLOCK
- Section 5: no trust anchor inventory exists
- Section 6: recursion does not terminate at hardware or physical anchor

Remediation options (review's "pick at least one"):
1. **Pattern A only**: ship `unlock.sh.sig` + a static `verify` binary + an embedded Ed25519 pubkey. Operator runs `./verify` first.
2. **Pattern B**: boot the travel host from a signed live image. The image embeds the HQ pubkey. The USB only carries `unlock.sh.sig` + encrypted data.
3. **Pattern C**: enroll the LUKS unlock against TPM PCR measurements; if `unlock.sh` is swapped, PCRs change, unseal fails.
4. **Pattern D as backup**: print SHA-256 of `verify` (or of `unlock.sh.sig`) on a card the operator carries.

The strongest combination: **B + A + D**. Live image gives you trusted environment; signed user-data gives you tamper-evidence on the USB; printed card gives you an out-of-band sanity check.

---

## Section 9: Output format

When this skill is invoked as part of a review, produce findings in this format:

```markdown
### Finding: <SHORT-NAME>

**Severity**: BLOCK | HIGH | MEDIUM | LOW
**Location**: <file or component>
**Section**: Chain-of-trust design, <section reference>

**Issue**: <what's broken in the chain>

**Trust anchor inventory** (if relevant):
- Anchor 1: …
- Anchor 2: …
- Missing: <what isn't anchored>

**Remediation**:
<concrete pattern recommendation, A/B/C/D combination>

**References**:
- <NIST SP 800-193, NIST SP 800-147, RFC, etc.>
```

When a `chain-of-trust-design.md` (template — see `templates/chain-of-trust-design.md`) is being created, this skill drives the **Trust anchors**, **Boot chain diagram**, **Verification matrix**, **Recovery and rotation**, and **Open assumptions** sections.

---

## Related

- **Companion skill**: `crypto-primitive-selection` (you'll use it for choosing the signing primitive)
- **Tier 2 skill**: `physical-threat-modeling` (enumerates evil-maid, DMA, hostile peripheral threats this skill mitigates)
- **Tier 2 skill**: `degraded-mode-design` (override-prompt anti-pattern remediation)
- **Agent**: `secure-bootstrap-reviewer` — narrow-scope reviewer that loads this skill on activation
- **Template**: `chain-of-trust-design.md`

## Standards referenced

- NIST SP 800-147 (BIOS Protection Guidelines)
- NIST SP 800-155 (BIOS Integrity Measurement Guidelines)
- NIST SP 800-193 (Platform Firmware Resiliency Guidelines)
- TCG TPM 2.0 Library Specification
- UEFI Secure Boot specification
- Reproducible Builds (`reproducible-builds.org`)
