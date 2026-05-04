---
id: no-adhoc-kdf
severity: HIGH
applies_to: [all-agents, applied-cryptographer]
tags: [cryptography, kdf, key-derivation]
---

# No Ad-Hoc Key Derivation

**Enforcement Level**: HIGH
**Scope**: Any code that derives keys
**Framework**: security-engineering

## Rule

Ad-hoc key derivation is PROHIBITED. Use a standard KDF appropriate to the entropy class of the input:

- **High-entropy input** (≥128 effective bits — output of another KDF, hardware-derived secret, DH/ECDH shared secret, CSPRNG output): use **HKDF** (RFC 5869) or NIST SP 800-108 KBKDF.
- **Low-entropy input** (passwords, passphrases, PINs, recovery codes): use **Argon2id** (RFC 9106; preferred), **PBKDF2-HMAC-SHA-256** with iteration count ≥600,000 (OWASP 2023; legacy/FIPS), or **scrypt** with `N=2^17, r=8, p=1`.

Specific prohibitions:

- `SHA-256(secret_a || secret_b)` as a KDF — NO
- `MD5(...)` anywhere — NO
- `SHA-1(...)` as a KDF — NO (HMAC-SHA-1 as a PRF inside a real KDF is acceptable; see exceptions)
- `XOR(master_key, constant)` to derive subkeys — NO
- "I just hash the password and use that as the key" — NO
- A single hash iteration on a password — NO
- PBKDF2 over a high-entropy input — pointless, but more importantly it signals confusion about the entropy class

## Why

A KDF has two jobs:

1. **For high-entropy IKM**: extract uniformity (turn whatever bit pattern your input has into output indistinguishable from random) and expand to any output length, with domain separation via `info`. HKDF is the named construction for this.

2. **For low-entropy IKM**: do (1) AND impose computational cost on the attacker that scales beyond the size of the input search space. Argon2/PBKDF2/scrypt do this; a plain hash does not.

Ad-hoc constructions (like `SHA-256(a || b)`) accidentally satisfy (1) sometimes — the SHA-256 output IS uniform — but they fail at (2) when applied to passwords (no work factor) and fail at composability. They also miss subtle properties real KDFs guarantee:

- **Domain separation**: HKDF's `info` parameter cleanly separates output spaces; a custom `SHA-256(a || b || "purpose")` only domain-separates if `||` is unambiguous (it usually isn't — length-prefix or you have collision attacks)
- **Deterministic output independence**: deriving `enc_key` and `mac_key` from the same IKM via HKDF gives mathematically independent outputs; ad-hoc constructions don't have this guarantee
- **Length flexibility**: HKDF-Expand outputs any length up to 8160 bits; concat-and-hash gives you exactly `hash_size` bits without further structure

For low-entropy inputs, the attack is simpler: a 6-character password has ~30 bits of entropy. A modern GPU computes ~10^10 SHA-256 hashes per second. An ad-hoc `SHA-256(password)` is brute-forced in seconds. PBKDF2 with 600k iterations imposes a ~600k× slowdown; Argon2id with `m=64MB` imposes ~64MB of memory pressure per guess, defeating GPU/ASIC attackers.

Source: review finding B2 (ad-hoc combination) and H1 (PBKDF2 misapplied to high-entropy input). 2026-05-03 gap analysis.

## How to apply

### Detection

Suspect patterns:

- `hashlib.sha256(a + b).digest()` used as a key
- `SHA-256(...)`, `SHA-512(...)`, `MD5(...)` followed by `.digest()` and used in a `Cipher`/`HMAC` constructor
- `hmac.new(secret, data).digest()` used as a key (HMAC IS a PRF, but using it directly as a KDF skips the extract-then-expand structure)
- Custom Python class named `KDF`, `KeyDerivation`, `DeriveKey` that doesn't import from `cryptography.hazmat.primitives.kdf` or `nacl.utils`
- Bash: `echo -n "$a$b" | sha256sum`
- "PBKDF2 with 100k iterations" applied to anything that isn't a human-typed password

Smoke test: read the code that produces the key. Trace upward to find the input. Classify the input's entropy. If the entropy class doesn't match the KDF used, flag.

### Remediation patterns

#### High-entropy IKM (combine two hardware secrets)

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDFExpand, HKDF
from cryptography.hazmat.primitives import hashes

# WRONG (review B2)
ikm_wrong = sha256(hmac_5 + b"\x00" + hmac_bio).digest()  # ad-hoc combination

# RIGHT
prk = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=challenge_file_contents,  # public per-session salt
    info=b"",
).derive(hmac_5 + b"\x00" + hmac_bio)  # HKDF-Extract handles the combination

enc_key = HKDFExpand(
    algorithm=hashes.SHA256(), length=32, info=b"app-aead-v1"
).derive(prk)

mac_key = HKDFExpand(
    algorithm=hashes.SHA256(), length=32, info=b"app-mac-v1"
).derive(prk)
```

Key insight: HKDF-Extract IS the safe way to combine multiple high-entropy secrets. You don't need a custom combine; HKDF-Extract does it correctly.

#### Low-entropy IKM (password)

```python
import nacl.pwhash, nacl.utils

# WRONG
key_wrong = sha256(password.encode()).digest()  # zero work factor

# RIGHT — Argon2id (preferred)
salt = nacl.utils.random(nacl.pwhash.argon2id.SALTBYTES)
key = nacl.pwhash.argon2id.kdf(
    32, password.encode(), salt,
    opslimit=nacl.pwhash.argon2id.OPSLIMIT_INTERACTIVE,
    memlimit=nacl.pwhash.argon2id.MEMLIMIT_INTERACTIVE,
)
# store: salt + opslimit + memlimit + key
# next time: same salt + same params + password → same key
```

For PBKDF2-HMAC-SHA-256 (legacy/FIPS) with current OWASP guidance:

```python
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

key = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=salt,                      # 16+ bytes from CSPRNG, stored alongside
    iterations=600_000,             # OWASP 2023 minimum for SHA-256
).derive(password.encode())
```

**Iteration counts drift upward.** Check OWASP Password Storage Cheat Sheet annually. A 2026 audit of code that pinned 100k in 2018 will fail.

### Acceptable use of HMAC inside KDFs

HMAC-SHA-256 IS the underlying PRF inside HKDF, NIST SP 800-108 KBKDF, and PBKDF2. Using HMAC INSIDE one of these constructions is fine. Using `hmac.new(key, data)` directly AS your KDF is not — it lacks the extract-then-expand structure and the iteration count.

Acceptable HMAC-based KDF (this IS a KDF, just spelled out):

```python
# This is HKDF written by hand. Don't write it by hand; use the library.
# Shown only to clarify what a "real" KDF is structurally.
prk = hmac_sha256(salt, ikm)                       # HKDF-Extract
t1  = hmac_sha256(prk, info + b"\x01")             # HKDF-Expand iteration 1
t2  = hmac_sha256(prk, t1 + info + b"\x02")        # iteration 2 (chained)
output = (t1 + t2)[:length]
```

The structural minimum that distinguishes a KDF from "hash a thing" is: salt-driven extraction phase, info-driven expansion phase, with output independence between different `info` values.

## Linked rules

- `no-key-reuse-across-purposes` — the OUTPUT of HKDF-Expand should be distinct keys per purpose
- `no-unauthenticated-encryption` — when wrapping CBC with HMAC, the HMAC key MUST come from a real KDF
- `crypto-flag-verification` — `openssl enc` requires `-pbkdf2 -iter` to invoke a real KDF

## References

- RFC 5869 — HKDF (Krawczyk)
- RFC 9106 — Argon2 (CFRG)
- RFC 8018 — PKCS#5 v2.1 (PBKDF2)
- NIST SP 800-108 — Key Derivation Using Pseudorandom Functions
- NIST SP 800-132 — Recommendation for Password-Based Key Derivation
- OWASP Password Storage Cheat Sheet — current iteration count guidance
- Krawczyk, "Cryptographic Extraction and Key Derivation: The HKDF Scheme" (CRYPTO 2010) — security analysis
