---
namespace: aiwg
name: auth-factor-design
platforms: [all]
description: Decision aid for authentication factor architecture — have/know/are mapping, coercion resistance, FIDO2 PIN/UV policy, and PRF hot-path anti-patterns.

---

# auth-factor-design

Decision aid for authentication factor architecture. Use when designing or reviewing any system whose unlock, login, or operation gating depends on more than one factor — and especially when biometrics, hardware tokens, or "something you know" enter the design.

The skill forces three explicit exercises: a **factor inventory**, a **coercion-resistance matrix**, and a **lockout/recovery policy**. Without all three, the design isn't complete.

## Triggers

- "factor design" / "MFA" / "multi-factor"
- "FIDO2 PIN" / "WebAuthn PIN"
- "biometric policy" / "uv=true"
- "coercion resistance" / "rubber-hose"
- "PRF hot path" / "hmac-secret"
- "what you know vs what you have"
- "duress code" / "duress factor"

## When NOT to use this skill

- Pure password-based authentication for low-stakes systems (use OWASP ASVS L1 guidance)
- OAuth/OIDC client design (different layer; use `sdlc-complete` security-architect for protocol selection)
- Network-layer mutual TLS (cert authentication, not user authentication)

---

## Section 1: The three factor classes

| Class | Examples | What "knowing it" means |
|---|---|---|
| **Have** | Hardware token, USB drive, smart card, phone with attestation | Possession demonstrates auth |
| **Know** | Password, PIN, passphrase, recovery code, pattern, security questions | Recall demonstrates auth |
| **Are** | Fingerprint, face, voice, gait, behavioral biometrics | Body demonstrates auth |

A "true" multi-factor system requires factors from at least **two distinct classes**. Three of the same class is not multi-factor — two passwords is one factor twice.

### Common misclassifications

- **SMS code**: not a "have" factor on its own — SIM-swappable, network-interceptable. Treat as a weak channel-bound code, not a possession proof.
- **TOTP from phone**: weak "have" if phone is uncontrolled (any app can read TOTP seed if leaked). Stronger if seed is in a hardware-backed enclave (Apple Secure Enclave, Android Strongbox).
- **Email confirmation link**: not a factor — it's a recovery channel that demonstrates control of the email account, which itself depends on factors.
- **"Security question" answers**: nominally "know" but socially harvestable; treat as a fallback recovery hint, not a factor.

---

## Section 2: Factor inventory exercise (mandatory)

Before declaring an auth design complete, fill out:

| Factor | Class | Specific instance | Required for which operations? | Lost-recovery procedure |
|---|---|---|---|---|
| YubiKey 5 OTP slot | have | hardware HMAC-SHA1 PRF | unlock, secret derivation | revoke at HQ, reissue |
| YubiKey Bio (FIDO2 PRF) | are+have | fingerprint + hmac-secret w/ uv=true | unlock, signing | revoke + reissue (≤4 weeks per fingerprint enrollment) |
| FIDO2 PIN | know | PIN on Bio key | required when `uv=true` | reset via reset-protocol; bricks key after N failures |
| Recovery passphrase | know | 6-word BIP39 phrase | emergency rotation only | offline backup at HQ |

**Required**: at least one row from each of two classes for any operation that protects high-value assets. Document operations that bypass this rule with explicit risk acceptance.

---

## Section 3: Coercion-resistance matrix (mandatory)

For each factor, document whether it can be coerced and what mitigates the coercion.

| Factor | Coercible? | How | Mitigation |
|---|---|---|---|
| Password / PIN | Yes — operator under duress reveals it | Mitigation: duress code that triggers fail-closed silent lockout |
| Hardware token | Yes — physical seizure | Mitigation: time-lock, witness requirement, second-factor at HQ |
| Biometric | **Always coerced**. Operator's body is present; "extracting" the biometric is trivial under duress | Mitigation: pair with a "know" factor (FIDO2 PIN) so coerced biometric alone fails |
| Geolocation | Coercible (move operator) | Mitigation: not a real factor; use as risk signal only |

### Anti-pattern: only have + are (review finding H2)

A system with hardware token + biometric and **no "know" factor** is not coercion-resistant. The attacker compels the operator to come to the device with the token in hand and the finger ready. There is nothing the operator can decline to provide.

A FIDO2 PIN as the third factor — REQUIRED for PRF assertion via `uv=true` — adds:

- A factor only the operator's mind contains (truly something they "know")
- A lockout-after-N-tries property (FIDO2 PIN bricks the key after retries; default ~8)
- Optional duress codes (some authenticators support a separate "wipe key on this PIN" entry)

Cost: zero hardware. Recommended for any production deployment of FIDO2/WebAuthn PRF.

---

## Section 4: FIDO2 / WebAuthn PRF design

### Suggested default

For hardware-backed authenticated key derivation:

- **FIDO2 hmac-secret extension** (PRF in WebAuthn-2 terminology) on a token with both PIN and biometric
- **`uv: required`** in the assertion — forces user verification
- **PIN required** — forces "know" alongside "have+are"
- **Per-RP credential isolation** — different RP IDs derive different PRF outputs

### Tooling

| Use case | Suggested tool | Vetted alternatives |
|---|---|---|
| Production C/C++ | **libfido2** (Yubico's reference C lib) | `python-fido2` only behind a sandbox; PyHanko/cose for high-level signing |
| FIDO2 CLI | **`fido2-token`, `fido2-assert`** (libfido2 binaries) | OpenSC for smart-card-style use |
| Browser-side WebAuthn | Web Crypto API + `navigator.credentials.create/get` | Server libs: `webauthn4j` (JVM), `simplewebauthn` (Node), `python-fido2` (server) |
| Testing | Yubico's `fido2-token -L`, virtual authenticators (Chrome devtools, soft-fido2) | Hardware test rigs only for pre-production validation |

### Anti-pattern: Python in the PRF hot path (review finding H3)

`python-fido2` in the **biometric PRF assertion path** introduces a wide attack surface for the most sensitive operation in the system:

- `python-fido2`, `cryptography`, `cffi`, `pyusb` — any of these getting a typosquat or supply-chain compromise = PRF interception
- The C path through `libfido2` is ~50KB statically linkable, audited, fewer transitive deps

**Remediation options:**

1. **Use `libfido2` C binaries** (`fido2-token`, `fido2-assert`) directly — they support `hmac-secret`. Drop Python from the hot path entirely.
2. **If Python is mandatory**: vendor and pin `python-fido2` + transitive deps with hash-locked wheels in your bootstrap; verify per-wheel SHA-256 against an offline manifest; reproducibly build the bootstrap.
3. **Either way**: run the PRF call inside a sandboxed namespace (bubblewrap, no network, no `/proc`, read-only mounts).

### RP ID guidance

`rp.id` in WebAuthn / FIDO2 is canonically a domain name. Some authenticators behave oddly with non-domain RP IDs (e.g., "agent-box"). For non-web contexts:

- Prefer a domain you control even if not actually web-served (`agent-box.example.com`)
- Test with multiple authenticator firmware versions before locking RP ID
- Document if you proceed with non-domain (review L1 finding)

---

## Section 5: Lockout / retry policy

| Factor | Failure response |
|---|---|
| FIDO2 PIN | Hard lockout after N failures (default ~8); brick key on M (default 3 lockout cycles); requires reset protocol with PIN+attestation |
| Biometric on hardware token | Fall back to PIN (if PIN set); on N failures of bio, force PIN; never "skip bio" |
| Application password | Rate-limit + account lock with side-channel notification; CAPTCHA after 3 failures (anti-bot, not anti-human) |
| Recovery code (single-use) | Mark used immediately; rotate active set; alert on use |

### Required exercise: document the exact behavior

For each authenticator in your system, document:

```
Factor: FIDO2 PIN on Bio key
Wrong-PIN behavior:
  After 1: warning + 1-second delay
  After 3: 5-second delay
  After 5: 30-second delay
  After 8: full lockout, requires reset
  Lockout cycles before key brick: 3 (default)
Reset procedure:
  fido2-token -R (factory reset, wipes credentials)
  Re-enroll fingerprint, re-set PIN
  Re-register with all RPs (operationally expensive — design for this)
```

If your design doesn't have this written down, it's incomplete.

---

## Section 6: Duress / coercion countermeasures

When the threat model includes coercion (high-value targets, journalists, security operators in hostile environments), build in:

| Countermeasure | How |
|---|---|
| **Duress PIN** | Separate PIN that triggers visible-success but secret wipe. Hardware support varies; some FIDO2 firmware supports it, most don't. Document if your hardware does. |
| **Time-lock** | Operations require N-minute delay; operator can secretly trigger a longer delay during which silent alarm fires |
| **Witness requirement** | High-value operations require a second operator present (cryptographically verified — e.g., second YubiKey assertion) |
| **Geographic / device fence** | Operations only succeed from authorized locations or hardware; revocable centrally |
| **Silent canary / heartbeat** | Operator periodically demonstrates non-coercion; missed heartbeat triggers alert (review M7: heartbeat is killable by root, mitigate via signed live image) |

**Important**: every coercion countermeasure has operational cost. A duress PIN that the operator forgets locks them out as effectively as the attacker does. Test the failure modes.

---

## Section 7: Worked examples

### Review finding H2 — "what you have + what you are" only

Original design: 2-of-2 with one biometric (YubiKey 5 + YubiKey Bio with fingerprint).

What this skill flags:

- Section 3 anti-pattern: no "know" factor → coercion gives the attacker everything
- Section 6: no duress countermeasure documented

Remediation:

- Set FIDO2 PIN on Bio key; require `uv=true` in PRF assertion
- Document PIN lockout policy
- Optionally add duress procedure (geographic alert, second-operator witness)

### Review finding H3 — `python-fido2` in PRF hot path

Original design: Python program calls `python-fido2` to do the biometric PRF assertion.

What this skill flags:

- Section 4 anti-pattern: Python deps in hot path → wide attack surface

Remediation:

- Replace with `libfido2` C tools (`fido2-token`, `fido2-assert -h hmac-secret`)
- If Python is mandatory: vendor + hash-lock all transitive deps; sandbox the call

### Review finding M4 — biometric retry behavior unclear

Original design: `uv: REQUIRED` documented, but lockout/fallback behavior not specified.

What this skill flags:

- Section 5 mandatory exercise: exact lockout behavior must be documented

Remediation:

- Run `fido2-token -L` against a test key, document observed behavior under N failures
- Verify Bio key was not factory-defaulted to "no PIN" (if so, set one)
- Add behavior to `factor-design-rationale.md` per-factor

---

## Section 8: Output format

When this skill is invoked as part of a review, produce a `factor-design-rationale.md` (template in `templates/factor-design-rationale.md`) with:

- Factor inventory table (Section 2)
- Coercion-resistance matrix (Section 3)
- Lockout/retry policy per factor (Section 5)
- Hardware/firmware constraints (FIDO2 version, PRF support, UV behavior)

If issues are found, produce findings in the standard format:

```markdown
### Finding: <SHORT-NAME>

**Severity**: BLOCK | HIGH | MEDIUM | LOW
**Section**: auth-factor-design <section reference>
**Issue**: <one paragraph>
**Remediation**: <concrete fix>
**References**: <NIST SP 800-63B, FIDO2 spec, etc.>
```

---

## Related

- **Companion skill**: `physical-threat-modeling` (Tier 2) — coercion is in its threat library
- **Companion skill**: `degraded-mode-design` (Tier 2) — what happens when factors fail
- **Companion skill**: `chain-of-trust-design` — the factors only matter if the verifier is trusted
- **Template**: `factor-design-rationale.md`

## Standards referenced

- NIST SP 800-63B — Digital Identity Guidelines: Authentication
- FIDO2 / CTAP2 specification
- WebAuthn Level 2 / Level 3 specifications
- OWASP ASVS 4.0 §2 (Authentication)
- libfido2 documentation
