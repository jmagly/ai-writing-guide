# Cryptographic Decision Record

> **Template usage**: One record per primitive selection. Lives in `.aiwg/security-engineering/decisions/<short-name>.md`. Driven by the `crypto-primitive-selection` skill and reviewed by the `applied-cryptographer` agent. Replace all `[bracketed]` placeholders.

## Document Control

| Field | Value |
|-------|-------|
| Decision Name | `[Short descriptive name, e.g., "AEAD selection for at-rest backup"]` |
| Decision ID | `[CRYPTO-DEC-NNN]` |
| Date Created | `[YYYY-MM-DD]` |
| Date Last Reviewed | `[YYYY-MM-DD]` |
| Authors | `[Applied Cryptographer, Implementor]` |
| Reviewers | `[Independent reviewer (NOT the original author per review rec #9)]` |
| Status | `[Draft / Under Review / Approved / Implemented / Superseded]` |
| Supersedes | `[CRYPTO-DEC-NNN, or "none"]` |
| Superseded By | `[CRYPTO-DEC-NNN, or "active"]` |
| Classification | `[Public / Internal / Confidential]` |

## Context

### What is being decided?

`[One paragraph: the specific primitive and use case. E.g., "Selection of AEAD construction for encrypting backup archives at rest, where archives may be 1 GB to 100 GB and stored on cloud object storage with optional WORM retention."]`

### Why is this decision being made now?

`[Trigger: new system, retiring deprecated primitive, audit finding, library deprecation, threat-model change, etc.]`

### Threat model alignment

`[Reference the relevant threat-model document(s). Specify the threats this primitive choice mitigates and any explicitly NOT in scope.]`

- Threats addressed: `[e.g., passive observation of storage, accidental tampering by storage provider, partial-file corruption]`
- Threats NOT addressed by this primitive: `[e.g., active key compromise, side-channel against the encrypting host]`
- Reference: `[link to .aiwg/security/threat-model.md or specific section]`

### Operational constraints

| Constraint | Value |
|---|---|
| Latency budget | `[e.g., <100ms encryption for 10 MB chunks]` |
| Memory budget | `[e.g., <128 MB peak]` |
| Hardware available | `[e.g., AES-NI present on all production hosts; no HSM]` |
| Language ecosystem | `[e.g., Python primary, Go services]` |
| FIPS / regulatory | `[e.g., FIPS 140-3 validation REQUIRED / NOT required]` |
| Library audit status required | `[e.g., must be either FIPS-validated or have public security audit]` |

## Decision

### Primitive selected

**Primitive**: `[e.g., XChaCha20-Poly1305]`
**Library**: `[e.g., libsodium 1.0.18+, via PyNaCl 1.5+]`
**Mode / parameters**: `[e.g., crypto_secretstream_xchacha20poly1305 with 192-bit random nonce, 1 MB chunk size]`
**Where used**: `[file paths or component names — e.g., src/backup/encryptor.py:encrypt_archive()]`

### Key management

| Aspect | Decision |
|---|---|
| Key source | `[e.g., HKDF-Expand from master HSM-derived key]` |
| Key length | `[e.g., 256-bit]` |
| Key separation | `[e.g., distinct enc_key and mac_key via HKDF info="backup-aead-v1" / "backup-mac-v1"]` |
| Key rotation cadence | `[e.g., annual; on compromise immediately]` |
| Key escrow | `[e.g., none / split via Shamir's secret sharing 3-of-5 / sealed to HQ Ed25519 pubkey]` |

### Nonce / IV management

`[How nonces are generated; whether reuse is possible; what happens if it occurs. Cite the construction's nonce-reuse properties.]`

### Encoding / wire format

`[Exact byte layout — version byte, nonce, ciphertext, tag, AAD layout. Use a diagram if multi-field.]`

```
+--------+-----------+-----------+--------+
| ver(1) | nonce(24) | tag(16)   | ct(N)  |
+--------+-----------+-----------+--------+
```

## Rationale

### Why this primitive?

`[2–4 paragraphs. Reference the suggested-default in crypto-primitive-selection skill if applicable; document any deviation. Cover misuse-resistance, performance fit, audit status, ecosystem fit.]`

### Why this library?

`[Library is a separate decision from primitive. Cover audit history, version pinning strategy, transitive dependency surface, language bindings, maintenance status.]`

## Alternatives considered

For each alternative, document why it was rejected. Be specific — "we didn't pick AES-GCM because we liked ChaCha better" is not a real reason.

### Alternative 1: `[primitive name]`

- **Selection criterion match**: `[which constraint did/didn't fit]`
- **Rejected because**: `[concrete reason — performance, audit status, nonce risk, FIPS, ecosystem]`
- **Conditions to revisit**: `[when would we change to this]`

### Alternative 2: `[primitive name]`

`[same fields]`

### Alternative 3: `[primitive name]`

`[same fields]`

## Test vectors

### Where the test vectors come from

`[Cite the source — RFC test vectors, NIST CAVP, library test suite, custom-generated and reviewed]`

### Implementation conformance check

```
Test vector source: [e.g., RFC 8439 §A.5]
Inputs:
  key:       [hex]
  nonce:     [hex]
  plaintext: [hex]
  aad:       [hex]
Expected:
  ciphertext: [hex]
  tag:        [hex]
Implementation produces: [PASS / FAIL with notes]
```

### Negative tests

`[At minimum: tampered ciphertext rejected; tampered AAD rejected; truncated ciphertext rejected; wrong key rejected]`

## Implementation review trail

| Date | Reviewer | Findings | Resolution |
|------|----------|----------|------------|
| `[YYYY-MM-DD]` | `[Reviewer name / role]` | `[What they found]` | `[How addressed; commit reference]` |

`[Per review recommendation #9: the original author MUST NOT be the last reviewer. Show at least one independent review.]`

## Revisit triggers

This decision MUST be revisited when any of:

- [ ] CVE published against `[library name]`
- [ ] NIST deprecates `[primitive]` (track `csrc.nist.gov` deprecation list)
- [ ] Library version pinned here goes >2 years without update
- [ ] Performance profile changes (new chunk sizes, new latency budget)
- [ ] FIPS/regulatory requirements change
- [ ] Threat model adds `[specific threat]`
- [ ] `[Other project-specific trigger]`

## Cross-references

- Threat model: `[link]`
- Related decisions: `[CRYPTO-DEC-NNN, CRYPTO-DEC-NNN]`
- Implementation: `[file paths or component names]`
- Tests: `[test file paths]`
- Skill that drove this decision: `agentic/code/frameworks/security-engineering/skills/crypto-primitive-selection/SKILL.md`

---

# Worked Example: AEAD migration from review finding B1

The following is a filled-in record showing how this template captures the recommended fix for review finding B1 (CBC without authentication).

## Document Control

| Field | Value |
|-------|-------|
| Decision Name | AEAD construction for at-rest secrets encryption |
| Decision ID | CRYPTO-DEC-001 |
| Date Created | 2026-05-03 |
| Date Last Reviewed | 2026-05-03 |
| Authors | Applied Cryptographer (review response) |
| Reviewers | Independent crypto reviewer (TBD; see note) |
| Status | Approved (pending independent review per rec #9) |
| Supersedes | none |
| Classification | Internal |

## Context

### What is being decided?

Replacing the existing `openssl enc -aes-256-cbc` invocation in `secrets-lib-dual.sh` with an authenticated construction that detects tampering and avoids padding-oracle exposure.

### Why now?

Pre-production review (2026-05-03) flagged the existing CBC-without-MAC construction as BLOCK-severity (finding B1). Combined with finding B2 (key reuse) and H6 (missing `-pbkdf2 -iter`), the existing pipeline must be rebuilt before any production use.

### Threat model alignment

Threats addressed: passive observation, active tampering, partial-file corruption, padding-oracle attack against decryption error paths.
Threats NOT addressed: key compromise on the encrypting host, side-channel observation of encryption.

### Operational constraints

| Constraint | Value |
|---|---|
| Latency budget | <50ms per file (typical secret <100 KB) |
| Hardware available | Travel host CPU only; no AES-NI guaranteed |
| Language ecosystem | Bash + small Python helper acceptable |
| FIPS | Not required |

## Decision

**Primitive**: XChaCha20-Poly1305 (libsodium `crypto_secretstream_xchacha20poly1305_*`)
**Library**: libsodium 1.0.20+ via small Python wrapper (PyNaCl), or `age` tool as alternative
**Mode**: secretstream with 1 MB chunks; final-chunk tag flag set
**Where used**: replaces `openssl enc -aes-256-cbc` call sites in `secrets-lib-dual.sh`

### Key management

| Aspect | Decision |
|---|---|
| Key source | HKDF-Expand from `prk = HKDF-Extract(challenge_file, hmac_5 \|\| 0x00 \|\| hmac_bio)` |
| Key length | 256-bit |
| Key separation | distinct via `info="ab-aead-v1"` (enc) and `info="ab-mac-v1"` (manifest MAC) |
| Key rotation | per session (challenge file regenerates) |
| Key escrow | none |

## Rationale

### Why XChaCha20-Poly1305

- 192-bit nonce — random nonce safe for this workload (no birthday concern)
- No hardware AES dependency (travel host may lack AES-NI)
- libsodium audited, broad bindings
- Misuse-resistant: no padding-oracle equivalent

### Why libsodium

- Public security audit (Cure53)
- Stable API, good Python binding via PyNaCl
- Acceptable size for inclusion in bootstrap blob

## Alternatives considered

### AES-256-GCM via OpenSSL

- Rejected: travel host AES-NI not guaranteed; performance hit acceptable but ChaCha is faster on commodity CPUs without AES-NI
- Revisit: if travel hardware is standardized to AES-NI capable

### age tool

- Rejected: adds an external binary to the bootstrap; the Python wrapper adds less surface
- Revisit: if a static `age` binary is added to the trusted bootstrap blob

### AES-256-GCM-SIV (RFC 8452)

- Rejected: more complex than needed; nonce reuse is not a realistic concern with per-session rotation
- Revisit: if architecture changes to require nonce-reuse resistance

## Test vectors

Per RFC 8439 §A.5 (ChaCha20-Poly1305 IETF) — XChaCha extends with longer nonce; conformance verified via libsodium's own test suite at integration time.

Negative tests added: bit-flip in ciphertext rejected; tag truncation rejected; wrong key rejected.

## Revisit triggers

- [ ] CVE on libsodium
- [ ] PyNaCl unmaintained for >12 months
- [ ] Migration to a different language ecosystem
- [ ] Need for FIPS validation arises

## Cross-references

- Threat model: see review-response document, finding B1
- Related decisions: CRYPTO-DEC-002 (HKDF for key separation; addresses finding B2)
- Implementation: `secrets-lib-dual.sh` — call sites to be migrated
- Skill: `crypto-primitive-selection` Section 1 (AEAD), Section 2 (KDF for the upstream key derivation)
