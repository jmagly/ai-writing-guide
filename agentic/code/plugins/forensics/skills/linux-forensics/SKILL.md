---
namespace: aiwg
name: linux-forensics
description: "Generalized Linux incident response and forensic analysis covering Debian/Ubuntu, RHEL/CentOS/Rocky, and SUSE families"
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# linux-forensics

Performs structured forensic analysis on Linux systems, adapting collection and verification procedures to the detected distribution family. Covers Debian/Ubuntu (apt/debsums), RHEL/CentOS/Rocky (rpm), and SUSE (zypper/rpm). Produces a findings document aligned with NIST SP 800-86 collection ordering.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "ir" / "incident response" for Linux → generalized Linux forensics
- "DFIR" → Digital Forensics and Incident Response
- "triage [host]" → host-level forensic triage

## Purpose

Linux distributions differ in package managers, log file paths, service managers, and integrity verification tools. A forensic workflow that hardcodes Debian paths will miss evidence on RHEL systems and vice versa. This skill detects the distribution family at runtime and selects appropriate tooling, producing consistent output regardless of target distro.

## Behavior

When triggered, this skill:

1. **Detect distribution family**:
   - Read `/etc/os-release` — check `ID_LIKE` and `ID` fields
   - Classify as: `debian` (Debian, Ubuntu, Mint), `rhel` (RHEL, CentOS, Rocky, AlmaLinux, Fedora), `suse` (openSUSE, SLES)
   - Fall back to generic Linux procedures if family is unknown

2. **Verify package integrity**:
   - Debian family: `debsums -c 2>/dev/null | grep -v OK` — lists files failing checksum
   - RHEL family: `rpm -Va 2>/dev/null | grep -v '^......G'` — lists changed attributes
   - SUSE family: `rpm -Va 2>/dev/null` (same as RHEL; rpm is the package tool)
   - Flag any modified files in system binary directories (`/bin`, `/sbin`, `/usr/bin`, `/usr/sbin`, `/lib`)

3. **Collect authentication and authorization evidence**:
   - Debian: `/var/log/auth.log`, `/var/log/auth.log.1`
   - RHEL/SUSE: `/var/log/secure`, `/var/log/secure-*`
   - All families: `journalctl -u sshd --no-pager -n 5000`
   - Parse for: failed logins, sudo usage, su activity, PAM events, cron authentication

4. **Audit scheduled tasks**:
   - System cron: `/etc/crontab`, `/etc/cron.d/`, `/etc/cron.{hourly,daily,weekly,monthly}/`
   - User cron tables: `for u in $(cut -d: -f1 /etc/passwd); do crontab -l -u $u 2>/dev/null; done`
   - Systemd timers: `systemctl list-timers --all`
   - At jobs: `atq 2>/dev/null`

5. **Review persistence mechanisms**:
   - Init scripts: `/etc/init.d/` (SysV), `/etc/rc.local`
   - Systemd units added by non-package managers: compare unit file mtimes against package database
   - PAM modules: `/etc/pam.d/` — check for unexpected `pam_exec.so` or `pam_python.so` entries
   - LD_PRELOAD abuse: `/etc/ld.so.preload`, per-user `.bashrc`/`.profile` exports

6. **Examine recently modified files**:
   - `find /etc /usr /bin /sbin /tmp /var/tmp -newer /proc/1 -not -path '/proc/*' -not -path '/sys/*' -ls 2>/dev/null`
   - `find /home /root -name '.*' -newer /proc/1 -ls 2>/dev/null` — hidden files in home dirs
   - Flag SUID/SGID binaries not owned by root: `find / -perm /6000 -not -user root 2>/dev/null`

7. **Inspect network state and processes**:
   - Listening services: `ss -tlnp`
   - Established connections with process ownership: `ss -tnp state established`
   - Open files per process: `lsof -nP -i 2>/dev/null | grep ESTABLISHED`
   - Processes without a backing file on disk: `ls -la /proc/*/exe 2>/dev/null | grep '(deleted)'`

8. **Collect kernel and module state**:
   - Loaded modules: `lsmod`
   - Kernel parameters relevant to security: `sysctl -a 2>/dev/null | grep -E 'kptr_restrict|dmesg_restrict|yama|randomize'`
   - Check for unsigned or out-of-tree modules

9. **Write findings document**:
   - Save to `.aiwg/forensics/findings/<hostname>-linux.md`
   - Tag each finding with severity: INFO, SUSPICIOUS, MALICIOUS

## Usage Examples

### Example 1 — Remote investigation
```
linux forensics user@prod-api-01.example.com
```

### Example 2 — Local system
```
investigate linux server localhost
```

### Example 3 — RHEL target with elevated access
```
linux incident response root@192.0.2.100
```

## Output Locations

- Findings: `.aiwg/forensics/findings/<hostname>-linux.md`
- Package integrity report: `.aiwg/forensics/evidence/<hostname>-pkg-integrity.txt`
- Raw collection: `.aiwg/forensics/evidence/<hostname>-linux-raw.txt`

## Configuration

```yaml
linux_forensics:
  find_depth: 5
  log_lines: 5000
  flag_suid_non_root: true
  distro_families:
    debian:
      auth_log: /var/log/auth.log
      pkg_verify: debsums -c
    rhel:
      auth_log: /var/log/secure
      pkg_verify: "rpm -Va"
    suse:
      auth_log: /var/log/messages
      pkg_verify: "rpm -Va"
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Detect distribution family before selecting tooling; read /etc/os-release first
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/non-destructive.md — Never modify target system state; use read-only commands and copy-on-collect procedures
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/volatility-order.md — Collect volatile process and network state before disk artifacts
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/red-flag-escalation.md — Escalate immediately when active malicious processes, rootkit indicators, or live attacker sessions are found
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/evidence-preservation/SKILL.md — Preserve and hash collected log files before analysis
