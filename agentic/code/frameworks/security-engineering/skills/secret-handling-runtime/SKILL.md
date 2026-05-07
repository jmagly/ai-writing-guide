---
namespace: aiwg
name: secret-handling-runtime
platforms: [all]
description: Decision aid for runtime secret hygiene — fd passing, scratch surface, error-path safety, identifier hygiene, and avoiding the SECRETS_ENV aggregation anti-pattern.

---

# secret-handling-runtime

Decision aid for how a system handles secrets **during** operation: in memory, in pipes, in scratch files, in error messages, in logs, in process tables. Use when designing or reviewing any code that touches secret material at runtime.

This skill complements the existing `addons/security/secure-token-load.md` (which covers tokens at rest — file modes, heredoc patterns, source locations). This skill covers **runtime** — what happens to those secrets between load and use, and what happens when something fails mid-operation.

## Triggers

- "secret in env" / "SECRETS_ENV"
- "shred" / "tmpfs" / "scratch surface"
- "set -e" / "error trap" / "ERR EXIT"
- "fd passing" / "named pipe for secrets"
- "log scrubbing" / "secret in error message"
- "ps aux" / "/proc/self/environ"
- "memory wipe" / "zeroize"

---

## Section 1: File-descriptor / named-pipe passing

### Suggested default — one secret per fd

```bash
# Caller
encrypt_program 3<<<"$SECRET_VALUE" 4<<<"$OTHER_SECRET" arg1 arg2

# Inside encrypt_program
secret=$(cat <&3)
other=$(cat <&4)
# fd 3 and fd 4 are open for the duration of the program
# never appear in /proc/self/environ, never in `ps aux`
```

Why this beats env vars:

- `env`, `printenv`, `/proc/<pid>/environ` are readable by other processes on most systems
- Env vars persist across `exec` chains (subprocess inherits)
- `set -x` (bash trace) prints env values for each subprocess invocation
- Crash dumps include env

### Anti-pattern: SECRETS_ENV aggregation (review M3)

```bash
# WRONG
SECRETS_ENV="api_key=$KEY1;db_pwd=$KEY2;jwt_secret=$KEY3"
some_program  # all three secrets visible to any process inspecting environ
```

Single variable = single leak vector. If `set -x` fires, all three leak. If a child process logs env, all three leak. Use one fd per secret OR one named pipe per secret.

### Named pipes (mkfifo) when fd passing isn't structural

```bash
mkfifo /tmp/secrets.fifo
chmod 600 /tmp/secrets.fifo
{ echo "$SECRET" > /tmp/secrets.fifo; } &
program /tmp/secrets.fifo
rm /tmp/secrets.fifo
```

Caveats:

- `/tmp/` should be tmpfs (Section 2)
- Named pipes are visible to other users via `ls -la /tmp/`; use a per-process directory in `/run/<uid>/` or `/dev/shm/` that's mode 700

---

## Section 2: Scratch surface — tmpfs only

### Suggested default — refuse to operate if `/tmp` is not tmpfs

```bash
require_tmpfs() {
    local path="${1:-/tmp}"
    if ! mountpoint -q "$path" || \
       [ "$(findmnt -no FSTYPE "$path")" != "tmpfs" ]; then
        echo "ERROR: $path is not tmpfs; refusing to operate" >&2
        exit 1
    fi
}
require_tmpfs /tmp
```

Why tmpfs only:

- tmpfs is RAM-resident; on shutdown, contents are gone
- Disk-backed `/tmp` (some servers, some embedded systems) leaves traces in flash wear-leveling, journal, and swap
- `shred -u` on flash storage is **worse than nothing** — it gives false assurance against wear-leveling reality (review M1)

### `shred` is not a substitute

`shred` overwrites file content multiple times then deletes. On flash storage (SSD, USB, eMMC), the wear-leveling layer remaps writes to fresh blocks; the original data sits in unmapped blocks until eventual reuse. `shred -u` deletes the visible file but the data remains recoverable via filesystem forensics.

`shred` IS appropriate for spinning disks where the OS guarantees in-place rewrites — uncommon in 2026.

For ephemeral scratch, tmpfs is the answer. For persistent encrypted storage, the encryption (LUKS, FileVault) is the answer; never write secrets to "ordinary" disk and try to delete them later.

### Documenting the scratch surface

```markdown
## Scratch surface

| Path | Backing | Acceptable for secrets? |
|------|---------|-------------------------|
| /tmp | tmpfs (verified at start) | yes |
| /var/tmp | disk | NO — refuse to write secrets |
| /dev/shm | tmpfs | yes |
| ~/.cache | disk | NO |
```

---

## Section 3: Error-path safety in shell

### Suggested default — `set -euo pipefail` + `trap cleanup`

```bash
#!/bin/bash
set -euo pipefail

cleanup() {
    # zeroize what we can; unmount tmpfs scratch
    [ -n "${SCRATCH_DIR:-}" ] && [ -d "$SCRATCH_DIR" ] && \
        shred -u "$SCRATCH_DIR"/*.tmp 2>/dev/null
    [ -n "${SECRET_VAR:-}" ] && unset SECRET_VAR
    [ -n "${MOUNTED:-}" ] && umount "$MOUNTED" 2>/dev/null
}
trap cleanup ERR EXIT INT TERM

# ... actual script logic
```

Without `set -e`, a failing `openssl enc` or `cat` mid-pipeline can produce a partial-state file the next step processes (review M2). Without the `trap`, an interrupted script leaves secret-bearing scratch files intact.

### Specific shell pitfalls

| Issue | Mitigation |
|---|---|
| `set -e` doesn't fire inside `if`/`while`/`&&`/`\|\|` chains | Test exit codes explicitly in those contexts: `if foo; then ...; else echo "foo failed"; exit 1; fi` |
| `set -e` ignores failures in subshells unless caller checks | `(...)` returns the subshell's exit; check it |
| `set -x` (debug) prints expanded variables — including secrets | Never enable `set -x` on secret-bearing code paths; use `set +x` defensively before secret handling |
| `cat /etc/secret \| openssl enc ...` — pipe failures partial-write | `set -o pipefail` to make the pipeline return any failure |

### Python / Node / Go equivalents

| Language | Pattern |
|---|---|
| Python | `try/finally` for cleanup; `subprocess.run(..., check=True)`; `secrets.compare_digest` for any constant-time compare |
| Node | `try/finally` + `process.on('exit', cleanup)`; pass-fd via `child_process.spawn(..., { stdio: [...] })` |
| Go | `defer cleanup()`; `os/exec.Cmd.ExtraFiles` for fd passing |

---

## Section 4: Memory hygiene

### When to bother

In long-running processes (daemons, sessions), wipe key material from memory after use:

```c
// C with libsodium
sodium_memzero(key, sizeof(key));
```

```python
# Python — limited; CPython doesn't guarantee zeroization but bytearrays help
import ctypes
key = bytearray(32)
# ... use key
ctypes.memset(ctypes.addressof(ctypes.c_char.from_buffer(key)), 0, len(key))
```

For short-lived programs (one-shot scripts), explicit zeroization is mostly performative — the process exits, OS reclaims memory. The bigger concern is:

- **Don't put secrets in long-lived globals**; make them function-local
- **Don't pass secrets as positional command-line args** (`ps aux` reveals them)
- **Don't log secrets, even to debug**

### `mlock` to prevent swap

```c
mlock(key_buffer, key_size);
// ... use
sodium_memzero(key_buffer, key_size);
munlock(key_buffer, key_size);
```

`mlock` prevents the page from being swapped to disk. Required when the process may run on a system with swap enabled. libsodium's `sodium_mlock`/`sodium_munlock` is portable.

---

## Section 5: Identifier hygiene

### Anti-pattern: serial numbers, IDs in metadata files (review L2)

```json
{
  "yk5_serial": "12345678",
  "bio_serial": "87654321"
}
```

Hardware serials in metadata expose:

- Operator identity (serials are often issued to specific people)
- Hardware revisions (different firmware = different attack surface)
- Inventory enumeration (attacker who recovers `.meta.json` learns what other devices the operator carries)

### Remediation: salted hash

```python
import hashlib, secrets
salt = secrets.token_bytes(16)  # per-USB, stored alongside
yk5_hash = hashlib.sha256(salt + yk5_serial.encode()).hexdigest()
# .meta.json stores yk5_hash and salt; serial is never persisted
```

The salt is stored *with* the metadata, so loss of the metadata file reveals nothing. The hash lets you verify "is this the right key?" without revealing which key.

### Apply broadly

The pattern applies to:

- Hardware serials (USB, YubiKey, smart card, TPM EK)
- Email addresses, usernames in stored audit
- IP addresses in long-term logs
- Build host fingerprints in artifact manifests

If you need to identify-without-revealing, salted-hash. If you need to compare-without-revealing, HMAC with a per-context key.

---

## Section 6: LUKS / full-disk header hygiene

### Required pattern (review M5)

```bash
# Provisioning
cryptsetup luksHeaderBackup /dev/sdX --header-backup-file /secure/headers/sdX.luksheader
gpg --encrypt --recipient hq-pubkey /secure/headers/sdX.luksheader
# Store encrypted backup off-device

# Recovery (when header is corrupted)
cryptsetup luksHeaderRestore /dev/sdX --header-backup-file /secure/headers/sdX.luksheader
```

A single bad block in the LUKS header bricks the volume. Backups are non-negotiable for production. The backup is encrypted to an HQ key (not the operator's keys) so its loss doesn't compromise active sessions and its theft doesn't compromise active sessions either — restoration requires HQ.

---

## Section 7: Logging policy

### Default

- **Never log secret material**, even truncated, even in debug, even in error
- **Log secret-bearing operation events** with public metadata only (who, when, where, success/fail — not what)
- **Log retention**: secret-bearing systems should keep logs short and rotate aggressively; logs are themselves a secondary attack surface

### Examples

```bash
# WRONG
log "Attempting to decrypt with key prefix: ${KEY:0:4}..."

# RIGHT
log "Decrypt attempt: kid=$(hash_id $KEY_NAME) result=$result"
```

Truncated keys are still useful to attackers (rainbow table search space reduction; structural fingerprint).

---

## Section 8: Worked examples

### Review M1 — `shred` on flash storage

Original: scripts use `shred -u` to delete secret-bearing files on the USB drive.

What this skill flags:

- Section 2: `shred` on flash is worse than nothing
- Section 2 anti-pattern: writing secrets to non-tmpfs scratch

Remediation:

- Verify `/tmp` is tmpfs at script start; refuse if not
- Move all scratch to tmpfs; don't write secret-bearing files to USB at all
- Document that the USB only holds encrypted-at-rest data, never plaintext

### Review M2 — `set -e` not specified

Original: scripts use `set -uo pipefail` but not `-e`.

What this skill flags:

- Section 3: missing `-e` allows silent partial-state errors

Remediation:

- Add `set -euo pipefail` to all secret-bearing scripts
- Add `trap cleanup ERR EXIT INT TERM`

### Review M3 — SECRETS_ENV aggregation

Original: all credentials concatenated into one `SECRETS_ENV` variable.

What this skill flags:

- Section 1 anti-pattern: aggregation = single leak vector

Remediation:

- One fd per secret, OR one named pipe per secret in tmpfs with mode 600
- Never `export` secret-bearing variables; keep them function-local

### Review L2 — YubiKey serials in `.meta.json`

What this skill flags:

- Section 5 anti-pattern: identifier in metadata

Remediation:

- Hash with per-USB salt; store `(salt, hash)` not raw serial

### Review M5 — no LUKS header backup

What this skill flags:

- Section 6 missing required pattern

Remediation:

- `cryptsetup luksHeaderBackup`, encrypt to HQ pubkey, store off-device, document recovery procedure, **test it**

---

## Section 9: Output format

When invoked as part of a review, produce findings in standard format. When the system is mature, produce a `secret-handling-policy.md` document covering Sections 1–7 with project-specific decisions.

---

## Related

- **At-rest companion**: `addons/security/secure-token-load.md` (token files, modes, heredoc patterns)
- **Companion skill**: `degraded-mode-design` (cleanup hygiene fires from degraded-mode triggers)
- **Companion skill**: `physical-threat-modeling` (cold-boot, DMA attacks against in-memory secrets)

## Standards referenced

- OWASP Cryptographic Storage Cheat Sheet
- OWASP Secure Headers Project
- NIST SP 800-88 — Media Sanitization (for the "shred is not enough" case)
- libsodium memory-handling documentation
- `man 7 random` — RNG and memory hygiene
- LUKS On-Disk Format Specification
