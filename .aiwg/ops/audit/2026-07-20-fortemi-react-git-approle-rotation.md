# Fortemi React Git AppRole Rotation Audit

- Date: 2026-07-20 (America/New_York)
- Host: grissom
- Operator: roctinam, assisted by Codex
- AppRole: `git-fortemi-react-roctinam`
- Trigger: SecretID disclosure during local recovery-file discovery
- Result: completed

## Actions

1. Read the existing role ID and SecretID through the TPM credential store
   without displaying either value.
2. Created a replacement SecretID through the OpenBao administrative API.
3. Validated the replacement before revocation.
4. TPM-sealed the replacement as
   `/etc/credstore.encrypted/openbao-git-fortemi-react-roctinam-secret-id`.
5. Replaced the active combined handoff and encrypted Kingston recovery copy.
6. Destroyed every SecretID accessor that predated the replacement.
7. Updated and synced the encrypted-volume manifest.

## Verification

| Check | Result |
| --- | --- |
| Replacement AppRole login | PASS |
| Fortemi React commit-key read | HTTP 200 |
| Fortemi React Git SSH-key read | HTTP 200 |
| Adjacent Fortemi React release-key read | HTTP 403 |
| Previous exposed SecretID login | HTTP 400 |
| TPM-sealed value matches replacement | PASS |
| Active and Kingston combined handoffs match | PASS |
| Kingston manifest copy verification | PASS |

No credential value, value fragment, or secret-derived digest is recorded in
this audit.
