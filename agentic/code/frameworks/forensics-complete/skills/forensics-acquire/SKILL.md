---
namespace: aiwg
name: forensics-acquire
platforms: [all]
description: Evidence acquisition with chain of custody and hash verification
commandHint:
  argumentHint: "<target> [--logs] [--config] [--memory] [--disk] [--all]"
  category: forensics-acquisition
---

# /forensics-acquire

Collect and preserve forensic evidence from the target system with complete chain of custody documentation and SHA-256 hash verification. Supports selective acquisition of logs, configuration files, memory images, and disk artifacts.

## Usage

`/forensics-acquire <target> [options]`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| target | Yes | SSH connection string (`ssh://user@host:port`) |
| --logs | No | Acquire system and application logs |
| --config | No | Acquire configuration files (SSH, cron, systemd, PAM) |
| --memory | No | Acquire memory image via `/proc/kcore` or LiME |
| --disk | No | Acquire disk image or filesystem artifacts |
| --all | No | Acquire all evidence types |
| --since | No | Acquire logs since timestamp (e.g., `2026-02-27T00:00:00Z`) |
| --output | No | Output directory (default: `.aiwg/forensics/acquisition/`) |
| --cloud | No | Acquire cloud evidence (EBS snapshots, CloudTrail, Activity Logs, Audit Logs) |
| --container | No | Acquire container evidence (logs, filesystem exports, inspect data) |
| --compress | No | Compress evidence archives with gzip |
| --no-verify | No | Skip post-acquisition hash verification (not recommended) |

## Behavior

When invoked, this command:

1. **Initialize Chain of Custody**
   - Generate unique evidence case ID (`EVD-<date>-<seq>`)
   - Record investigator identity, start timestamp, and collection method
   - Create custody log entry for each artifact

2. **Log Acquisition** (when `--logs` specified)
   - Collect authentication logs: `/var/log/auth.log`, `/var/log/secure`
   - Collect system logs: `/var/log/syslog`, `/var/log/messages`
   - Collect journal entries: `journalctl` full export
   - Collect application logs: nginx, apache, mysql, postfix (auto-detected)
   - Collect audit logs: `/var/log/audit/audit.log`
   - Filter by `--since` timestamp if provided
   - Compute SHA-256 for each collected file

3. **Configuration Acquisition** (when `--config` specified)
   - SSH daemon config: `/etc/ssh/sshd_config` and `sshd_config.d/`
   - Authorized keys: all user `.ssh/authorized_keys` files
   - Cron configurations: `/etc/cron*`, `/var/spool/cron/`
   - Systemd units: `/etc/systemd/system/`, `/usr/lib/systemd/system/` (recently modified)
   - PAM configuration: `/etc/pam.d/`
   - Sudoers: `/etc/sudoers`, `/etc/sudoers.d/`
   - Shell profiles: `.bashrc`, `.profile`, `.bash_profile` for all users

4. **Memory Acquisition** (when `--memory` specified)
   - Attempt acquisition via `/proc/kcore` (limited)
   - Check for LiME kernel module availability
   - If LiME available: load module, acquire to network socket or file
   - Record memory size and acquisition duration
   - Compute SHA-256 of memory image

5. **Disk Artifact Acquisition** (when `--disk` specified)
   - Collect recently modified files (mtime within investigation window)
   - Acquire suspicious directories identified during triage
   - Preserve deleted file metadata via `debugfs` or `extundelete`
   - Capture partition layout and mount state

6. **Cloud Evidence Acquisition** (when `--cloud` specified)
   - AWS: Create EBS snapshot of instance volume, export CloudTrail events to JSON, generate and download IAM credential report
   - Azure: Create VM disk snapshot, export Activity Log to JSON
   - GCP: Create disk snapshot, export Audit Logs to JSON
   - Compute SHA-256 for each downloaded artifact; record cloud snapshot IDs in evidence manifest (integrity attested by provider)

7. **Container Evidence Acquisition** (when `--container` specified)
   - Enumerate running and stopped containers on target
   - For each relevant container: collect logs (`docker logs`), export filesystem (`docker export`), capture inspect metadata (`docker inspect`)
   - Compute SHA-256 for each artifact
   - Containers are not stopped or removed until all evidence is secured

8. **Integrity Verification**
   - Verify SHA-256 of each acquired artifact against original
   - Record match/mismatch status in evidence manifest
   - Flag any verification failures for investigator review

9. **Evidence Manifest**
   - Generate `evidence-manifest.yaml` with all artifact metadata
   - Include: filename, original path, collected timestamp, hash, size
   - Update chain-of-custody log with completion entry
   - Write `custody-log.yaml` with full acquisition audit trail

## Examples

### Example 1: Acquire logs only
```bash
/forensics-acquire ssh://admin@192.168.1.50 --logs
```

### Example 2: Acquire logs and config
```bash
/forensics-acquire ssh://admin@192.168.1.50 --logs --config
```

### Example 3: Full acquisition
```bash
/forensics-acquire ssh://root@10.0.0.5 --all
```

### Example 4: Logs since incident window
```bash
/forensics-acquire ssh://admin@host --logs --since 2026-02-26T18:00:00Z
```

### Example 5: Compressed acquisition
```bash
/forensics-acquire ssh://admin@host --logs --config --compress
```

### Example 6: Cloud evidence acquisition
```bash
/forensics-acquire aws://account-id --cloud
```

### Example 7: Container evidence acquisition
```bash
/forensics-acquire ssh://admin@host --container
```

### Example 8: Full acquisition including cloud and container evidence
```bash
/forensics-acquire ssh://root@10.0.0.5 --all --cloud --container
```

## Output

Artifacts are saved to `.aiwg/forensics/acquisition/`:

```
.aiwg/forensics/acquisition/
├── evidence-manifest.yaml        # Complete artifact inventory with hashes
├── custody-log.yaml              # Chain of custody audit trail
├── logs/
│   ├── auth.log.gz
│   ├── syslog.gz
│   ├── btmp.gz
│   ├── dpkg.log.gz
│   ├── journal-export.bin.gz
│   └── audit.log.gz
├── snapshots/
│   ├── login-history.txt
│   ├── failed-logins.txt
│   └── recently-modified.txt
├── config/
│   ├── sshd_config
│   ├── authorized_keys-<user>.txt
│   ├── crontabs/
│   └── sudoers/
├── images/
│   ├── disk.img
│   └── memory.raw
├── cloud/
│   ├── cloudtrail-events.json
│   ├── iam-credential-report.csv
│   ├── azure-activity-log.json
│   └── gcp-audit-log.json
├── containers/
│   ├── <container_id>-logs.txt
│   ├── <container_id>-filesystem.tar
│   └── <container_id>-inspect.json
└── checksums.sha256
```

### Sample Output

```
Acquiring Evidence: 192.168.1.50
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Case ID: EVD-2026-02-27-001
Investigator: analyst@workstation
Start: 2026-02-27T14:39:02Z

Step 1: Log acquisition
  auth.log (4.2 MB)          sha256: a1b2c3...  VERIFIED
  syslog (12.8 MB)           sha256: d4e5f6...  VERIFIED
  journal export (87.3 MB)   sha256: 789abc...  VERIFIED
  audit.log (2.1 MB)         sha256: def012...  VERIFIED
  nginx/access.log (34.2 MB) sha256: 345678...  VERIFIED

Step 2: Configuration acquisition
  /etc/ssh/sshd_config       sha256: 9abcde...  VERIFIED
  authorized_keys (3 users)  sha256: f01234...  VERIFIED
  /etc/crontab               sha256: 567890...  VERIFIED
  /etc/sudoers               sha256: abcdef...  VERIFIED

Step 3: Integrity verification
  14 artifacts collected
  14/14 hashes verified
  0 verification failures

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acquisition complete.

Evidence: .aiwg/forensics/acquisition/
Manifest: .aiwg/forensics/acquisition/evidence-manifest.yaml
Custody: .aiwg/forensics/acquisition/custody-log.yaml
Total: 14 artifacts (140.6 MB)

Next Steps:
  /forensics-investigate ssh://admin@192.168.1.50 --skip-stage acquire
  /forensics-timeline .aiwg/forensics/findings/web01-2026-02-27/
```

## Chain of Custody Format

```yaml
# .aiwg/forensics/acquisition/custody-log.yaml
case_id: EVD-2026-02-27-001
target: 192.168.1.50
investigator: analyst@workstation
entries:
  - artifact: auth.log
    original_path: /var/log/auth.log
    collected_at: "2026-02-27T14:39:15Z"
    method: ssh-scp
    sha256: a1b2c3d4e5f6...
    size_bytes: 4404224
    verified: true
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/agents/forensic-acquisition-agent.md - Acquisition Agent
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/templates/evidence-manifest.yaml - Manifest schema
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/templates/custody-log.yaml - Custody log schema
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-investigate.md - Full workflow
