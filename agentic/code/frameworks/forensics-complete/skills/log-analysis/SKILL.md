---
namespace: aiwg
name: log-analysis
description: "Correlate auth.log, syslog, journald, application, and web logs to detect brute force, privilege escalation, and lateral movement."
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# log-analysis

Correlates log data from multiple sources to identify attacker activity patterns including brute force login attempts, credential stuffing, privilege escalation, lateral movement, and data exfiltration. Adapts to log availability on the target system and produces a structured timeline of suspicious events.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "auth.log" / "syslog" → specific log file analysis
- "lateral movement" → log-based lateral movement detection
- "brute force" → authentication attack detection in logs

## Purpose

Individual log sources tell fragments of a story. Correlating authentication logs, process accounting, web access logs, and application logs reveals the full attack chain: initial access method, persistence establishment, privilege escalation path, and lateral movement targets. This skill assembles those fragments into a coherent timeline.

## Behavior

When triggered, this skill:

1. **Discover available log sources**:
   - Check for journald: `journalctl --disk-usage 2>/dev/null`
   - Check for traditional syslog files: `/var/log/syslog`, `/var/log/messages`
   - Check for auth logs: `/var/log/auth.log` (Debian) or `/var/log/secure` (RHEL)
   - Check for web server logs: `/var/log/nginx/`, `/var/log/apache2/`, `/var/log/httpd/`
   - Check for application-specific logs: `/var/log/` subdirectories
   - Record which sources are available and which are absent (absence is itself evidence)

2. **Authentication log analysis**:
   - Extract all SSH authentication events:
     ```bash
     grep -E 'sshd.*(Failed|Accepted|Invalid|Disconnected)' /var/log/auth.log
     ```
   - Count failed logins per source IP to detect brute force:
     ```bash
     grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20
     ```
   - Extract successful logins after prior failures (credential stuffing success indicator)
   - Parse sudo and su events: privilege escalation timing, escalating users, target users

3. **Brute force pattern detection**:
   - Identify source IPs with > threshold failed attempts within a rolling time window
   - Flag distributed brute force: multiple IPs, same username targets, compressed time window
   - Check for password spraying: many usernames, few attempts each, from one or few IPs
   - Flag successful login from an IP that previously generated failures (compromise indicator)

4. **Privilege escalation analysis**:
   - Sudo usage: `grep sudo /var/log/auth.log | grep -v 'pam_unix\|session'`
   - PAM events for su, sudo, and other elevation mechanisms
   - setuid binary execution via process accounting if available: `lastcomm 2>/dev/null`
   - Journal entries for systemd service unit changes by non-root users

5. **Lateral movement indicators**:
   - Internal SSH connections (source IP is RFC1918): logins from one internal host to another
   - Service accounts authenticating interactively
   - Accounts logging in from multiple source IPs within a short window
   - Use of credential forwarding (SSH agent forwarding): `grep 'agent' /var/log/auth.log`

6. **Web access log analysis**:
   - Parse combined log format for common web attack patterns:
     ```bash
     grep -E '\.(php|asp|aspx|jsp|cgi).*\?(.*=.*)(union|select|exec|eval|base64)' access.log
     ```
   - Detect directory traversal: `grep '\.\.\/' access.log`
   - Detect webshell access patterns: repeated POST requests to static file paths
   - Identify scanning activity: high request rate from single IP, 404 storms, UA strings matching known scanners
   - Flag HTTP 200 responses to paths that should not exist

7. **Syslog and journal correlation**:
   - Extract cron job execution events around suspicious times
   - Find process start events correlating with authentication events
   - Kernel OOM kills, segfaults, or coredumps near the incident window
   - Network interface up/down events (potential persistence via network scripts)

8. **Application log review**:
   - Database logs: failed authentication, unusual query patterns, bulk SELECT/export activity
   - Mail server logs: outbound relay abuse, unusual recipient domains
   - VPN/remote access logs: off-hours connections, unusual source geographies
   - Custom application logs: error bursts, API authentication failures

9. **SSH key fingerprint and session duration analysis**:
   - Extract accepted public key fingerprints: `grep "Accepted publickey" /var/log/auth.log | awk '{print $NF}'`
   - Correlate session open/close events to compute session durations; flag sessions that never close (potential persistent shell)
   - Distinguish opportunistic scanning (broad invalid-user lists) from targeted attacks (specific, plausible usernames) using invalid user enumeration counts

10. **PAM tampering detection**:
    - Compare installed `/etc/pam.d/` files against package manager originals using `debsums` (Debian) or `rpm -V pam` (RHEL); modifications are a persistence indicator
    - Identify `pam_exec` entries or module paths outside `/lib/security/` or `/lib64/security/`
    - List PAM `.so` files not owned by any package to surface injected modules

11. **Btmp and lastb failed login analysis**:
    - Parse the binary failed-login log with `lastb` to enumerate IPs and accounts targeted
    - Cross-reference failed-login IPs against successful-login IPs using `comm -12` to identify IPs that eventually succeeded — the strongest brute force confirmation pattern

12. **Windows Event Log correlation**:
    - Parse Event ID 4624 (successful logon) `LogonType` values: Type 3 (network) and Type 10 (RDP) from unexpected sources indicate lateral movement
    - Aggregate Event ID 4625 (failed logon) by `TargetUserName` and `IpAddress`; distinguish `SubStatus 0xC000006A` (wrong password) from `0xC0000064` (non-existent account)
    - Flag Event ID 4648 (explicit credentials) chains across multiple hosts as pass-the-hash or credential relay indicators
    - Extract and base64-decode PowerShell Event ID 4103 (module logging) and 4104 (script block logging) entries; flag encoded blocks that spawn network connections or write to temp paths

13. **Cloud log parsing**:
    - AWS CloudTrail: extract `eventName`, `sourceIPAddress`, and `userIdentity`; flag `DeleteTrail`, `StopLogging`, and `AssumeRole` with unusual session names
    - Azure Activity Log: extract `operationName`, `caller`, and `correlationId`; flag `Microsoft.Authorization/roleAssignments/write` and bulk permission changes
    - GCP Audit Log: extract `methodName`, `principalEmail`, and `resourceName`; flag `SetIamPolicy`, `CreateServiceAccount`, and `CreateServiceAccountKey` events

14. **Timeline construction**:
   - Merge events from all sources into a unified chronological timeline
   - Normalize timestamps to UTC
   - Annotate events with severity: INFO, SUSPICIOUS, MALICIOUS
   - Group events into phases: Reconnaissance, Initial Access, Execution, Persistence, Privilege Escalation, Lateral Movement, Exfiltration

15. **Write findings document**:
    - Save to `.aiwg/forensics/findings/<hostname>-log-analysis.md`
    - Include: source inventory, attack timeline, IOCs extracted (IPs, usernames, paths), pattern summary

## Usage Examples

### Example 1 — Full log analysis on local system
```
analyze logs
```

### Example 2 — Auth log focus
```
auth log analysis /var/log/auth.log
```

### Example 3 — Specify time window
```
log forensics --from "2026-02-01 00:00:00" --to "2026-02-15 23:59:59"
```

## Output Locations

- Findings: `.aiwg/forensics/findings/<hostname>-log-analysis.md`
- Unified timeline: `.aiwg/forensics/timelines/<hostname>-log-timeline.md`
- IOC list: `.aiwg/forensics/iocs/<hostname>-log-iocs.txt`

## Configuration

```yaml
log_analysis:
  brute_force_threshold: 10
  brute_force_window_minutes: 5
  spray_threshold_users: 5
  web_log_paths:
    - /var/log/nginx/access.log
    - /var/log/apache2/access.log
    - /var/log/httpd/access_log
  timeline_timezone: UTC
  severity_levels:
    - INFO
    - SUSPICIOUS
    - MALICIOUS
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Discover available log sources before analysis; absence of logs is itself evidence to document
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — Analyze log copies only; do not modify original log files
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/red-flag-escalation.md — Escalate immediately when log analysis reveals active attacker presence or data exfiltration
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/evidence-preservation/SKILL.md — Logs must be preserved and hashed before analysis begins
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/sigma-hunting/SKILL.md — Sigma hunting applies detection rules on top of the log sources analyzed here
