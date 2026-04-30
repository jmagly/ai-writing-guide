---
namespace: aiwg
name: forensics-hunt
platforms: [all]
description: Threat hunt using Sigma rules against log sources
commandHint:
  argumentHint: "[--rules rule-id,...|all] [--target host] [--logs-path path] [--output path]"
  category: forensics-hunting
---

# /forensics-hunt

Perform structured threat hunting by executing Sigma detection rules against collected log sources. Supports targeted rule selection or full rule set execution. Outputs matched detections with evidence context and MITRE ATT&CK annotations.

## Usage

`/forensics-hunt [options]`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| --rules | No | Rule IDs to run, comma-separated, or `all` (default: `all`) |
| --target | No | Target hostname to scope the hunt |
| --logs-path | No | Path to collected logs directory (default: `.aiwg/forensics/acquisition/logs/`) |
| --output | No | Output path (default: `.aiwg/forensics/analysis/hunt-findings.md`) |
| --severity | No | Minimum rule severity to execute: `low`, `medium`, `high`, `critical` (default: `medium`) |
| --since | No | Only evaluate log entries after this timestamp |
| --format | No | Output format: `markdown` (default), `json`, `sigma-results` |
| --list-rules | No | List available rules without executing |

## Behavior

When invoked, this command:

1. **Discover Log Sources**
   - Locate collected logs at specified or default path
   - Identify log types: auth, syslog, journal, audit, application
   - Map log formats to compatible Sigma field mappings
   - Validate log file integrity against acquisition checksums

2. **Load Sigma Rules**
   - Load rules from `@$AIWG_ROOT/agentic/code/frameworks/forensics-complete/sigma/`
   - Filter by `--rules` selection or severity threshold
   - Resolve rule dependencies and required fields
   - Report rules skipped due to missing log sources

3. **Execute Detections**
   - Run each applicable rule against relevant log sources
   - Apply field mappings to normalize log formats
   - Filter by `--since` timestamp if provided
   - Track match counts and false positive indicators

4. **Detection Categories**

   | Category | Example Rules |
   |----------|--------------|
   | Authentication | `ssh-brute-force-success`, `password-spray`, `invalid-user-spikes` |
   | Privilege Escalation | `sudo-to-root`, `suid-execution`, `new-root-session` |
   | Persistence | `cron-modification`, `new-systemd-unit`, `authorized-key-added` |
   | Lateral Movement | `internal-ssh-from-new-host`, `ssh-agent-forwarding` |
   | Defense Evasion | `log-deletion`, `audit-tampering`, `history-cleared` |
   | Exfiltration | `large-outbound-transfer`, `curl-to-external`, `dns-exfil` |
   | C2 | `reverse-shell-indicators`, `beaconing-intervals`, `tunnel-traffic` |

5. **Result Enrichment**
   - Extract matching log lines as evidence
   - Provide context window (5 lines before/after match)
   - Link detections to MITRE ATT&CK technique IDs
   - Score detection confidence (HIGH/MEDIUM/LOW) based on rule quality

6. **Hunt Summary**
   - Count detections by severity and category
   - Identify accounts, IPs, and processes involved
   - Generate prioritized finding list
   - Recommend follow-up investigation steps

## Examples

### Example 1: Full rule set, all logs
```bash
/forensics-hunt
```

### Example 2: Specific rules against a target
```bash
/forensics-hunt --rules ssh-brute-force-success,sudo-to-root --target web01
```

### Example 3: High and critical severity only
```bash
/forensics-hunt --severity high
```

### Example 4: Hunt recent log entries
```bash
/forensics-hunt --since 2026-02-26T18:00:00Z --severity medium
```

### Example 5: List available rules
```bash
/forensics-hunt --list-rules
```

### Example 6: JSON output for SIEM import
```bash
/forensics-hunt --severity high --format json
```

## Output

Artifacts are saved to `.aiwg/forensics/analysis/`:

```
.aiwg/forensics/analysis/
├── hunt-findings.md          # Human-readable detection results
├── hunt-findings.json        # Machine-readable results
└── rule-execution-log.yaml   # Which rules ran, match counts, errors
```

### Sample Output

```
Threat Hunt: web01-2026-02-27
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Log sources: auth.log, syslog, journal, audit.log (140.6 MB)
Rules loaded: 47 applicable (of 63 total, 16 skipped: missing sources)

Executing rules...

[HIGH  ] ssh-brute-force-success      MATCH (1 event)
[HIGH  ] sudo-to-root                 MATCH (2 events)
[CRITICAL] cron-modification          MATCH (1 event)
[HIGH  ] reverse-shell-indicators     MATCH (1 event)
[MEDIUM] invalid-user-spikes          MATCH (847 events)
[MEDIUM] curl-to-external             MATCH (3 events)
[LOW   ] failed-su-attempts           no match
[LOW   ] password-spray               no match

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detection Summary:
  CRITICAL: 1   HIGH: 3   MEDIUM: 2   LOW: 0
  Total detections: 6 rules matched across 855 events

--- ssh-brute-force-success (HIGH, T1110.001) ---
Match: 2026-02-26 22:29:01 Accepted publickey for deploy from 185.220.101.42 port 51823
Context: Following 847 failed attempts (22:14:33-22:29:00) from same IP
Confidence: HIGH

--- cron-modification (CRITICAL, T1053.003) ---
Match: 2026-02-26 22:33:45 crontab: deploy modified crontab for root
Context: 4 minutes after successful SSH login from attacker IP
Confidence: HIGH

Hunt complete.
Output: .aiwg/forensics/analysis/hunt-findings.md
```

### Available Rules List (--list-rules)

```
ID                          Severity  Category           Description
────────────────────────────────────────────────────────────────────
ssh-brute-force-success     HIGH      Authentication     Successful login after brute force
password-spray              MEDIUM    Authentication     Many failed logins across accounts
sudo-to-root                HIGH      Privilege Esc.     User obtained root via sudo
new-root-session            HIGH      Privilege Esc.     Root shell opened (non-login)
cron-modification           CRITICAL  Persistence        Crontab file modified
new-systemd-unit            HIGH      Persistence        New systemd unit installed
authorized-key-added        HIGH      Persistence        New SSH authorized key added
log-deletion                HIGH      Defense Evasion    Log file deleted or truncated
reverse-shell-indicators    HIGH      C2                 Bash/nc/python reverse shell pattern
beaconing-intervals         MEDIUM    C2                 Regular outbound connection pattern
large-outbound-transfer     HIGH      Exfiltration       Unusually large outbound data transfer
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/agents/log-analyst.md - Log Analyst
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/sigma/ - Sigma rule library
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-ioc.md - IOC extraction from findings
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-timeline.md - Timeline correlation
