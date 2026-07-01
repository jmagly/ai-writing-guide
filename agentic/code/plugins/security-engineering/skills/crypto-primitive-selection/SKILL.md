---
namespace: aiwg
name: crypto-primitive-selection
platforms: [all]
description: "Decision aid for choosing AEAD, KDF, MAC, and signature primitives — flags anti-patterns (CBC-without-MAC, ad-hoc KDF, key reuse, PBKDF2-on-high-entropy)."

---

# crypto-primitive-selection

Decision aid for cryptographic primitive choices. Use this skill when designing or reviewing systems that encrypt, authenticate, derive, or sign — and especially before writing any line of code that calls a low-level crypto API.

The skill does not pick a single product or library for you. It gives you a **suggested default** for the common case, a **vetted alternatives menu** with selection criteria, and a **research path** for when neither default nor menu fits your constraints.

## Triggers

Primary phrases are matched automatically from the description. Alternate expressions:

- "choose AEAD" / "which AEAD"
- "which KDF" / "password hashing"
- "encrypt with AES" / "AES-CBC" / "AES-GCM"
- "should I use HMAC"
- "sign vs MAC"
- "openssl enc" (any context)
- "is HMAC-SHA1 OK"
- "is PBKDF2 enough"
- "applied crypto review"

## When NOT to use this skill

- High-level protocol design (use a peer-reviewed protocol like TLS 1.3, Noise, or Signal — don't roll your own)
- Post-quantum migration planning (separate concern; consult NIST PQC selections)
- Network-layer threat modeling (handled by `sdlc-complete/skills/security-assessment`)

## Catalog Format

Every primitive section follows the same three-part pattern:

1. **Suggested default** — the right answer for the common case, with rationale
2. **Vetted alternatives menu** — when to pick something else, with selection criteria
3. **Research path** — how to evaluate newer or domain-specific options when nothing in the menu fits

The skill never hard-picks a vendor product. It describes properties; you choose against your constraints.

---

## Section 1: AEAD (Authenticated Encryption with Associated Data)

**Use when**: Encrypting data at rest or in flight where you also need to detect tampering. This is the default for ~95% of "encrypt this" tasks.

### Suggested default

**XChaCha20-Poly1305 via libsodium** (`crypto_secretstream_xchacha20poly1305_*` for streams, `crypto_aead_xchacha20poly1305_ietf_*` for one-shot).

Rationale:
- 192-bit nonces — random nonce generation is misuse-resistant (no birthday bound concerns for the lifetime of any realistic key)
- Audited C implementation (libsodium has been independently audited; tracks Bernstein/Aumasson reference)
- Broad language bindings (Python, Rust, Go, Node, Ruby, .NET, Swift — all wrap the same C lib)
- No hardware dependency — runs at acceptable speed in software on every architecture
- Streaming API via `secretstream` handles multi-chunk encryption with replay/reorder/truncation protection

### Vetted alternatives

| Primitive | Pick when |
|---|---|
| **AES-256-GCM** | Hardware AES-NI dominates and you need top throughput on x86_64/ARM with crypto extensions; OR you need FIPS 140-3 validation and your validated module exposes GCM but not ChaCha. Watch the 96-bit nonce — never reuse with the same key, use a counter not a random. |
| **AES-256-GCM-SIV (RFC 8452)** | You can't guarantee non-reuse of nonces (e.g., distributed system without a counter source). SIV is misuse-resistant against accidental reuse — degrades to revealing equality of plaintexts, not catastrophic loss. |
| **ChaCha20-Poly1305 IETF (RFC 8439)** | Same algorithm as XChaCha but 96-bit nonce. Pick when interoperating with TLS 1.3, WireGuard, or other IETF-spec stacks that mandate this exact construction. |
| **AES-256-CCM** | Constrained embedded environments where code size matters and only AES is in ROM. Use only in profile (CCM has tight nonce/length tradeoffs). |
| **age (file format)** | Encrypting files for asymmetric recipients (X25519 public keys or SSH keys). Don't reimplement; use the `age` reference tool or a library binding. |

### Research path for newer/domain-specific options

When the default and menu don't fit:

1. **CFRG drafts** at `datatracker.ietf.org/wg/cfrg/documents/` — the IRTF Crypto Forum vets new constructions before IETF/NIST adoption
2. **NIST CAVP validation list** (`csrc.nist.gov/projects/cryptographic-algorithm-validation-program`) — required if you need FIPS-validated software/hardware
3. **NIST Lightweight Crypto winners** (Ascon family, 2023) — prefer for tightly-constrained IoT
4. **SoK papers** — search for "Systematization of Knowledge: AEAD" on IACR ePrint; SoK papers summarize the landscape with attack tables
5. **Rule out**: anything labeled "experimental", "research preview", or with no public security analysis from a non-author. If the construction is one academic paper old, it's not production-ready.

### Anti-patterns (BLOCK on these)

- **CBC, CTR, OFB, CFB without a separate MAC.** Unauthenticated. Bit-flips are silently undetectable; padding oracles leak plaintext on decryption error paths. → **Rule: `no-unauthenticated-encryption`**
- **`openssl enc` without `-pbkdf2 -iter <N>`** (or similar explicit KDF flags). Defaults to a single-MD5-iteration KDF. → **Rule: `crypto-flag-verification`**
- **Reusing GCM nonces with the same key.** Catastrophic — recover the authentication key and forge arbitrary ciphertexts. Use a counter, not a random, when collision-likelihood matters.
- **Encrypt-then-truncate.** Truncating an AEAD ciphertext breaks the tag. If you need length-hiding, pad before encrypting, not after.

---

## Section 2: KDF (Key Derivation Function)

**Use when**: You have an Input Keying Material (IKM) and need to turn it into one or more cryptographic keys. The right KDF depends entirely on the **entropy class** of the IKM.

### Decision tree (READ FIRST)

```
What is the entropy class of your input?
│
├── HIGH ENTROGY (≥128 bits effective)
│   - Output of another KDF
│   - Hardware-derived secret (TPM, YubiKey HMAC, FIDO2 PRF)
│   - DH/ECDH shared secret
│   - Random key from CSPRNG
│   ↓
│   USE: HKDF-Extract + HKDF-Expand (RFC 5869)
│
└── LOW ENTROPY (passwords, passphrases, PINs, recovery codes)
    ↓
    USE: Argon2id (preferred) OR PBKDF2-HMAC-SHA-256 ≥600k iter (legacy/FIPS)
```

**The most common mistake** (review finding H1 in the motivating gap analysis): applying PBKDF2 with 100k iterations to a 256-bit hardware-derived secret. This **slows the defender** without slowing the attacker, because the attacker is not doing brute force on a 256-bit key — that's already infeasible. PBKDF2 only buys you anything when the input is brute-forceable. With a high-entropy input, use HKDF.

### Suggested defaults

| IKM entropy | Default | Rationale |
|---|---|---|
| High | **HKDF-SHA-256** (libsodium `crypto_kdf_*`) | RFC 5869, universally supported, fast, parametric in salt and info string |
| Low (interactive password) | **Argon2id** with `m=65536, t=3, p=4` (libsodium `crypto_pwhash_*` with `OPSLIMIT_INTERACTIVE`) | RFC 9106; memory-hard against GPU/ASIC attackers |
| Low (FIPS or legacy constraint) | **PBKDF2-HMAC-SHA-256** with ≥600,000 iterations (OWASP 2023) | RFC 8018; available everywhere; CPU-bound only |

### Vetted alternatives

| Primitive | Pick when |
|---|---|
| **scrypt** | You need memory-hardness but Argon2 isn't available in your runtime. Parameters: `N=2^17, r=8, p=1` for interactive, scale up for offline. |
| **bcrypt** | Legacy systems already using bcrypt. Don't introduce in greenfield. Cost factor ≥12; truncates passwords at 72 bytes (pre-hash if longer). |
| **HKDF-SHA-512** | Output keys longer than 8160 bits OR you specifically want SHA-512's domain. Default to SHA-256 otherwise. |
| **NIST SP 800-108 KBKDF (KDF in counter mode)** | FIPS-mandated environments where HKDF isn't approved. Functionally equivalent to HKDF-Expand for typical uses. |

### Required pattern: domain separation when deriving multiple keys

When one IKM produces multiple output keys (e.g., `enc_key` AND `mac_key`), use distinct `info` strings via HKDF-Expand. **Never reuse a single derived key for two purposes.** This is the fix for review finding B2:

```
prk     = HKDF-Extract(salt, ikm)
enc_key = HKDF-Expand(prk, info="app-aead-v1",   length=32)
mac_key = HKDF-Expand(prk, info="app-mac-v1",    length=32)
sub_key = HKDF-Expand(prk, info="app-token-v1",  length=32)
```

The `info` string MUST include a version suffix (`-v1`) so you can rotate without changing the IKM.

### Research path

1. **OWASP Password Storage Cheat Sheet** — kept current with iteration count guidance
2. **RFC 9106 §4** — Argon2 parameter selection for your latency budget
3. **"How (not) to use OAEP" / "How (not) to derive keys"** — IACR ePrint searches surface failure-mode papers
4. **NIST SP 800-132** for password-based; SP 800-108 for high-entropy

### Anti-patterns (BLOCK on these)

- **`SHA-256(secret_a || secret_b)`** as a KDF. Concat-and-hash is not a KDF. → **Rule: `no-adhoc-kdf`**
- **`MD5(password || salt)`** anywhere. → **Rule: `no-adhoc-kdf`**
- **PBKDF2 over a 256-bit hardware-derived secret** (review H1). High-entropy IKM doesn't benefit from iteration count.
- **Same key for `enc_key` and `mac_key`** (review B2). → **Rule: `no-key-reuse-across-purposes`**
- **Iteration count below OWASP guidance** (PBKDF2-SHA256 < 600k as of 2023). The number drifts upward annually — keep yours current.

---

## Section 3: MAC (Message Authentication Code)

**Use when**: You need to detect tampering of data you control end-to-end (sender and receiver share a key). If parties don't share a key, you need a signature, not a MAC — see Section 4.

### Suggested default

**HMAC-SHA-256** (libsodium `crypto_auth_*`, OpenSSL `EVP_MAC` family).

Rationale:
- Universally available; FIPS-approved
- Length-extension safe (HMAC construction wraps the underlying hash properly)
- Performance is fine for any reasonable message size

### Vetted alternatives

| Primitive | Pick when |
|---|---|
| **Poly1305** (paired with XChaCha or AES) | You're already using AEAD — the AEAD's MAC (Poly1305 or GCM tag) IS your MAC. Don't add a second layer. |
| **KMAC-256 (SHA3 family)** | You're already using SHA3 in the stack and don't want two hash families. |
| **BLAKE2b/BLAKE3 keyed mode** | Performance is critical, you're not constrained by FIPS, and you're hashing large quantities. |
| **CMAC (AES-based)** | Hardware AES is available, SHA-256 isn't, and you're in a constrained device. |

### Required pattern: distinct keys for distinct purposes

Authentication keys MUST NOT be the same as encryption keys. See KDF Section's domain separation pattern. If you find yourself writing `HMAC(key, data)` where `key` is also an encryption key, stop and derive a separate `mac_key`.

### Anti-patterns (BLOCK on these)

- **Custom MAC**: `SHA-256(key || data)` is not a MAC. Use HMAC. (Length-extension makes this a real attack on Merkle-Damgård hashes; SHA-256 is technically vulnerable, SHA3 isn't, but use HMAC anyway for hygiene.)
- **MAC-then-encrypt** without an authenticated mode: gives an attacker a decryption oracle. Encrypt-then-MAC, or use AEAD.
- **A "signature" that is `SHA-256(data || shared_key)`** (review finding B2) — that's a custom keyed hash with the encryption key reused as the MAC key. Two violations: ad-hoc construction AND key reuse. Always two distinct primitives, two distinct keys.

---

## Section 4: Signature

**Use when**: You need a third party to verify data integrity using only a public key. If both parties share a secret, use a MAC (Section 3) — signatures are slower, larger, and more dangerous when misused.

### Suggested default

**Ed25519** (libsodium `crypto_sign_*`).

Rationale:
- Deterministic (no nonce-reuse footgun like ECDSA)
- ~100x faster than RSA for verification
- Small keys (32 byte public, 64 byte signature)
- No side-channel pitfalls in reference implementation

### Vetted alternatives

| Primitive | Pick when |
|---|---|
| **ECDSA P-256 (SECP256R1)** | Interop with TLS, JWT (`ES256`), Web Crypto API, FIPS-validated stacks. Beware nonce-reuse → key recovery; use deterministic ECDSA (RFC 6979) when possible. |
| **RSA-PSS-SHA-256, 3072-bit modulus** | Interop with very old systems or strict FIPS profiles. Not for new design without justification. |
| **Ed448** | Higher security level (~224-bit) than Ed25519 (~128-bit). Almost never needed; pick if your threat model includes very long-term archival. |
| **Hybrid PQ (Ed25519 + ML-DSA)** | Long-term archival signatures (>10 years) where post-quantum threat is in scope. Track NIST FIPS 204/205 finalization. |

### Anti-patterns (BLOCK on these)

- **"A signature is a hash of the data plus a key"** — that's a MAC, not a signature. Reviewer cannot verify with public material; anyone with the key can forge. Real signatures are asymmetric — secret key signs, public key verifies. (Review B2: the construction was `SHA-256(manifest || derived_key)` and labeled `sign_dual` — both wrong.)
- **ECDSA with random nonce** when you don't have a perfect CSPRNG every signing call → key recovery in ~2 signatures. Use RFC 6979 deterministic ECDSA or switch to Ed25519.
- **Self-rolled "multi-sig"** by concatenating signatures or hashing them. Use a real threshold scheme (FROST for Schnorr/Ed25519, MuSig2) or document the security argument.

---

## Section 5: Hash Function

**Use when**: One-way fingerprint, content-addressing, deduplication, indexing.

| Use | Default | Notes |
|---|---|---|
| Content addressing, integrity | **SHA-256** | Universal. Fast enough. |
| Performance-critical, no FIPS | **BLAKE3** | 5-10x faster than SHA-256, parallelizable, tree-mode for huge files |
| FIPS or interop with newer stacks | **SHA-512/256** or **SHA3-256** | SHA-512/256 is faster on 64-bit CPUs than plain SHA-256. SHA3 sidesteps Merkle-Damgård length-extension. |
| **Anywhere** | **NOT MD5, NOT SHA-1** | Use only when interop demands (e.g., legacy file format). Document the constraint. |

### Acceptable use of HMAC-SHA-1 (review H7 context)

HMAC-SHA-1 is **acceptable as a PRF** even in 2026. The known weaknesses of SHA-1 (collision resistance) do not apply when SHA-1 is used inside HMAC's construction (PRF security is what matters). Examples: YubiKey 5 OTP slot's challenge-response is hard-locked to HMAC-SHA-1 — using it is fine, but document the rationale.

That said: **do not introduce HMAC-SHA-1 in greenfield code.** Auditors flag it, and explaining why it's actually OK costs you reviewer time. Plan migration to a FIDO2 PRF (HMAC-SHA-256 underlying) when hardware permits.

---

## Section 6: Random Number Generation

| Use | Default | Don't |
|---|---|---|
| Cryptographic randomness | **`/dev/urandom`** (Linux), `getrandom(2)`, libsodium `randombytes_buf`, OpenSSL `RAND_bytes` | Don't use `rand()`, `Math.random()`, `srand(time(NULL))`. |
| Secret generation, nonces, keys | Same as above | Don't seed a deterministic PRNG from the OS RNG and then use the deterministic stream — just use the OS RNG directly. |
| Reproducible "random" (tests) | A documented deterministic PRNG (xoshiro, ChaCha8) seeded explicitly | Mark clearly as not for security use. |

`/dev/urandom` and `/dev/random` are both fine for cryptographic use on modern Linux; the historical "random for keys, urandom for the rest" advice is obsolete. See `man 7 random`.

---

## Section 7: `openssl enc` and other command-line crypto tools

`openssl enc` is a footgun-rich tool. It's also ubiquitous, so it shows up. Apply these rules:

### Required when using `openssl enc`

- **Always pass `-pbkdf2 -iter <N>`** (N ≥ 600,000 for SHA-256). Without these flags, OpenSSL uses a single-MD5-iteration KDF (`EVP_BytesToKey`), which is essentially zero work to brute-force. → **Rule: `crypto-flag-verification`**
- **Use `-aes-256-gcm`** or another AEAD mode, not `-aes-256-cbc`. `enc` does support GCM as of OpenSSL 1.1.0+.
- **Read the password from a file descriptor (`-pass fd:N`) or env var (`-pass env:VAR`)**, never via `-k password` (visible in `ps`).

### Better: don't use `openssl enc` for new code

For a security product, use a small program that calls libsodium's `crypto_secretstream_xchacha20poly1305_*` directly, or use the `age` tool. `openssl enc` is a Swiss Army knife with many rusty blades; the failure modes (silent default to weak KDF, CBC default, no AEAD by default until you know to ask) are not what you want at the bottom of your security stack.

### Other CLI tools

| Tool | Notes |
|---|---|
| `gpg --symmetric` | Use `--s2k-mode 3 --s2k-count <high>` and `--s2k-cipher-algo AES256 --s2k-digest-algo SHA512`. Default S2K count is too low. |
| `age` | Generally safe defaults. Pin a specific version and verify the binary signature. |
| `7z -p<pwd>` | AES-256, but the password derivation is `SHA-256` 524288 times — equivalent to PBKDF2 with ~500k iterations, marginal. Acceptable for casual; not a security product. |
| `zip --encrypt` | Legacy ZIP encryption is broken. AE-2 (WinZip) is OK but rare. Use 7z or `age` instead. |

---

## Section 8: When to roll your own — DON'T

If you're reading this skill, you almost certainly should not be designing a new primitive. **Use existing libraries that wrap reviewed implementations.** The bar for "new primitive" is:

- Multiple independent academic analyses spanning ≥3 years
- IACR ePrint papers from non-authors confirming security claims
- A reference implementation with formal verification (e.g., HACL*, BearSSL)
- A use case the existing primitives genuinely don't address

If you can't check all four boxes, use the suggested default.

---

## Worked example: the gap analysis findings

This skill exists because a 2026-05-03 pre-production review caught real problems no STRIDE/OWASP pass would have surfaced. Walking through what the skill would flag:

### Finding B1 — `openssl enc -aes-256-cbc` without MAC

- Section 1 anti-pattern: "CBC without a separate MAC" → BLOCK
- Section 7 anti-pattern: `openssl enc` without explicit AEAD mode → BLOCK
- Remediation: switch to `-aes-256-gcm` OR wrap CBC ciphertext in `HMAC-SHA-256(mac_key, iv || ct)` with a separate `mac_key` from HKDF

### Finding B2 — `sign_dual` produces `SHA-256(manifest || derived_key)`

- Section 4 anti-pattern: "a hash of data plus a key is not a signature" → BLOCK
- Section 2 anti-pattern: "concat-and-hash is not a KDF" (the upstream key combination) → BLOCK
- Section 3 anti-pattern: same key for encryption and authentication → BLOCK
- Remediation: HKDF-Extract + HKDF-Expand to derive `enc_key` AND `mac_key` AND (if you genuinely need third-party verification) a real Ed25519 signing key. Three primitives, three keys, three purposes.

### Finding H1 — PBKDF2 100k iter on a 256-bit hardware-derived secret

- Section 2 decision tree: high-entropy IKM → use HKDF, not PBKDF2
- Remediation: drop the PBKDF2 step; use HKDF over the combined secrets

### Finding H6 — `openssl enc -aes-256-cbc -pass fd:0` without `-pbkdf2 -iter`

- Section 7 required flags: BLOCK without `-pbkdf2 -iter`
- Remediation: add `-pbkdf2 -iter 600000`, then either migrate to `-aes-256-gcm` or layer HMAC. Better: replace with a libsodium-based small program.

### Finding H7 — HMAC-SHA-1 on YubiKey 5 OTP slot

- Section 5 acceptable use: HMAC-SHA-1 as PRF is fine; document why
- Forward plan: migrate to FIDO2 PRF (HMAC-SHA-256) on next hardware refresh

---

## Output format

When this skill is invoked as part of a review, produce findings in this format:

```markdown
### Finding: <SHORT-NAME>

**Severity**: BLOCK | HIGH | MEDIUM | LOW
**Location**: <file:line> or <component>
**Section**: <skill section, e.g., "Section 1: AEAD anti-pattern">
**Rule**: <enforcement rule, e.g., `no-unauthenticated-encryption`>

**Issue**: <one-paragraph explanation of what's wrong>

**Remediation**:
<concrete fix, with code snippet if helpful>

**References**:
- <RFC, NIST publication, or IACR paper>
```

When a `cryptographic-decisions.md` (template — see `templates/cryptographic-decisions.md`) is being created, the skill drives the **Decision** and **Rationale** sections.

## Related

- **Rules** that enforce this skill's anti-patterns (auto-deployed via `aiwg-utils` if installed):
  - `no-unauthenticated-encryption`
  - `no-key-reuse-across-purposes`
  - `no-adhoc-kdf`
  - `crypto-flag-verification`
- **Template**: `cryptographic-decisions.md` — record-of-decision per primitive
- **Agent**: `applied-cryptographer` — narrow-scope reviewer that loads this skill on activation
- **Companion skill**: `chain-of-trust-design` — the other half of "is your security design sound"

## Standards referenced

- NIST SP 800-38D (GCM), 800-57 (Key Management), 800-108 (KDFs), 800-132 (Password-based)
- RFC 5869 (HKDF), 8439 (ChaCha20-Poly1305 IETF), 8452 (AES-GCM-SIV), 9106 (Argon2)
- OWASP Password Storage Cheat Sheet, Cryptographic Storage Cheat Sheet
- FIPS 140-3, FIPS 186-5 (signatures)
