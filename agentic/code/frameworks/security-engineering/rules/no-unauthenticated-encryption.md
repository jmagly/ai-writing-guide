---
id: no-unauthenticated-encryption
severity: HIGH
applies_to: [all-agents, applied-cryptographer]
tags: [cryptography, aead, integrity]
---

# No Unauthenticated Encryption

**Enforcement Level**: HIGH
**Scope**: Any code that encrypts data
**Framework**: security-engineering

## Rule

Unauthenticated symmetric encryption modes are PROHIBITED unless wrapped in a separate Message Authentication Code (MAC) over the ciphertext (and any associated data). The prohibited modes are CBC, CTR, OFB, CFB, ECB, and any mode that does not produce an authentication tag covering the ciphertext bytes.

## Why

Unauthenticated ciphertext is malleable. Bit-flips in the ciphertext are silently undetectable on decrypt, and any error path that distinguishes "padding error" from "authentication error" leaks plaintext through a padding oracle. CBC is the canonical example: bit-flips in the IV deterministically corrupt the first plaintext block, and CBC's PKCS#7 padding has produced real padding-oracle attacks against TLS, JWE, and many custom protocols.

Authenticated Encryption with Associated Data (AEAD) modes — GCM, ChaCha20-Poly1305, AES-GCM-SIV, OCB — produce a tag that detects any modification, eliminating both attacker classes in a single primitive.

Source: review finding B1 (2026-05-03 gap analysis).

## How to apply

### Detection

Grep patterns indicating likely violation:

- `aes-256-cbc`, `aes-128-cbc`, `aes-cbc` (any context — config, code, command line)
- `aes-256-ctr`, `aes-128-ctr` without a paired `HMAC` call
- `Cipher(...AES, MODE_CBC...)` (Python `cryptography`/PyCryptodome)
- `crypto.createCipheriv("aes-256-cbc", ...)` (Node.js)
- `openssl enc -aes-*-cbc` (shell, build scripts, Makefiles)
- `EVP_aes_256_cbc()`, `EVP_aes_256_ctr()` without `EVP_MAC` paired

Also flag:

- AEAD mode followed by truncation of the tag — defeats the construction
- AEAD mode where the AAD is empty and the data has format that needs binding (version byte, recipient identity, etc.)

### Remediation

**Preferred**: switch to an AEAD mode.

```bash
# WRONG
openssl enc -aes-256-cbc -in plain -out ct -pass fd:0

# RIGHT
openssl enc -aes-256-gcm -pbkdf2 -iter 600000 -in plain -out ct -pass fd:0
# OR (preferred) use a small program around libsodium:
python3 -c "
import nacl.secret, nacl.utils, sys
key = bytes.fromhex(sys.argv[1])
box = nacl.secret.SecretBox(key)
sys.stdout.buffer.write(box.encrypt(sys.stdin.buffer.read()))" "$KEY_HEX" < plain > ct
```

**If legacy CBC is mandatory** (interop with an existing format you can't change): wrap with a separate MAC. Derive distinct keys via HKDF with domain separation (see `no-key-reuse-across-purposes` rule):

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDFExpand
from cryptography.hazmat.primitives import hashes, hmac
# ... HKDF-Expand to derive enc_key (32 bytes) and mac_key (32 bytes)
ct = aes_cbc_encrypt(enc_key, iv, plaintext)
h = hmac.HMAC(mac_key, hashes.SHA256())
h.update(iv + ct)  # MAC covers IV and ciphertext
tag = h.finalize()
# wire format: iv || ct || tag (length of tag is fixed and known)
# decrypt: verify tag FIRST (constant-time compare), then decrypt
```

**Critical**: tag verification MUST happen BEFORE any padding processing on decrypt, and MUST be constant-time. Failure to do this restores the padding oracle.

## When this rule does NOT apply

- Stream-cipher operations where authentication is provided by a higher-level protocol (TLS record layer, Noise framework, Signal protocol). In these cases the protocol is the construction; the underlying mode is fine.
- Disk encryption (LUKS, BitLocker, FileVault) — these intentionally use unauthenticated XTS because authenticated modes don't fit the random-access requirement. The threat model accepts ciphertext malleability at the block layer; integrity comes from the filesystem above.
- Any case where the application provably never decrypts attacker-controlled ciphertext (rare; document the analysis).

## Linked rules

- `no-key-reuse-across-purposes` — when wrapping with HMAC, the encryption and MAC keys MUST be distinct
- `no-adhoc-kdf` — derive both keys via HKDF, not by string concatenation
- `crypto-flag-verification` — when using `openssl enc`, also verify `-pbkdf2 -iter` flags

## References

- NIST SP 800-38D — GCM specification
- RFC 5116 — Authenticated Encryption interface
- RFC 8439 — ChaCha20-Poly1305 IETF
- RFC 8452 — AES-GCM-SIV
- Bleichenbacher, "Chosen Ciphertext Attacks against Protocols Based on the RSA Encryption Standard PKCS #1" (1998) — original padding oracle paper
- Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002)
- POODLE (2014), Lucky Thirteen (2013) — TLS-against-CBC attacks
