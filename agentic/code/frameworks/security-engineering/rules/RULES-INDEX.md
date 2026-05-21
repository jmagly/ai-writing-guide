# Security Engineering Rules Index

Applied-security enforcement rules for cryptographic primitive choices, chain-of-trust integrity, secret handling, supply-chain pinning, dependency-source policy, and related design-time concerns. Deployed when the `security-engineering` framework is installed.

---

## Tier 1 Rules (7 rules — applied cryptography, supply chain, language policy)

### HIGH

#### no-unauthenticated-encryption
**Summary**: Unauthenticated symmetric encryption modes (CBC, CTR, OFB, CFB, ECB) are PROHIBITED unless wrapped in a separate MAC over the ciphertext. Use AEAD (GCM, ChaCha20-Poly1305, AES-GCM-SIV) instead. Tag verification on decrypt MUST happen before any padding processing AND in constant time.
**When to apply**: Any code that encrypts data — config, source, build scripts, command lines
**Maps to review finding**: B1
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/no-unauthenticated-encryption.md

#### no-key-reuse-across-purposes
**Summary**: The same key material MUST NOT be used for two cryptographic purposes (encrypt + authenticate, encrypt + sign, etc.). Distinct purposes require distinct keys derived via HKDF-Expand with explicit `info` strings (e.g., `app-aead-v1`, `app-mac-v1`). AEAD constructions providing confidentiality + integrity from one key are NOT key reuse — that's the single intended purpose.
**When to apply**: Any code that uses cryptographic keys; especially when one variable feeds multiple primitive operations
**Maps to review finding**: B2
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/no-key-reuse-across-purposes.md

#### no-adhoc-kdf
**Summary**: Ad-hoc key derivation is PROHIBITED. Use HKDF for high-entropy IKM (≥128 bits effective: another KDF's output, hardware secret, DH/ECDH, CSPRNG). Use Argon2id (preferred) or PBKDF2-HMAC-SHA-256 ≥600k iter (legacy/FIPS) or scrypt for low-entropy IKM (passwords, PINs). Concat-and-hash is not a KDF; PBKDF2 over a high-entropy input is misapplied.
**When to apply**: Any code that derives a key from another secret or password
**Maps to review findings**: B2 (ad-hoc combination), H1 (PBKDF2 misapplied)
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/no-adhoc-kdf.md

#### crypto-flag-verification
**Summary**: When invoking crypto CLI tools (`openssl`, `gpg`, `age`, `7z`), KDF and mode parameters MUST be specified explicitly. `openssl enc` without `-pbkdf2 -iter N` defaults to single-MD5-iteration `EVP_BytesToKey` (essentially zero-work brute-force). `gpg --symmetric` requires `--s2k-mode 3 --s2k-count <high> --s2k-cipher-algo AES256 --s2k-digest-algo SHA512`. For new code, replace `openssl enc` with a small libsodium-based program.
**When to apply**: Any script or build step that calls a CLI crypto tool
**Maps to review finding**: H6
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/crypto-flag-verification.md

#### ci-action-pinning
**Summary**: Every CI workflow `uses:` reference MUST be a 40-character commit SHA (not a tag); every `container:`/`image:` reference MUST be `<name>:<tag>@sha256:<digest>`. Tools downloaded via `curl | sh` must record an observed-SHA log and support strict-mode SHA enforcement. Floating tags expose CI to silent supply-chain attacks (Shai-Hulud-class worm propagation). Maintain a pin manifest (`ci/digests.txt` or equivalent) as source of truth for diffs.
**When to apply**: Any workflow file under `.github/workflows/`, `.gitea/workflows/`, or equivalent; any tool-install step in CI
**Maps to issue**: #1293 (B3 / Mini Shai-Hulud)
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/ci-action-pinning.md

#### dependency-source-policy
**Summary**: Non-registry dependency sources (`git+`, `github:`, raw tarball URLs, `file:`, `link:`) are PROHIBITED — they bypass registry signature verification and can execute arbitrary code at install time via `prepare` scripts (Mini Shai-Hulud's primary propagation vector). Policy applies to `package.json` AND transitive lockfile entries. Exceptions require an allowlist entry with owner, reason, review_date, and explicit risk acceptance. pnpm workspaces must set `blockExoticSubdeps: true` for workspace-scope enforcement.
**When to apply**: Any change to `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb`; CI lint should run on every push
**Maps to issue**: #1297 (Mini Shai-Hulud follow-up)
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/dependency-source-policy.md

#### banned-apis
**Summary**: Project banlists at `.aiwg/security/banned-apis.yaml` declare APIs that MUST NOT appear in source files (per language, per path scope, with inline `AIWG-allow:` annotations for documented exceptions). Generalizes the applied-cryptography pattern into a configurable "list of forbidden functions" enforcer (curl's Practice 2). Bundled starter banlists cover C/C++ (`strcpy`, `sprintf`, `gets`, `strtok`, `atoi`), Python (`eval`, `exec`, `pickle.loads`, `shell=True`), and Node (`eval`, `new Function`, `child_process.exec`). The crypto rules remain CRITICAL specializations.
**When to apply**: Any source code in a language declared in the project banlist; enforced via the `banned-api-audit` skill at CI gate
**Maps to issue**: #1418 (curl checklist Practice 2)
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/banned-apis.md

---

## Quick Reference by Context

| Task Type | Relevant Rules |
|---|---|
| **Encryption** | no-unauthenticated-encryption, crypto-flag-verification |
| **Key derivation** | no-adhoc-kdf, no-key-reuse-across-purposes |
| **Multi-key systems** | no-key-reuse-across-purposes, no-adhoc-kdf |
| **Password handling** | no-adhoc-kdf (Argon2id/PBKDF2 ≥600k) |
| **CLI crypto invocations** | crypto-flag-verification, no-unauthenticated-encryption |
| **CI workflow review** | ci-action-pinning |
| **Container image references** | ci-action-pinning |
| **package.json / lockfile review** | dependency-source-policy |
| **Reviewing cryptographic decisions** | All four crypto rules in sequence |
| **Per-language forbidden APIs** | banned-apis (+ language-specific banlists) |

---

## Tier 2 (planned)

Future Tier 2 rules will cover authentication-factor architecture, degraded-mode behavior, secret-handling-runtime, supply-chain trust, and physical-threat scenarios. Tracked under milestone `security-engineering-v1` (#52).

---

*Generated from security-engineering framework — 7 rules in Tier 1*
*Full rule files: @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/*
