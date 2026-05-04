---
id: no-key-reuse-across-purposes
severity: HIGH
applies_to: [all-agents, applied-cryptographer]
tags: [cryptography, key-management, hkdf, domain-separation]
---

# No Key Reuse Across Purposes

**Enforcement Level**: HIGH
**Scope**: Any code that uses cryptographic keys
**Framework**: security-engineering

## Rule

The same key material MUST NOT be used for two different cryptographic purposes. Distinct purposes require distinct keys, derived via HKDF-Expand with explicit domain-separation labels (the `info` parameter).

Common purpose pairs that MUST be separated:

- Encryption key vs. authentication key (when wrapping a non-AEAD mode in a MAC)
- Encryption key vs. signing key
- Encryption key vs. KDF master key
- Two encryption keys for different data classes (e.g., user-data vs. metadata)
- Token signing key vs. token encryption key (e.g., JWT signing vs. JWE wrapping)
- Long-term identity key vs. session key

## Why

Key reuse across purposes opens cryptographic shortcuts that turn one compromise into many. The textbook example: if `enc_key == mac_key`, an attacker who learns the MAC key (e.g., via a side channel on a verifier) immediately has the encryption key. Worse, certain combined uses introduce new attacks the primitives don't have individually — e.g., signing the hash of an encryption operation can leak structure of the plaintext.

Modern cryptographic engineering treats keys like single-use credentials: each key has exactly one purpose, in exactly one direction. Domain separation via HKDF is the cheapest, simplest way to ensure this — a single Input Keying Material (IKM) deterministically produces any number of independent purpose-keys.

Source: review finding B2 (2026-05-03 gap analysis) — `sign_dual` produced `SHA-256(manifest || derived_key)` where `derived_key` was also the encryption key. Two violations: ad-hoc construction (see `no-adhoc-kdf`) and key reuse.

## How to apply

### Detection

Code patterns indicating likely violation:

- A single variable feeds both `encrypt(...)` and `hmac(...)` / `sign(...)` calls
- `key_material` derived once, used unwrapped in multiple call sites
- A "signature" function that takes the same key as an "encrypt" function
- KDF output of length `N*2` then split with `[:N]` and `[N:]` for two purposes WITHOUT an explicit `info` distinction
- Custom "key derivation" that XORs the master key with a constant (don't; use HKDF)

Lint pattern (informal):

```bash
# Suspicious: same variable used in encrypt and hmac contexts
grep -E '(encrypt|cipher).*\b(KEY|key)\b' file.py | head -1
grep -E '(hmac|sign).*\b(KEY|key)\b' file.py | head -1
# If both refer to the same variable, BLOCK
```

### Remediation pattern: HKDF with domain separation

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDFExpand, HKDF
from cryptography.hazmat.primitives import hashes

# Step 1: Extract — combine inputs into a pseudorandom key
prk = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=b"app-salt-v1",  # public, fixed per application
    info=b"",
).derive(ikm)  # IKM is the high-entropy input

# Step 2: Expand — derive purpose-specific keys with distinct info strings
def expand(prk: bytes, label: bytes, length: int = 32) -> bytes:
    return HKDFExpand(
        algorithm=hashes.SHA256(),
        length=length,
        info=label,
    ).derive(prk)

enc_key   = expand(prk, b"app-aead-v1")
mac_key   = expand(prk, b"app-mac-v1")
sign_key  = expand(prk, b"app-sign-v1")
token_key = expand(prk, b"app-token-v1")
```

The `info` (label) MUST:

- Be unique per purpose (`-aead-v1` ≠ `-mac-v1`)
- Include a version suffix (`-v1`) so you can rotate by deriving `-v2` keys without changing the IKM
- Be domain-prefixed for the application (`app-`) so different applications using the same library and same IKM derive different keys

### When using a single key for AEAD only (not key reuse)

AEAD constructions (GCM, ChaCha20-Poly1305) take a single key and provide both confidentiality and integrity. This is NOT key reuse — it's the single intended purpose of the construction. The rule applies when you have separate `encrypt` and `authenticate` operations, not when one primitive does both.

### Hardware-backed multi-purpose keys

When a single hardware token (HSM, YubiKey, TPM) provides multiple operations against the same key (e.g., a TPM endorsement key used for both quote and decrypt), this is a different kind of key reuse — it's a hardware design choice constrained by the device. Document the limitation and confirm the threat model accepts it. Where possible, use the hardware to derive purpose-keys (TPM `TPM2_Create` with different auth policies) rather than using the underlying key directly.

## Linked rules

- `no-adhoc-kdf` — the derivation function used here MUST be a real KDF, not concat-and-hash
- `no-unauthenticated-encryption` — the most common case where this rule matters: separate enc and MAC keys
- `crypto-flag-verification` — when using a CLI tool that derives keys, confirm the derivation is properly separated

## References

- RFC 5869 §3.1 — "Use of HKDF for Key Derivation" (specifies info-string usage)
- NIST SP 800-108 — Recommendation for Key Derivation Using Pseudorandom Functions
- NIST SP 800-57 Part 1 §5.2 — "Cryptographic Key Usage Policy" (key-purpose separation)
- Krawczyk, "Cryptographic Extraction and Key Derivation: The HKDF Scheme" (CRYPTO 2010)
- Bellare & Rogaway, "Code-Based Game-Playing Proofs and the Security of Triple Encryption" (2004) — formal treatment of domain separation
