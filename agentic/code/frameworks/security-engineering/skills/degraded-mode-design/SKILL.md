---
namespace: aiwg
name: degraded-mode-design
platforms: [all]
description: Decision-aid skill for fail-closed vs fail-open behavior. Forces a degraded-mode matrix and rejects "type Y to override" prompts in favor of multi-step ceremonies

---

# degraded-mode-design

Decision aid for what a system does when something goes wrong: a key is missing, a verification fails, a sensor times out, a network partition is detected. Use when designing or reviewing any code path labeled "emergency", "fallback", "recovery", or "graceful degradation".

The skill exists because the wrong fallback can defeat the entire design. Review finding B4 ("emergency-lock copies VM disk unencrypted") is the canonical example: the fallback intended to preserve availability also preserved the assets in plaintext, defeating the encryption that was the entire point of the system.

## Triggers

- "fail closed" / "fail open"
- "emergency lock" / "panic" / "kill switch"
- "degraded mode" / "graceful degradation"
- "fallback path" / "recovery path"
- "what happens when" / "edge case in"
- "override" / "type Y to continue"

---

## Section 1: Default principle — security products fail CLOSED

The CIA triad (Confidentiality, Integrity, Availability) ranks differently for different systems:

| System type | Priority | Failure default |
|---|---|---|
| Security product (encryption, auth) | C > I > A | Fail closed: no operation rather than insecure operation |
| Safety system (medical, aviation) | A > I > C | Fail safe: known-good degraded behavior |
| Financial system | I > C > A | Fail closed for writes, log everything |
| Communication infrastructure | A > I > C | Fail open: best effort, alert on issues |

For a **security product**, the default behavior on any failure is: **stop, preserve confidentiality and integrity, alert the operator**. Preserving availability of the secret operation when its protection is failing is the wrong trade.

This is the rule review finding B4 violated: when both YubiKeys were missing, the emergency-lock script copied the VM disk **unencrypted** to "preserve the session." The premise — losing session is worse than brief unencrypted exposure — is wrong for a security-first product. The whole point of the dual-YubiKey design was that no keys = no session.

---

## Section 2: Anti-patterns (BLOCK on these)

### Plaintext fallback when encrypted operation fails

```bash
# WRONG (review B4)
if both_keys_missing; then
    cp vm.disk.encrypted /backup/vm.disk.plaintext  # preserve session at cost of confidentiality
fi
```

### "Type Y to override" prompts on integrity failure (review M8)

```bash
# WRONG
echo "[!] Manifest verification failed."
read -p "Type Y to continue anyway: " ans
[ "$ans" = "Y" ] && exec ./unlock.sh
```

Operators learn to autoresponse-Y. The override defeats integrity exactly when integrity matters most: when something has changed.

### Mode-mixing during failure

```bash
# WRONG
if encryption_module_unavailable; then
    log "encryption disabled, continuing"
    write_plaintext "$@"
fi
```

Operators forget which mode they were in. Two minutes later, they expect ciphertext on disk, but it's plaintext.

### Recovery path that reuses operational keys

If the operational path uses keys A+B and the recovery path uses keys A+B+C, then the recovery path is a *strict superset* of the operational path. An attacker with A+B has both. Recovery must use a *separate* key set (e.g., HQ escrow key, not held by the operator).

---

## Section 3: Required pattern — separate operational vs escrow paths

A system that needs both:

- **Operational availability** (the main use case must work end-to-end with all factors present), AND
- **Recovery from total factor loss** (operator stranded, hardware failure, etc.)

…must design **two distinct paths** that do not share key material:

```
Operational path:
  factors {A, B, C}  →  unlock(...)  →  secret operation

Escrow path:
  HQ-only key K_escrow  →  encrypt-to-K_escrow at provisioning
  …
  Recovery: HQ + K_escrow  →  re-derive operational state
```

Properties:

- The escrow path is **opt-in at provisioning** — the operator chooses to encrypt to HQ key
- The escrow path's keys are **never present** when operational path is active
- Use of escrow path is **logged and alertable** at HQ — no quiet recovery
- The escrow path **does not preserve the operational secrets in plaintext** at any point — the recovery target is HQ's controlled environment, not the operator's device

This is the remediation pattern for review finding B4.

---

## Section 4: Override ceremonies (when override is unavoidable)

Sometimes manual override is genuinely necessary (system migration, key rotation, legitimate emergency). When it is:

### Anti-pattern (review M8)

```
[!] Integrity check failed. Type Y to override:
```

### Required pattern: multi-step ceremony

A real override requires:

1. **Type a verification artifact** — operator types the SHA-256 prefix of the failing file (forces them to look at it, not autoresponse)
2. **Witness confirmation** — second person physically present, ideally with their own credential
3. **External logging** — override event written to a log the operator cannot suppress (HQ-side syslog, append-only ledger)
4. **Time-delay** — override takes effect after N seconds; alert fires immediately, override completes only if not aborted

```bash
read -p "Override SHA-256 prefix (first 8 hex chars of failing file): " prefix
expected=$(sha256sum failing-file | cut -c1-8)
if [ "$prefix" != "$expected" ]; then
    log "Override aborted: prefix mismatch"
    exit 1
fi
log_external "Override initiated by ${USER} at $(date -Is)"
sleep 30
echo "Override active. Type CONFIRM or anything else to abort:"
read confirm
[ "$confirm" = "CONFIRM" ] || { log_external "Override aborted by user"; exit 1; }
```

Better: **remove the override entirely** and require returning to HQ. If you can't, document why and accept the residual risk explicitly.

---

## Section 5: Degraded-mode matrix exercise (mandatory)

Before declaring a security design complete, fill out:

| Trigger | What the system does | Cleanup of in-memory secrets | Operator notification | Recovery path |
|---|---|---|---|---|
| One factor lost | refuse operation; preserve at-rest state | clear RAM via tmpfs unmount | display + log | bring missing factor back |
| All factors lost | refuse operation; shred any in-memory plaintext | clear RAM | display + log + HQ alert | escrow path (separate keys) |
| Network lost mid-operation | complete current op offline if safe; defer next | n/a | display | wait for network |
| Hardware failure (TPM/HSM) | refuse operation | clear RAM | display + HQ alert | replace hardware; re-provision |
| Verification failure (signature, manifest) | refuse operation | clear RAM | display + HQ alert | investigate; do not override |
| Time skew detected (HMAC TOTP) | small skew: accept; large skew: refuse | n/a | display | sync clock; investigate |

Every row must have an entry in every column. "TBD" means the design is incomplete.

---

## Section 6: Cleanup hygiene during degraded modes

When a degraded mode triggers, the system MUST clean up secrets it had in flight:

- **Memory**: zeroize all key buffers; on Linux use `mlock`+`memset_explicit` or `mlock`+exit (libsodium `sodium_memzero`); avoid signal-races
- **tmpfs**: unmount or delete-and-fsync any scratch files
- **Process state**: do not write any error message to disk that contains secret material; truncate logs that may have contained partial keys
- **Output channels**: never pass partial state to a subprocess that might persist it

See `secret-handling-runtime` skill for the full pattern; this skill just enforces that degraded-mode triggers invoke that cleanup.

---

## Section 7: Worked examples

### Review finding B4 — emergency-lock plaintext

Original:

```
When both YubiKeys are gone:
  → 31-usb-emergency-lock.sh copies VM disk UNENCRYPTED to LUKS volume
```

What this skill flags:

- Section 1: security product, default fail-closed; preserving session unencrypted violates the principle
- Section 2 anti-pattern: plaintext fallback
- Section 3: no separate escrow path; operational and recovery share the threat surface

Remediation:

- Replace with: shred VM disk in tmpfs, fail closed, alert HQ
- Provide opt-in stranded-session escrow encrypted to HQ pubkey, never to missing operator keys

### Review finding M8 — Y-to-override prompt

Original:

```
[!] Boot-time integrity check failed. Type Y to override:
```

What this skill flags:

- Section 2 anti-pattern: autoresponse-prone override
- Section 4: required ceremony missing

Remediation:

- Remove the override entirely (require returning to HQ), OR
- Replace with multi-step ceremony per Section 4

---

## Section 8: Output format

When this skill is invoked as part of a review, produce findings in the standard format. When authoring a `degraded-mode-matrix.md` (template), drive the matrix and override-ceremony sections.

```markdown
### Finding: <SHORT-NAME>

**Severity**: BLOCK | HIGH | MEDIUM | LOW
**Section**: degraded-mode-design <section reference>
**Issue**: <what's broken>
**Remediation**: <concrete fix>
```

---

## Related

- **Template**: `degraded-mode-matrix.md`
- **Companion skill**: `secret-handling-runtime` (cleanup hygiene during degraded modes)
- **Companion skill**: `auth-factor-design` (which factors trigger which degraded modes)
- **Companion skill**: `chain-of-trust-design` (the override-prompt anti-pattern is shared)

## Standards referenced

- NIST SP 800-160 v1 — Systems Security Engineering
- NIST SP 800-184 — Cyber Resiliency
- "Secure by Design" patterns (CISA, 2023)
